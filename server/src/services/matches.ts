import { one, query } from '../db/pool.js';
import { getUser, photosFor, publicProfile, type UserRow } from './users.js';

export interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: Date;
  last_message_at: Date | null;
  unmatched_at: Date | null;
}

/** Returns the match if `userId` is a participant and it is still active. */
export async function activeMatchFor(matchId: string, userId: string): Promise<MatchRow | null> {
  return one<MatchRow>(
    `SELECT * FROM matches WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND unmatched_at IS NULL`,
    [matchId, userId],
  );
}

export const otherUserId = (m: MatchRow, me: string) => (m.user_a === me ? m.user_b : m.user_a);

export async function listMatches(userId: string) {
  const me = await getUser(userId);
  const rows = await query<MatchRow & { last_body: string | null; last_sender: string | null; last_at: Date | null; unread: number }>(
    `SELECT m.*, lm.body AS last_body, lm.sender_id AS last_sender, lm.created_at AS last_at,
       (SELECT count(*)::int FROM messages x WHERE x.match_id = m.id AND x.sender_id <> $1 AND x.read_at IS NULL) AS unread
     FROM matches m
     LEFT JOIN LATERAL (SELECT body, sender_id, created_at FROM messages WHERE match_id = m.id
                        ORDER BY created_at DESC LIMIT 1) lm ON true
     WHERE (m.user_a = $1 OR m.user_b = $1) AND m.unmatched_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = m.user_a AND b.blocked_id = m.user_b)
                                               OR (b.blocker_id = m.user_b AND b.blocked_id = m.user_a))
     ORDER BY COALESCE(m.last_message_at, m.created_at) DESC`,
    [userId],
  );
  const otherIds = rows.rows.map((m) => otherUserId(m, userId));
  const users = await query<UserRow>('SELECT * FROM users WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL', [otherIds]);
  const byId = new Map(users.rows.map((u) => [u.id, u]));
  const photos = await photosFor(otherIds);
  return rows.rows
    .filter((m) => byId.has(otherUserId(m, userId)))
    .map((m) => {
      const other = byId.get(otherUserId(m, userId))!;
      return {
        id: m.id,
        createdAt: m.created_at,
        user: publicProfile(other, photos.get(other.id) ?? [], me),
        lastMessage: m.last_body ? { body: m.last_body, senderId: m.last_sender, createdAt: m.last_at } : null,
        unread: m.unread,
      };
    });
}

export async function matchSummary(matchId: string, forUserId: string) {
  const m = await one<MatchRow>('SELECT * FROM matches WHERE id = $1', [matchId]);
  if (!m) return null;
  const me = await getUser(forUserId);
  const other = await getUser(otherUserId(m, forUserId));
  if (!other) return null;
  const photos = await photosFor([other.id]);
  return {
    id: m.id,
    createdAt: m.created_at,
    user: publicProfile(other, photos.get(other.id) ?? [], me),
    lastMessage: null,
    unread: 0,
  };
}
