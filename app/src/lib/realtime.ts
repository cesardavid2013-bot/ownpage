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
  const options = { auth: { token }, transports: ['websocket'] };
  // An empty API_URL means same origin (web build served by the API).
  socket = API_URL ? io(API_URL, options) : io(options);
  let connectedBefore = false;
  socket.on('connect', () => {
    // On a reconnect, lists refetch so anything missed while offline appears (merged, never duplicated).
    useRealtime.setState((s) => ({ connected: true, version: connectedBefore ? s.version + 1 : s.version }));
    connectedBefore = true;
  });
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

// On the web the browser knows about lost connectivity long before a socket ping times out.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('offline', () => useRealtime.setState({ connected: false }));
  window.addEventListener('online', () => {
    if (!socket) return;
    if (socket.connected) {
      // The socket survived; still refetch in case events were missed while the browser was offline.
      useRealtime.setState((s) => ({ connected: true, version: s.version + 1 }));
    } else {
      socket.connect();
    }
  });
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
