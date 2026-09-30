import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db/pool.js';
import { ah, badRequest, notFound } from '../lib/errors.js';
import { emitToUser } from '../realtime.js';
import { activeMatchFor, listMatches, otherUserId } from '../services/matches.js';

export const matchesRouter = Router();

const uuid = z.string().uuid();

matchesRouter.get('/', ah(async (req, res) => {
  res.json({ matches: await listMatches(req.userId!) });
}));

matchesRouter.delete('/:id', ah(async (req, res) => {
  const match = await activeMatchFor(uuid.parse(req.params.id), req.userId!);
  if (!match) throw notFound('match_not_found');
  await query('UPDATE matches SET unmatched_at = now() WHERE id = $1', [match.id]);
  emitToUser(otherUserId(match, req.userId!), 'match:removed', { matchId: match.id });
  res.status(204).end();
}));

const toMessage = (m: any) => ({
  id: m.id, matchId: m.match_id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, readAt: m.read_at,
});

matchesRouter.get('/:id/messages', ah(async (req, res) => {
  const match = await activeMatchFor(uuid.parse(req.params.id), req.userId!);
  if (!match) throw notFound('match_not_found');
  const before = typeof req.query.before === 'string' ? new Date(req.query.before) : null;
  if (before && Number.isNaN(before.getTime())) throw badRequest('invalid_cursor');
  const rows = await query(
    `SELECT * FROM messages WHERE match_id = $1 AND ($2::timestamptz IS NULL OR created_at < $2)
     ORDER BY created_at DESC LIMIT 50`,
    [match.id, before],
  );
  res.json({ messages: rows.rows.map(toMessage).reverse(), hasMore: rows.rowCount === 50 });
}));

matchesRouter.post('/:id/messages', ah(async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
  const match = await activeMatchFor(uuid.parse(req.params.id), req.userId!);
  if (!match) throw notFound('match_not_found');
  const other = otherUserId(match, req.userId!);
  const blocked = await one(
    `SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
    [req.userId, other],
  );
  if (blocked) throw notFound('match_not_found');
  const msg = await one('INSERT INTO messages (match_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *', [
    match.id, req.userId, body,
  ]);
  await query('UPDATE matches SET last_message_at = $2 WHERE id = $1', [match.id, msg.created_at]);
  const payload = toMessage(msg);
  emitToUser(other, 'message:new', payload);
  emitToUser(req.userId!, 'message:new', payload);
  res.status(201).json(payload);
}));

matchesRouter.post('/:id/read', ah(async (req, res) => {
  const match = await activeMatchFor(uuid.parse(req.params.id), req.userId!);
  if (!match) throw notFound('match_not_found');
  const updated = await query(
    'UPDATE messages SET read_at = now() WHERE match_id = $1 AND sender_id <> $2 AND read_at IS NULL',
    [match.id, req.userId],
  );
  if (updated.rowCount) emitToUser(otherUserId(match, req.userId!), 'message:read', { matchId: match.id });
  res.status(204).end();
}));
