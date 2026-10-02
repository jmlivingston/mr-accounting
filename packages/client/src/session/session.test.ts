import { afterEach, describe, expect, it, vi } from 'vitest';
import { trpc } from '../api/trpcClient';
import { csrfHeader } from '../constants';
import { login, logout, restoreSession } from './session';
import { sessionStore } from './sessionStore';

function data(value: unknown) {
  return new Response(JSON.stringify([{ result: { data: value } }]), {
    headers: { 'content-type': 'application/json' },
  });
}

function failure(code: string, httpStatus: number, reason?: string) {
  return new Response(
    JSON.stringify([{ error: { message: code, code: -32000, data: { code, httpStatus, reason } } }]),
    {
      status: httpStatus,
      headers: { 'content-type': 'application/json' },
    },
  );
}

function stubFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function csrfHeaderOf(fetchMock: ReturnType<typeof vi.fn>, call: number) {
  return new Headers((fetchMock.mock.calls[call] as [string, RequestInit])[1].headers).get(csrfHeader);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('restoreSession', () => {
  it('starts loading', () => {
    expect(sessionStore.getStatus()).toBe('loading');
  });

  it('begins the session when the server has one', async () => {
    stubFetch(data({ csrfToken: 'csrf-1' }));
    await restoreSession();
    expect(sessionStore.getStatus()).toBe('authenticated');
    expect(sessionStore.getCsrfToken()).toBe('csrf-1');
  });

  it('ends the session when the server reports none', async () => {
    stubFetch(data({ csrfToken: null }));
    await restoreSession();
    expect(sessionStore.getStatus()).toBe('unauthenticated');
    expect(sessionStore.getCsrfToken()).toBeNull();
  });

  it('ends the session when the check fails', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    await restoreSession();
    expect(sessionStore.getStatus()).toBe('unauthenticated');
  });
});

describe('login', () => {
  it('begins the session and sends its CSRF token on later calls', async () => {
    const fetchMock = stubFetch(data({ username: 'alice', csrfToken: 'csrf-2' }), data({ success: true }));
    await login('alice', 'pw');
    expect(sessionStore.getStatus()).toBe('authenticated');

    await trpc.auth.logout.mutate();
    expect(csrfHeaderOf(fetchMock, 0)).toBeNull();
    expect(csrfHeaderOf(fetchMock, 1)).toBe('csrf-2');
  });

  it('propagates wrong credentials without ending the session', async () => {
    sessionStore.begin('csrf-1');
    stubFetch(failure('UNAUTHORIZED', 401, 'invalidCredentials'));
    await expect(login('alice', 'bad')).rejects.toMatchObject({ data: { reason: 'invalidCredentials' } });
    expect(sessionStore.getStatus()).toBe('authenticated');
  });

  it('stays unauthenticated after wrong credentials', async () => {
    sessionStore.end();
    stubFetch(failure('UNAUTHORIZED', 401, 'invalidCredentials'));
    await expect(login('alice', 'bad')).rejects.toThrow();
    expect(sessionStore.getStatus()).toBe('unauthenticated');
  });
});

describe('logout', () => {
  it('ends the session after the server confirms', async () => {
    sessionStore.begin('csrf-1');
    const fetchMock = stubFetch(data({ success: true }));
    await logout();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sessionStore.getStatus()).toBe('unauthenticated');
    expect(sessionStore.getCsrfToken()).toBeNull();
  });

  it('ends the session even when the server call fails', async () => {
    sessionStore.begin('csrf-1');
    stubFetch(new TypeError('Failed to fetch'));
    await expect(logout()).resolves.toBeUndefined();
    expect(sessionStore.getStatus()).toBe('unauthenticated');
  });
});

describe('session expiry', () => {
  it('ends the session when any call is unauthorized, and still rejects the call', async () => {
    sessionStore.begin('csrf-1');
    stubFetch(failure('UNAUTHORIZED', 401));
    await expect(trpc.transactions.account.query()).rejects.toMatchObject({ data: { code: 'UNAUTHORIZED' } });
    expect(sessionStore.getStatus()).toBe('unauthenticated');
    expect(sessionStore.getCsrfToken()).toBeNull();
  });

  it('keeps the session for other failures', async () => {
    sessionStore.begin('csrf-1');
    stubFetch(failure('FORBIDDEN', 403), failure('INTERNAL_SERVER_ERROR', 500));
    await expect(trpc.transactions.account.query()).rejects.toThrow();
    await expect(trpc.transactions.account.query()).rejects.toThrow();
    expect(sessionStore.getStatus()).toBe('authenticated');
  });
});

describe('sessionStore', () => {
  it('notifies subscribers only when the state changes', () => {
    const listener = vi.fn();
    const unsubscribe = sessionStore.subscribe(listener);
    sessionStore.begin('csrf-1');
    sessionStore.begin('csrf-1');
    sessionStore.end();
    sessionStore.end();
    unsubscribe();
    sessionStore.begin('csrf-2');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
