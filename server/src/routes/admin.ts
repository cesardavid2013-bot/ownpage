import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { one, query, tx } from '../db/pool.js';
import { ah, notFound, unauthorized } from '../lib/errors.js';
import { emitToUser } from '../realtime.js';
import { PRIVATE_DIR } from './me.js';

/** Moderation API: verification reviews and report handling. Authenticated with ADMIN_TOKEN. */
export const adminRouter = Router();

// Header only: a token in a URL ends up in proxy logs and browser history.
function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const expected = config.adminToken;
  const got = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const ok = expected.length >= 16 && got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  next(ok ? undefined : unauthorized());
}
adminRouter.use(requireAdmin);

const uuid = z.string().uuid();

type Db = { query: (text: string, params: unknown[]) => Promise<unknown> };
/** Every moderator decision is written to an append-only log. */
function logAction(db: Db, req: Request, action: string, refs: { user?: string; report?: string; verification?: string; note?: string }) {
  return db.query(
    `INSERT INTO moderation_actions (action, target_user_id, report_id, verification_id, note, ip) VALUES ($1, $2, $3, $4, $5, $6)`,
    [action, refs.user ?? null, refs.report ?? null, refs.verification ?? null, refs.note ?? null, req.ip ?? null],
  );
}

adminRouter.get('/stats', ah(async (_req, res) => {
  const row = await one(`SELECT
    (SELECT count(*) FROM users WHERE deleted_at IS NULL) AS members,
    (SELECT count(*) FROM users WHERE deleted_at IS NULL AND plan <> 'free' AND (plan_expires_at IS NULL OR plan_expires_at > now())) AS paying,
    (SELECT count(*) FROM matches WHERE created_at > now() - interval '24 hours') AS matches_24h,
    (SELECT count(*) FROM verification_requests WHERE status = 'pending') AS pending_verifications,
    (SELECT count(*) FROM reports WHERE status = 'open') AS open_reports`);
  res.json(row);
}));

adminRouter.get('/verifications', ah(async (_req, res) => {
  const rows = await query(
    `SELECT v.id, v.pose, v.created_at, u.id AS user_id, u.name, u.birthdate,
       (SELECT array_agg(url ORDER BY position) FROM photos p WHERE p.user_id = u.id) AS photos
     FROM verification_requests v JOIN users u ON u.id = v.user_id
     WHERE v.status = 'pending' AND u.deleted_at IS NULL ORDER BY v.created_at LIMIT 50`,
  );
  res.json({ items: rows.rows });
}));

adminRouter.get('/verifications/:id/selfie', ah(async (req, res) => {
  const v = await one<{ photo_file: string }>('SELECT photo_file FROM verification_requests WHERE id = $1', [uuid.parse(req.params.id)]);
  if (!v) throw notFound();
  const file = path.join(PRIVATE_DIR, path.basename(v.photo_file));
  if (!fs.existsSync(file)) throw notFound();
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(path.resolve(file));
}));

adminRouter.post('/verifications/:id', ah(async (req, res) => {
  const body = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().max(200).optional() }).parse(req.body);
  const v = await tx(async (c) => {
    const row = (await c.query(
      `UPDATE verification_requests SET status = $2, reason = $3, reviewed_at = now()
       WHERE id = $1 AND status = 'pending' RETURNING user_id`,
      [uuid.parse(req.params.id), body.decision === 'approve' ? 'approved' : 'rejected', body.reason ?? null],
    )).rows[0];
    if (!row) throw notFound();
    if (body.decision === 'approve') await c.query('UPDATE users SET is_verified = true WHERE id = $1', [row.user_id]);
    await logAction(c, req, `verification_${body.decision}`, { user: row.user_id, verification: String(req.params.id), note: body.reason });
    return row as { user_id: string };
  });
  emitToUser(v.user_id, 'verification:updated', { status: body.decision === 'approve' ? 'approved' : 'rejected' });
  res.json({ ok: true });
}));

adminRouter.post('/users/:id/unban', ah(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const row = await one('UPDATE users SET is_banned = false WHERE id = $1 AND is_banned RETURNING id', [id]);
  if (!row) throw notFound();
  await logAction({ query }, req, 'unban', { user: id });
  res.json({ ok: true });
}));

adminRouter.get('/actions', ah(async (_req, res) => {
  const rows = await query(
    `SELECT a.id, a.action, a.note, a.created_at, a.target_user_id, u.name AS target_name, u.is_banned
     FROM moderation_actions a LEFT JOIN users u ON u.id = a.target_user_id
     ORDER BY a.created_at DESC LIMIT 100`,
  );
  res.json({ items: rows.rows });
}));

adminRouter.get('/reports', ah(async (_req, res) => {
  const rows = await query(
    `SELECT r.id, r.reason, r.details, r.created_at,
       u.id AS reported_id, u.name AS reported_name, u.is_banned, u.bio AS reported_bio,
       (SELECT array_agg(url ORDER BY position) FROM photos p WHERE p.user_id = u.id) AS reported_photos,
       (SELECT count(*) FROM reports x WHERE x.reported_id = u.id) AS total_reports,
       ru.name AS reporter_name
     FROM reports r JOIN users u ON u.id = r.reported_id JOIN users ru ON ru.id = r.reporter_id
     WHERE r.status = 'open' ORDER BY total_reports DESC, r.created_at LIMIT 50`,
  );
  res.json({ items: rows.rows });
}));

adminRouter.post('/reports/:id', ah(async (req, res) => {
  const { action } = z.object({ action: z.enum(['dismiss', 'ban']) }).parse(req.body);
  await tx(async (c) => {
    const r = (await c.query(
      `UPDATE reports SET status = $2 WHERE id = $1 AND status = 'open' RETURNING reported_id`,
      [uuid.parse(req.params.id), action === 'ban' ? 'actioned' : 'reviewed'],
    )).rows[0];
    if (!r) throw notFound();
    await logAction(c, req, action === 'ban' ? 'ban' : 'report_dismissed', { user: r.reported_id, report: String(req.params.id) });
    if (action === 'ban') {
      await c.query('UPDATE users SET is_banned = true WHERE id = $1', [r.reported_id]);
      await c.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [r.reported_id]);
      await c.query(`UPDATE reports SET status = 'actioned' WHERE reported_id = $1 AND status = 'open'`, [r.reported_id]);
    }
  });
  res.json({ ok: true });
}));
