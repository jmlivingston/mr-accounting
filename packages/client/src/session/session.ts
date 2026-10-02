import { useSyncExternalStore } from 'react';
import { trpc } from '../api/trpcClient';
import { sessionStore } from './sessionStore';

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getStatus);
}

export async function restoreSession() {
  try {
    const { csrfToken } = await trpc.auth.session.query();
    if (csrfToken) sessionStore.begin(csrfToken);
    else sessionStore.end();
  } catch {
    sessionStore.end();
  }
}

export async function login(username: string, password: string) {
  const { csrfToken } = await trpc.auth.login.mutate({ username, password });
  sessionStore.begin(csrfToken);
}

export async function logout() {
  try {
    await trpc.auth.logout.mutate();
  } catch {
    // The user is logged out locally even when the server can't confirm it
  } finally {
    sessionStore.end();
  }
}
