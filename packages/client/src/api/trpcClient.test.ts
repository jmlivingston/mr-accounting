import { TRPCClientError } from '@trpc/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { csrfHeader } from '../constants';
import { getErrorMessage, isUnauthorized, setCsrfToken, trpc } from './trpcClient';

function serverError(code: string, message = 'Server said no') {
  return new TRPCClientError(message, {
    result: { error: { message, code: -32000, data: { code, httpStatus: 400 } } } as never,
  });
}

function batchResponse(...data: unknown[]) {
  return new Response(JSON.stringify(data.map((item) => ({ result: { data: item } }))), {
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  setCsrfToken(null);
  vi.unstubAllGlobals();
});

describe('getErrorMessage', () => {
  it('returns the message from a tRPC error', () => {
    expect(getErrorMessage(serverError('BAD_REQUEST', 'amount: Too big'))).toBe('amount: Too big');
  });

  it.each([new TypeError('Failed to fetch'), 'boom', null])('hides non-tRPC failures: %s', (error) => {
    expect(getErrorMessage(error)).toBe('Unable to reach the server');
  });
});

describe('isUnauthorized', () => {
  it('is true only for tRPC UNAUTHORIZED errors', () => {
    expect(isUnauthorized(serverError('UNAUTHORIZED'))).toBe(true);
    expect(isUnauthorized(serverError('FORBIDDEN'))).toBe(false);
    expect(isUnauthorized(new Error('UNAUTHORIZED'))).toBe(false);
    expect(isUnauthorized(undefined)).toBe(false);
  });
});

describe('trpc client', () => {
  it('sends credentials and no CSRF header before a token is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(batchResponse({ csrfToken: 'abc' }));
    vi.stubGlobal('fetch', fetchMock);
    await trpc.auth.session.query();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/trpc/auth.session');
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).has(csrfHeader)).toBe(false);
  });

  it('sends the CSRF token once it is set, and stops after it is cleared', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(batchResponse({ csrfToken: 'abc' })));
    vi.stubGlobal('fetch', fetchMock);
    setCsrfToken('token-123');
    await trpc.auth.session.query();
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).get(csrfHeader)).toBe(
      'token-123',
    );
    setCsrfToken(null);
    await trpc.auth.session.query();
    expect(new Headers((fetchMock.mock.calls[1] as [string, RequestInit])[1].headers).has(csrfHeader)).toBe(false);
  });

  it('batches concurrent queries into a single request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(batchResponse({ balance: 5 }, []));
    vi.stubGlobal('fetch', fetchMock);
    const [balance, recent] = await Promise.all([trpc.transactions.balance.query(), trpc.transactions.recent.query()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('transactions.balance,transactions.recent');
    expect(balance).toEqual({ balance: 5 });
    expect(recent).toEqual([]);
  });
});
