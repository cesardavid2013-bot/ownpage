import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { verifyAccessToken } from './lib/auth.js';
import { one } from './db/pool.js';

let io: Server | null = null;

export function initRealtime(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: config.corsOrigins.includes('*') ? true : config.corsOrigins, credentials: true },
  });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      socket.data.userId = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    socket.on('typing', async (payload: { matchId?: string }) => {
      if (!payload?.matchId) return;
      const match = await one<{ user_a: string; user_b: string }>(
        'SELECT user_a, user_b FROM matches WHERE id = $1 AND unmatched_at IS NULL',
        [payload.matchId],
      ).catch(() => null);
      if (!match || (match.user_a !== userId && match.user_b !== userId)) return;
      const other = match.user_a === userId ? match.user_b : match.user_a;
      emitToUser(other, 'typing', { matchId: payload.matchId, userId });
    });
  });
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function closeRealtime() {
  io?.close();
  io = null;
}
