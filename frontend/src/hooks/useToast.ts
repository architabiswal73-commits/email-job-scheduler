import { useCallback, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const show = useCallback((value: string) => setMessage(value), []);
  const clear = useCallback(() => setMessage(''), []);
  return { message, show, clear };
}
