import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db/pool.js';
import { ah, badRequest, notFound } from '../lib/errors.js';
import { emitToUser } from '../realtime.js';
import { canView, getUser, photosFor, publicProfile } from '../services/users.js';
import { reportLimiter } from '../lib/limits.js';
import { REPORT_REASONS } from '../moderation.js';

export const usersRouter = Router();

const uuid = z.string().uuid();

usersRouter.get('/:id', ah(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const user = await getUser(id);
  if (!user || !(await canView(req.userId!, user))) throw notFound('user_not_found');
  const me = await getUser(req.userId!);
  const photos = await photosFor([id]);
  res.json(publicProfile(user, photos.get(id) ?? [], me));
}));

usersRouter.post('/:id/block', ah(async (req, res) => {
  const id = uuid.parse(req.params.id);
  if (id === req.userId) throw badRequest('cannot_block_self');
  if (!(await getUser(id))) throw notFound('user_not_found');
  await query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.userId, id]);
  const [a, b] = [req.userId!, id].sort();
  const match = await one<{ id: string }>(
    'UPDATE matches SET unmatched_at = now() WHERE user_a = $1 AND user_b = $2 AND unmatched_at IS NULL RETURNING id',
    [a, b],
  );
  if (match) emitToUser(id, 'match:removed', { matchId: match.id });
  res.status(204).end();
}));

usersRouter.post('/:id/report', reportLimiter, ah(async (req, res) => {
  const id = uuid.parse(req.params.id);
  const body = z.object({
    reason: z.enum(REPORT_REASONS),
    details: z.string().max(1000).default(''),
  }).parse(req.body);
  if (id === req.userId) throw badRequest('cannot_report_self');
  if (!(await getUser(id))) throw notFound('user_not_found');
  await query('INSERT INTO reports (reporter_id, reported_id, reason, details) VALUES ($1, $2, $3, $4)', [
    req.userId, id, body.reason, body.details,
  ]);
  // Reporting also blocks, so the reporter never sees this person again.
  await query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.userId, id]);
  const [a, b] = [req.userId!, id].sort();
  await query('UPDATE matches SET unmatched_at = now() WHERE user_a = $1 AND user_b = $2 AND unmatched_at IS NULL', [a, b]);
  res.status(201).json({ ok: true });
}));
