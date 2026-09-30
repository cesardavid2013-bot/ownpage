import { Platform } from 'react-native';
import { API_URL } from './config';
import { storage } from './storage';

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

const REFRESH_KEY = 'lumi.refreshToken';
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

export const tokens = {
  get access() {
    return accessToken;
  },
  async set(access: string, refresh: string) {
    accessToken = access;
    await storage.set(REFRESH_KEY, refresh);
    tokenListeners.forEach((l) => l(access));
  },
  async clear() {
    accessToken = null;
    await storage.remove(REFRESH_KEY);
    tokenListeners.forEach((l) => l(null));
  },
  refreshToken: () => storage.get(REFRESH_KEY),
  onChange(listener: (token: string | null) => void) {
    tokenListeners.add(listener);
    return () => tokenListeners.delete(listener);
  },
  onExpired(cb: () => void) {
    onSessionExpired = cb;
  },
};

/** Exchanges the stored refresh token for a new pair. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = await storage.get(REFRESH_KEY);
      if (!refresh) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!res.ok) {
          if (res.status === 401) await tokens.clear();
          return false;
        }
        const data = await res.json();
        await tokens.set(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type Options = { method?: string; body?: unknown; form?: FormData; auth?: boolean };

export async function api<T = any>(path: string, opts: Options = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET'),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }
  if (res.status === 401 && opts.auth !== false && !retried) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.error === 'token_invalid' || data.error === 'unauthorized') {
      if (await refreshSession()) return api<T>(path, opts, true);
      onSessionExpired?.();
    }
    if (data.error === 'account_banned') onSessionExpired?.();
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'internal_error');
  return data as T;
}

/** Builds a multipart body for an image picked with expo-image-picker on any platform. */
export async function imageFormData(uri: string, mimeType = 'image/jpeg'): Promise<FormData> {
  const form = new FormData();
  const ext = mimeType.split('/')[1] ?? 'jpg';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('photo', blob, `photo.${ext}`);
  } else {
    form.append('photo', { uri, name: `photo.${ext}`, type: mimeType } as unknown as Blob);
  }
  return form;
}
