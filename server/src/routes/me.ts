import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { one, query, tx } from '../db/pool.js';
import { ah, badRequest, forbidden, notFound } from '../lib/errors.js';
import { entitlementsFor } from '../plans.js';
import { getUser, privateProfile } from '../services/users.js';
import { SUPPORTED_LOCALES } from '../locales.js';
import { MAX_PROMPTS, PROMPT_IDS } from '../prompts.js';

export const meRouter = Router();
export const MAX_PHOTOS = 9;

fs.mkdirSync(config.uploadDir, { recursive: true });

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + IMAGE_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in IMAGE_TYPES),
});

/** Checks magic bytes so a renamed non-image can't be served from our domain. */
function looksLikeImage(file: string): boolean {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return jpg || png || webp;
}

meRouter.get('/', ah(async (req, res) => {
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

const tags = z.array(z.string().trim().min(1).max(30)).max(10);

const profileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  bio: z.string().max(500),
  jobTitle: z.string().trim().max(60),
  company: z.string().trim().max(60),
  school: z.string().trim().max(80),
  city: z.string().trim().max(60),
  heightCm: z.number().int().min(100).max(250).nullable(),
  lookingFor: z.enum(['long_term', 'short_term', 'friendship', 'casual', 'unsure']),
  interests: tags,
  languages: tags,
  gender: z.enum(['man', 'woman', 'nonbinary']),
  interestedIn: z.array(z.enum(['man', 'woman', 'nonbinary'])).min(1).max(3),
  locale: z.enum(SUPPORTED_LOCALES),
  prompts: z.array(z.object({ id: z.enum(PROMPT_IDS), answer: z.string().trim().min(1).max(160) }))
    .max(MAX_PROMPTS)
    .refine((list) => new Set(list.map((p) => p.id)).size === list.length, { message: 'duplicate prompt' }),
}).partial();

const columns: Record<string, string> = {
  name: 'name', bio: 'bio', jobTitle: 'job_title', company: 'company', school: 'school', city: 'city',
  heightCm: 'height_cm', lookingFor: 'looking_for', interests: 'interests', languages: 'languages',
  gender: 'gender', interestedIn: 'interested_in', locale: 'locale', prompts: 'prompts',
  maxDistanceKm: 'max_distance_km', ageMin: 'age_min', ageMax: 'age_max', globalMode: 'global_mode',
  hideAge: 'hide_age', hideDistance: 'hide_distance', incognito: 'incognito',
};

async function updateColumns(userId: string, values: Record<string, unknown>) {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  const sets = entries.map(([k], i) => `${columns[k]} = $${i + 2}`);
  const params = entries.map(([k, v]) => (k === 'prompts' ? JSON.stringify(v) : v));
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, [userId, ...params]);
}

