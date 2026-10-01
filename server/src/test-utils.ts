import request from 'supertest';
import sharp from 'sharp';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { pool, query } from './db/pool.js';

export const app = createApp();

export async function resetDb() {
  await migrate();
  await query('TRUNCATE users, refresh_tokens, photos, swipes, matches, messages, blocks, reports, payments, verification_requests, moderation_actions CASCADE');
}

export const closeDb = () => pool.end();

// A portrait-sized PNG; uploads below 200px are rejected as too small.
export const PNG = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#c9a46a' } }).png().toBuffer();

let n = 0;
export async function makeUser(opts: { gender?: string; interestedIn?: string[]; lat?: number; lng?: number; photo?: boolean } = {}) {
  n++;
  const res = await request(app).post('/auth/register').send({
    email: `user${n}_${Date.now()}@example.com`,
    password: 'password123',
    name: `User ${n}`,
    birthdate: '1995-06-15',
    gender: opts.gender ?? 'woman',
    interestedIn: opts.interestedIn ?? ['man', 'woman', 'nonbinary'],
  });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  const token = res.body.accessToken as string;
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).put('/me/location').set(auth).send({ lat: opts.lat ?? 40.4168, lng: opts.lng ?? -3.7038 });
  if (opts.photo !== false) {
    const up = await request(app).post('/me/photos').set(auth).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
    if (up.status !== 201) throw new Error(`upload failed: ${JSON.stringify(up.body)}`);
  }
  return { id: res.body.user.id as string, token, auth, refreshToken: res.body.refreshToken as string };
}
