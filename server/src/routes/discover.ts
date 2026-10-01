import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../db/pool.js';
import { ah, badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { entitlementsFor } from '../plans.js';
import { emitToUser } from '../realtime.js';
import { getUser, photosFor, privateProfile, publicProfile, viewerLocation, type UserRow } from '../services/users.js';
import { matchSummary } from '../services/matches.js';
import { swipeLimiter } from '../lib/limits.js';

export const discoverRouter = Router();

const ACTIVE_PREMIUM = (alias: string, plans: string) =>
  `(${alias}.plan IN (${plans}) AND (${alias}.plan_expires_at IS NULL OR ${alias}.plan_expires_at > now()))`;

const DISTANCE_SQL = `(6371 * 2 * asin(sqrt(
  power(sin(radians(u.lat - $2) / 2), 2) +
  cos(radians($2)) * cos(radians(u.lat)) * power(sin(radians(u.lng - $3) / 2), 2))))`;

/**
 * Profiles `me` may see: mutual gender/age preferences, not swiped, not blocked, with a photo, within distance,
 * respecting incognito, plus the viewer's advanced filters when their plan includes them.
 */
// Inside a distance limit: a plain bounding box first (no OR, so Postgres can use the (lat, lng) index),
// then the exact great-circle test. Global mode and members without a location skip it entirely
// (the no-op clause only keeps $2/$3 typed so the parameter list stays the same).
const GEO_BOUNDED = `AND u.lat BETWEEN $6::float8 AND $7::float8
       AND ($8::float8 IS NULL OR u.lng BETWEEN $8::float8 AND $9::float8)
       AND ${DISTANCE_SQL} <= me.max_distance_km`;

function candidatesSql(orderBy: string, limit: number, geo: boolean) {
  return `SELECT u.*,
       EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = u.id AND s.target_id = $1 AND s.action = 'superlike') AS superliked_me,
       (SELECT s.note FROM swipes s WHERE s.swiper_id = u.id AND s.target_id = $1 AND s.action = 'superlike') AS note
     FROM users u, users me
     WHERE me.id = $1 AND u.id <> me.id
       AND u.deleted_at IS NULL AND NOT u.is_banned AND u.discoverable
       AND u.gender = ANY(me.interested_in) AND me.gender = ANY(u.interested_in)
       AND date_part('year', age(u.birthdate)) BETWEEN me.age_min AND me.age_max
       AND date_part('year', age(me.birthdate)) BETWEEN u.age_min AND u.age_max
       AND NOT (u.id = ANY($4::uuid[]))
       AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = me.id AND s.target_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = me.id AND b.blocked_id = u.id)
                                               OR (b.blocker_id = u.id AND b.blocked_id = me.id))
       AND EXISTS (SELECT 1 FROM photos p WHERE p.user_id = u.id)
       AND (NOT (u.incognito AND ${ACTIVE_PREMIUM('u', `'platinum'`)})
            OR EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = u.id AND s.target_id = me.id AND s.action <> 'pass'))
       ${geo ? GEO_BOUNDED : 'AND ($2::float8 IS NULL OR $3::float8 IS NULL OR true)'}
       AND (NOT $5::bool OR (
             (NOT me.filter_verified OR u.is_verified)
         AND (NOT me.filter_has_prompts OR jsonb_array_length(u.prompts) > 0)
         AND (cardinality(me.filter_looking_for) = 0 OR u.looking_for = ANY(me.filter_looking_for))))
     ORDER BY ${orderBy}
     LIMIT ${limit}`;
}

/** Rectangle that contains every point within `km` of `loc`. Longitude is left unbounded near the poles or the date line. */
export function boundingBox(loc: { lat: number; lng: number } | null, km: number) {
  if (!loc) return { minLat: -90, maxLat: 90, minLng: null as number | null, maxLng: null as number | null };
  const dLat = km / 111;
  const dLng = km / (111 * Math.max(Math.cos((loc.lat * Math.PI) / 180), 0.01));
  const wraps = loc.lng - dLng < -180 || loc.lng + dLng > 180 || Math.abs(loc.lat) + dLat > 85;
  return {
    minLat: loc.lat - dLat, maxLat: loc.lat + dLat,
    minLng: wraps ? null : loc.lng - dLng, maxLng: wraps ? null : loc.lng + dLng,
  };
}

async function candidates(me: UserRow, orderBy: string, limit: number, exclude: string[] = []) {
  const loc = viewerLocation(me);
  const geo = !!loc && !me.global_mode;
  const base = [me.id, loc?.lat ?? null, loc?.lng ?? null, exclude, entitlementsFor(me).advancedFilters];
  const box = boundingBox(loc, me.max_distance_km);
  const rows = await query<UserRow & { superliked_me: boolean; note: string | null }>(
    candidatesSql(orderBy, limit, geo),
    geo ? [...base, box.minLat, box.maxLat, box.minLng, box.maxLng] : base,
  );
  const photos = await photosFor(rows.rows.map((r) => r.id));
  return rows.rows.map((u) => ({
    ...publicProfile(u, photos.get(u.id) ?? [], me),
    superLikedYou: u.superliked_me,
    note: u.note,
  }));
}

discoverRouter.get('/discover', ah(async (req, res) => {
  const me = (await getUser(req.userId!))!;
  const exclude = z.array(z.string().uuid()).max(100).parse(
    typeof req.query.exclude === 'string' && req.query.exclude ? req.query.exclude.split(',') : [],
  );
  const profiles = await candidates(me, `(u.boost_until IS NOT NULL AND u.boost_until > now()) DESC,
       (EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = u.id AND s.target_id = $1 AND s.action <> 'pass')
         AND ${ACTIVE_PREMIUM('u', `'platinum'`)}) DESC,
       u.last_active_at DESC`, 20, exclude);
  res.json({ profiles });
}));

/** Gold+: today's most compatible people. Stable for the whole day, refreshed at midnight UTC. */
discoverRouter.get('/top-picks', ah(async (req, res) => {
  const me = (await getUser(req.userId!))!;
  if (!entitlementsFor(me).topPicks) throw forbidden('premium_required');
  const profiles = await candidates(me, `(
       2 * cardinality(ARRAY(SELECT unnest(u.interests) INTERSECT SELECT unnest(me.interests)))
     + 2 * cardinality(ARRAY(SELECT unnest(u.languages) INTERSECT SELECT unnest(me.languages)))
     + CASE WHEN u.looking_for = me.looking_for AND u.looking_for <> 'unsure' THEN 3 ELSE 0 END
     + CASE WHEN u.is_verified THEN 2 ELSE 0 END
     + CASE WHEN jsonb_array_length(u.prompts) > 0 THEN 1 ELSE 0 END
     + CASE WHEN u.last_active_at > now() - interval '3 days' THEN 1 ELSE 0 END
     ) DESC, md5(u.id::text || me.id::text || current_date::text)`, 6);
  res.json({ profiles, refreshesAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString() });
}));

const swipeSchema = z.object({
  targetId: z.string().uuid(),
  action: z.enum(['like', 'pass', 'superlike']),
  note: z.string().trim().min(1).max(140).optional(),
});

discoverRouter.post('/swipes', swipeLimiter, ah(async (req, res) => {
  const body = swipeSchema.parse(req.body);
  const meId = req.userId!;
  if (body.targetId === meId) throw badRequest('cannot_swipe_self');
  if (body.note && body.action !== 'superlike') throw badRequest('note_requires_superlike');

  const result = await tx(async (c) => {
    // Lock both members in a fixed order. Two people liking each other at the same instant are then
    // serialised, so the second transaction always sees the first like and exactly one match is made.
    const locked = (await c.query<UserRow>(
      'SELECT * FROM users WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
      [[meId, body.targetId]],
    )).rows;
    const me = locked.find((u) => u.id === meId)!;
    const target = locked.find((u) => u.id === body.targetId && !u.deleted_at && !u.is_banned);
    const ent = entitlementsFor(me);
    if (body.note && !ent.noteWithSuperLike) throw forbidden('premium_required');
    if (!target) throw notFound('user_not_found');
    const blocked = (await c.query(
      `SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [meId, body.targetId],
    )).rows[0];
    if (blocked) throw notFound('user_not_found');

    const used = (await c.query(
      `SELECT count(*) FILTER (WHERE action = 'like')::int AS likes, count(*) FILTER (WHERE action = 'superlike')::int AS supers
       FROM swipes WHERE swiper_id = $1 AND created_at > now() - interval '24 hours'`,
      [meId],
    )).rows[0];
    if (body.action === 'like' && ent.dailyLikes != null && used.likes >= ent.dailyLikes) {
      throw forbidden('out_of_likes');
    }
    if (body.action === 'superlike' && used.supers >= ent.dailySuperLikes) {
      if (me.superlike_credits <= 0) throw forbidden('out_of_superlikes');
      await c.query('UPDATE users SET superlike_credits = superlike_credits - 1 WHERE id = $1', [meId]);
    }

    const inserted = await c.query(
      `INSERT INTO swipes (swiper_id, target_id, action, note) VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING RETURNING created_at`,
      [meId, body.targetId, body.action, body.note ?? null],
    );
    if (!inserted.rowCount) throw conflict('already_swiped');

    if (body.action === 'pass') return { matchId: null as string | null };
    const reciprocal = (await c.query(
      `SELECT 1 FROM swipes WHERE swiper_id = $1 AND target_id = $2 AND action IN ('like','superlike')`,
      [body.targetId, meId],
    )).rows[0];
    if (!reciprocal) return { matchId: null };
    const [a, b] = [meId, body.targetId].sort();
    const match = await c.query(
      `INSERT INTO matches (user_a, user_b) VALUES ($1, $2) ON CONFLICT (user_a, user_b) DO NOTHING RETURNING id`,
      [a, b],
    );
    return { matchId: (match.rows[0]?.id as string | undefined) ?? null };
  });

  if (!result.matchId) {
    if (body.action !== 'pass') emitToUser(body.targetId, 'like:new', { superlike: body.action === 'superlike' });
    return res.json({ matched: false, match: null });
  }
  const mine = await matchSummary(result.matchId, meId);
  const theirs = await matchSummary(result.matchId, body.targetId);
  emitToUser(body.targetId, 'match:new', theirs);
  res.json({ matched: true, match: mine });
}));

discoverRouter.post('/swipes/rewind', ah(async (req, res) => {
  const me = (await getUser(req.userId!))!;
  if (!entitlementsFor(me).rewind) throw forbidden('premium_required');
  const last = await one<{ target_id: string }>(
    `SELECT target_id FROM swipes s WHERE swiper_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [me.id],
  );
  if (!last) throw notFound('nothing_to_rewind');
  const [a, b] = [me.id, last.target_id].sort();
  if (await one('SELECT 1 FROM matches WHERE user_a = $1 AND user_b = $2', [a, b])) throw conflict('cannot_rewind_match');
  await query('DELETE FROM swipes WHERE swiper_id = $1 AND target_id = $2', [me.id, last.target_id]);
  const target = await getUser(last.target_id);
  if (!target) return res.json({ profile: null });
  const photos = await photosFor([target.id]);
  res.json({ profile: publicProfile(target, photos.get(target.id) ?? [], me) });
}));

discoverRouter.get('/likes/received', ah(async (req, res) => {
  const me = (await getUser(req.userId!))!;
  const rows = await query<UserRow & { action: string; note: string | null; liked_at: Date }>(
    `SELECT u.*, s.action, s.note, s.created_at AS liked_at FROM swipes s JOIN users u ON u.id = s.swiper_id
     WHERE s.target_id = $1 AND s.action IN ('like','superlike')
       AND u.deleted_at IS NULL AND NOT u.is_banned
       AND NOT EXISTS (SELECT 1 FROM swipes m WHERE m.swiper_id = $1 AND m.target_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id)
                                               OR (b.blocker_id = u.id AND b.blocked_id = $1))
     ORDER BY (s.action = 'superlike') DESC, s.created_at DESC
     LIMIT 100`,
    [me.id],
  );
  if (!entitlementsFor(me).seeWhoLikesYou) {
    return res.json({ locked: true, count: rows.rowCount, profiles: [] });
  }
  const photos = await photosFor(rows.rows.map((r) => r.id));
  res.json({
    locked: false,
    count: rows.rowCount,
    profiles: rows.rows.map((u) => ({
      ...publicProfile(u, photos.get(u.id) ?? [], me),
      superLikedYou: u.action === 'superlike',
      note: u.note,
      likedAt: u.liked_at,
    })),
  });
}));

discoverRouter.get('/likes/sent', ah(async (req, res) => {
  const me = (await getUser(req.userId!))!;
  if (!entitlementsFor(me).seeLikesSent) throw forbidden('premium_required');
  const rows = await query<UserRow & { action: string }>(
    `SELECT u.*, s.action FROM swipes s JOIN users u ON u.id = s.target_id
     WHERE s.swiper_id = $1 AND s.action IN ('like','superlike') AND u.deleted_at IS NULL AND NOT u.is_banned
       AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user_a = LEAST($1::uuid, u.id) AND m.user_b = GREATEST($1::uuid, u.id))
     ORDER BY s.created_at DESC LIMIT 100`,
    [me.id],
  );
  const photos = await photosFor(rows.rows.map((r) => r.id));
  res.json({
    profiles: rows.rows.map((u) => ({ ...publicProfile(u, photos.get(u.id) ?? [], me), superLiked: u.action === 'superlike' })),
  });
}));

discoverRouter.post('/boost', ah(async (req, res) => {
  const updated = await one(
    `UPDATE users SET boost_credits = boost_credits - 1, boost_until = now() + interval '30 minutes'
     WHERE id = $1 AND boost_credits > 0 AND (boost_until IS NULL OR boost_until < now())
     RETURNING id`,
    [req.userId],
  );
  if (!updated) {
    const me = (await getUser(req.userId!))!;
    if (me.boost_until && new Date(me.boost_until).getTime() > Date.now()) throw conflict('boost_active');
    throw forbidden('out_of_boosts');
  }
  res.json(await privateProfile((await getUser(req.userId!))!));
}));
