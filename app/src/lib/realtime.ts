import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { refreshSession, tokens } from './api';
import { API_URL } from './config';
import type { Match, Message } from './types';

let socket: Socket | null = null;

interface RealtimeState {
  connected: boolean;
  /** A new match to celebrate with the "It's a match" screen. */
  celebrate: Match | null;
  /** Bumped whenever matches/messages change so lists can refetch. */
  version: number;
  newLikes: number;
  setCelebrate: (m: Match | null) => void;
  bump: () => void;
  clearLikes: () => void;
}

export const useRealtime = create<RealtimeState>((set) => ({
  connected: false,
  celebrate: null,
  version: 0,
  newLikes: 0,
  setCelebrate: (celebrate) => set({ celebrate }),
  bump: () => set((s) => ({ version: s.version + 1 })),
  clearLikes: () => set({ newLikes: 0 }),
}));

function connect(token: string) {
  socket?.disconnect();
  socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
  socket.on('connect', () => useRealtime.setState({ connected: true }));
  socket.on('disconnect', () => useRealtime.setState({ connected: false }));
  socket.on('connect_error', async (err) => {
    // Access tokens are short-lived; refresh and reconnect (the token listener reconnects).
    if (err.message === 'unauthorized') await refreshSession();
  });
  socket.on('match:new', (m: Match) => {
    useRealtime.setState((s) => ({ celebrate: m, version: s.version + 1 }));
  });
  socket.on('match:removed', () => useRealtime.getState().bump());
  socket.on('message:new', () => useRealtime.getState().bump());
  socket.on('message:read', () => useRealtime.getState().bump());
  socket.on('verification:updated', () => {
    import('./auth').then(({ useAuth }) => useAuth.getState().reload());
  });
  socket.on('like:new', () => useRealtime.setState((s) => ({ newLikes: s.newLikes + 1 })));
}

tokens.onChange((token) => {
  if (token) connect(token);
  else {
    socket?.disconnect();
    socket = null;
    useRealtime.setState({ connected: false, celebrate: null, newLikes: 0 });
  }
});

/** Subscribe to a raw socket event for the lifetime of a component. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const connected = useRealtime((st) => st.connected);
  useEffect(() => {
    const s = socket;
    const h = (p: T) => handler(p);
    s?.on(event, h);
    return () => {
      s?.off(event, h);
    };
  }, [event, handler, connected]);
}

export function emitTyping(matchId: string) {
  socket?.emit('typing', { matchId });
}

export type { Message };
