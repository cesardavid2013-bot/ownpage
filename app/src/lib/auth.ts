import { create } from 'zustand';
import { api, refreshSessionDetailed, tokens } from './api';
import type { Me } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'offline';

interface AuthState {
  status: Status;
  user: Me | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    birthdate: string;
    gender: string;
    interestedIn: string[];
    locale: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<Me | null>;
  setUser: (user: Me) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  async bootstrap() {
    tokens.onExpired(() => {
      tokens.clear();
      set({ status: 'signedOut', user: null });
    });
    let result = await refreshSessionDetailed();
    // A flaky network or a busy server shouldn't sign anyone out: retry with backoff first.
    for (let attempt = 0; result === 'unreachable' && attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      result = await refreshSessionDetailed();
    }
    if (result === 'unreachable') {
      set({ status: 'offline', user: null });
      return;
    }
    if (result !== 'ok') {
      set({ status: 'signedOut', user: null });
      return;
    }
    try {
      const user = await api<Me>('/me');
      set({ status: 'signedIn', user });
    } catch (e) {
      set({ status: (e as { code?: string }).code === 'network_error' ? 'offline' : 'signedOut', user: null });
    }
  },

  async login(email, password) {
    const res = await api<{ accessToken: string; refreshToken: string; user: Me }>('/auth/login', {
      body: { email, password },
      auth: false,
    });
    await tokens.set(res.accessToken, res.refreshToken);
    set({ status: 'signedIn', user: res.user });
  },

  async register(data) {
    const res = await api<{ accessToken: string; refreshToken: string; user: Me }>('/auth/register', {
      body: data,
      auth: false,
    });
    await tokens.set(res.accessToken, res.refreshToken);
    set({ status: 'signedIn', user: res.user });
  },

  async logout() {
    const refresh = await tokens.refreshToken();
    if (refresh) await api('/auth/logout', { body: { refreshToken: refresh }, auth: false }).catch(() => {});
    await tokens.clear();
    set({ status: 'signedOut', user: null });
  },

  async reload() {
    if (get().status !== 'signedIn') return null;
    try {
      const user = await api<Me>('/me');
      set({ user });
      return user;
    } catch {
      return get().user;
    }
  },

  setUser(user) {
    set({ user });
  },
}));