meRouter.patch('/', ah(async (req, res) => {
  const body = profileSchema.parse(req.body);
  if (body.interests) body.interests = [...new Set(body.interests)];
  if (body.languages) body.languages = [...new Set(body.languages)];
  await updateColumns(req.userId!, body);
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

const settingsSchema = z.object({
  maxDistanceKm: z.number().int().min(1).max(500),
  ageMin: z.number().int().min(18).max(99),
  ageMax: z.number().int().min(18).max(120),
  globalMode: z.boolean(),
  hideAge: z.boolean(),
  hideDistance: z.boolean(),
  incognito: z.boolean(),
}).partial();

meRouter.patch('/settings', ah(async (req, res) => {
  const body = settingsSchema.parse(req.body);
  const user = (await getUser(req.userId!))!;
  const ent = entitlementsFor(user);
  if ((body.hideAge || body.hideDistance) && !ent.hideAgeDistance) throw forbidden('premium_required');
  if (body.incognito && !ent.incognito) throw forbidden('premium_required');
  const ageMin = body.ageMin ?? user.age_min;
  const ageMax = body.ageMax ?? user.age_max;
  if (ageMin > ageMax) throw badRequest('invalid_age_range');
  await updateColumns(req.userId!, body);
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

const coords = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

meRouter.put('/location', ah(async (req, res) => {
  const { lat, lng } = coords.parse(req.body);
  await query('UPDATE users SET lat = $2, lng = $3 WHERE id = $1', [req.userId, lat, lng]);
  res.status(204).end();
}));

meRouter.put('/passport', ah(async (req, res) => {
  const user = (await getUser(req.userId!))!;
  if (!entitlementsFor(user).passport) throw forbidden('premium_required');
  const body = coords.nullable().parse(req.body?.location ?? null);
  await query('UPDATE users SET passport_lat = $2, passport_lng = $3 WHERE id = $1', [
    req.userId, body?.lat ?? null, body?.lng ?? null,
  ]);
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

meRouter.post('/photos', upload.single('photo'), ah(async (req, res) => {
  const file = req.file;
  if (!file) throw badRequest('invalid_image');
  if (!looksLikeImage(file.path)) {
    fs.rmSync(file.path, { force: true });
    throw badRequest('invalid_image');
  }
  try {
    const photo = await tx(async (c) => {
      await c.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.userId]);
      const count = (await c.query('SELECT count(*)::int AS n FROM photos WHERE user_id = $1', [req.userId])).rows[0].n;
      if (count >= MAX_PHOTOS) throw badRequest('too_many_photos');
      const url = `${config.publicUrl}/uploads/${path.basename(file.path)}`;
      return (await c.query(
        'INSERT INTO photos (user_id, url, position) VALUES ($1, $2, $3) RETURNING id, url, position',
        [req.userId, url, count],
      )).rows[0];
    });
    res.status(201).json(photo);
  } catch (err) {
    fs.rmSync(file.path, { force: true });
    throw err;
  }
}));

meRouter.put('/photos/order', ah(async (req, res) => {
  const { ids } = z.object({ ids: z.array(z.string().uuid()).max(MAX_PHOTOS) }).parse(req.body);
  await tx(async (c) => {
    const owned = (await c.query('SELECT id FROM photos WHERE user_id = $1', [req.userId])).rows.map((r) => r.id);
    if (owned.length !== ids.length || !ids.every((id) => owned.includes(id))) throw badRequest('invalid_photo_order');
    for (let i = 0; i < ids.length; i++) {
      await c.query('UPDATE photos SET position = $2 WHERE id = $1', [ids[i], i]);
    }
  });
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

meRouter.delete('/photos/:id', ah(async (req, res) => {
  const photo = await one<{ url: string }>('DELETE FROM photos WHERE id = $1 AND user_id = $2 RETURNING url', [
    req.params.id, req.userId,
  ]);
  if (!photo) throw notFound();
  const local = photo.url.startsWith(`${config.publicUrl}/uploads/`);
  if (local) fs.rmSync(path.join(config.uploadDir, path.basename(photo.url)), { force: true });
  await query(
    `UPDATE photos p SET position = o.rn - 1 FROM (
       SELECT id, row_number() OVER (ORDER BY position, created_at) AS rn FROM photos WHERE user_id = $1) o
     WHERE p.id = o.id`,
    [req.userId],
  );
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

/** Account deletion (required by Apple & Google): anonymises the user and removes their content. */
meRouter.delete('/', ah(async (req, res) => {
  const photos = await tx(async (c) => {
    const rows = (await c.query('DELETE FROM photos WHERE user_id = $1 RETURNING url', [req.userId])).rows;
    await c.query('UPDATE matches SET unmatched_at = now() WHERE (user_a = $1 OR user_b = $1) AND unmatched_at IS NULL', [req.userId]);
    await c.query('DELETE FROM swipes WHERE swiper_id = $1 OR target_id = $1', [req.userId]);
    await c.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [req.userId]);
    await c.query(
      `UPDATE users SET deleted_at = now(), email = 'deleted+' || id || '@invalid', name = 'Deleted',
         bio = '', job_title = '', company = '', school = '', city = '', interests = '{}', languages = '{}', prompts = '[]',
         lat = NULL, lng = NULL, passport_lat = NULL, passport_lng = NULL, password_hash = ''
       WHERE id = $1`,
      [req.userId],
    );
    return rows as { url: string }[];
  });
  for (const p of photos) {
    if (p.url.startsWith(`${config.publicUrl}/uploads/`)) {
      fs.rmSync(path.join(config.uploadDir, path.basename(p.url)), { force: true });
    }
  }
  res.status(204).end();
}));
