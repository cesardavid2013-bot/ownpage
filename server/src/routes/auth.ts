import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { one } from '../db/pool.js';
import { ah, badRequest, conflict, unauthorized } from '../lib/errors.js';
import { issueRefreshToken, revokeRefreshToken, rotateRefreshToken, signAccessToken } from '../lib/auth.js';
import { ageFrom, getUser, privateProfile } from '../services/users.js';
import { SUPPORTED_LOCALES } from '../locales.js';

export const authRouter = Router();

// Credential endpoints are strict (brute-force protection). Session refresh happens on every app
// launch and is shared by everyone behind the same IP (offices, campuses, mobile carriers), so it
// gets its own, much wider budget.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 10_000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.isTest ? 10_000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(40),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['man', 'woman', 'nonbinary']),
  interestedIn: z.array(z.enum(['man', 'woman', 'nonbinary'])).min(1).max(3),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
});

async function session(userId: string) {
  const user = await getUser(userId);
  return {
    accessToken: signAccessToken(userId),
    refreshToken: await issueRefreshToken(userId),
    user: await privateProfile(user!),
  };
}

authRouter.post('/register', limiter, ah(async (req, res) => {
  const body = registerSchema.parse(req.body);
  if (Number.isNaN(Date.parse(body.birthdate))) throw badRequest('invalid_birthdate');
  const age = ageFrom(body.birthdate);
  if (age < 18) throw badRequest('underage');
  if (age > 120) throw badRequest('invalid_birthdate');
  const exists = await one('SELECT 1 FROM users WHERE lower(email) = $1 AND deleted_at IS NULL', [body.email]);
  if (exists) throw conflict('email_taken');
  const passwordHash = await bcrypt.hash(body.password, config.isTest ? 4 : 11);
  const user = await one<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, birthdate, gender, interested_in, locale, age_min, age_max)
     VALUES ($1, $2, $3, $4, $5, $6, $7, GREATEST(18, $8 - 8), LEAST(99, $8 + 12)) RETURNING id`,
    [body.email, passwordHash, body.name, body.birthdate, body.gender, body.interestedIn, body.locale ?? 'en', age],
  );
  res.status(201).json(await session(user!.id));
}));

authRouter.post('/login', limiter, ah(async (req, res) => {
  const body = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).parse(req.body);
  const user = await one<{ id: string; password_hash: string; is_banned: boolean }>(
    'SELECT id, password_hash, is_banned FROM users WHERE lower(email) = $1 AND deleted_at IS NULL',
    [body.email],
  );
  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) throw unauthorized('invalid_credentials');
  if (user.is_banned) throw unauthorized('account_banned');
  res.json(await session(user.id));
}));

authRouter.post('/refresh', refreshLimiter, ah(async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) throw unauthorized('refresh_invalid');
  res.json({ accessToken: signAccessToken(rotated.userId), refreshToken: rotated.refreshToken });
}));

authRouter.post('/logout', ah(async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  await revokeRefreshToken(refreshToken);
  res.status(204).end();
}));
