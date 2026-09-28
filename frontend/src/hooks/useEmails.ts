import { useCallback, useEffect, useState } from 'react';
import { getEmails, searchEmails } from '../api/endpoints';
import { useDebouncedValue } from './useDebouncedValue';
import type { Email } from '../types/api';

type EmailTab = 'scheduled' | 'sent';

export function useEmails(status: EmailTab, query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = debouncedQuery
        ? await searchEmails(debouncedQuery, status)
        : await getEmails(status);
      setEmails(result.emails);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not load emails');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, status]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (status !== 'scheduled') return;
    const timer = window.setInterval(() => void load(), 10000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load, status]);

  return { emails, loading, error, retry: load };
}
