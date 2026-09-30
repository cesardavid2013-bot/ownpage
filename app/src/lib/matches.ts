import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useRealtime } from './realtime';
import type { Match } from './types';

/** Match list that refreshes automatically on realtime events. */
export function useMatches() {
  const version = useRealtime((s) => s.version);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ matches: Match[] }>('/matches');
      setMatches(res.matches);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  return { matches, error, reload: load };
}
