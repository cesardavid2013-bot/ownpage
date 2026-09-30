import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { one, query } from '../db/pool.js';
import { unauthorized } from './errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, typ: 'access' }, config.jwtSecret, { expiresIn: config.accessTokenTtl as any });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  if (payload.typ !== 'access' || typeof payload.sub !== 'string') throw new Error('bad token');
  return payload.sub;
}

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [userId, hash(token), String(config.refreshTokenDays)],
  );
  return token;
}

/** Rotates a refresh token: the old one is revoked and a new pair is returned. */
export async function rotateRefreshToken(token: string): Promise<{ userId: string; refreshToken: string } | null> {
  const row = await one<{ id: string; user_id: string }>(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
     RETURNING id, user_id`,
    [hash(token)],
  );
  if (!row) return null;
  const user = await one('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL AND NOT is_banned', [row.user_id]);
  if (!user) return null;
  return { userId: row.user_id, refreshToken: await issueRefreshToken(row.user_id) };
}

export async function revokeRefreshToken(token: string) {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [hash(token)]);
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();
    let userId: string;
    try {
      userId = verifyAccessToken(token);
    } catch {
      throw unauthorized('token_invalid');
    }
    const user = await one<{ is_banned: boolean }>(
      'UPDATE users SET last_active_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING is_banned',
      [userId],
    );
    if (!user) throw unauthorized('token_invalid');
    if (user.is_banned) throw unauthorized('account_banned');
    req.userId = userId;
    next();
  } catch (err) {
    next(err);
  }
}
