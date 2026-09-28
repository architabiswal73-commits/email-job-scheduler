import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, logout } from '../api/endpoints';
import type { User } from '../types/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  return { user, loading, refresh, signOut };
}
