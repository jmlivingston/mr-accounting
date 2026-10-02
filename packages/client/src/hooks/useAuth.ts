import { useCallback, useEffect, useState } from 'react';
import { setCsrfToken, trpc } from '../api/trpcClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    trpc.auth.session
      .query()
      .then(({ csrfToken }) => {
        setCsrfToken(csrfToken);
        setStatus(csrfToken ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => setStatus('unauthenticated'));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { csrfToken } = await trpc.auth.login.mutate({ username, password });
    setCsrfToken(csrfToken);
    setStatus('authenticated');
  }, []);

  const expireSession = useCallback(() => {
    setCsrfToken(null);
    setStatus('unauthenticated');
  }, []);

  const logout = useCallback(async () => {
    await trpc.auth.logout.mutate();
    expireSession();
  }, [expireSession]);

  return { status, login, logout, expireSession };
}
