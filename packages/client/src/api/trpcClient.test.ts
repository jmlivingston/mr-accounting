import { TRPCClientError } from '@trpc/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { csrfHeader } from '../constants';
import { content } from '../content/content';
import { trpcError } from '../test/trpcErrors';
import { sessionStore } from '../session/sessionStore';
import { getErrorMessage, trpc } from './trpcClient';

function batchResponse(...data: unknown[]) {
  return new Response(JSON.stringify(data.map((item) => ({ result: { data: item } }))), {
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getErrorMessage', () => {
  it('maps a server reason to its localized text', () => {
    expect(getErrorMessage(trpcError('UNAUTHORIZED', 'invalidCredentials', 'Invalid username or password'))).toBe(
      content.errors.invalidCredentials,
    );
    expect(getErrorMessage(trpcError('BAD_REQUEST', 'insufficientFunds'))).toBe(content.errors.insufficientFunds);
    expect(getErrorMessage(trpcError('FORBIDDEN', 'invalidCsrfToken'))).toBe(content.errors.invalidCsrfToken);
    expect(getErrorMessage(trpcError('BAD_REQUEST', 'validation'))).toBe(content.errors.validation);
  });

  it('prefers the reason over the generic code message', () => {
    expect(getErrorMessage(trpcError('UNAUTHORIZED', 'invalidCredentials'))).not.toBe(content.errors.unauthorized);
  });

  it.each([
    ['UNAUTHORIZED', content.errors.unauthorized],
    ['FORBIDDEN', content.errors.forbidden],
    ['INTERNAL_SERVER_ERROR', content.errors.internal],
    ['TOO_MANY_REQUESTS', content.errors.unknown],
  ])('maps the %s code when there is no reason', (code, expected) => {
    expect(getErrorMessage(trpcError(code))).toBe(expected);
  });

  it('never shows the server message text', () => {
    expect(getErrorMessage(trpcError('INTERNAL_SERVER_ERROR', undefined, 'secret english message'))).not.toContain(
      'secret',
    );
  });

  it.each([new TypeError('Failed to fetch'), new TRPCClientError('Failed to fetch'), 'boom', null])(
    'reports a network problem when there is no tRPC response: %s',
    (error) => {
      expect(getErrorMessage(error)).toBe(content.errors.network);
    },
  );
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
    sessionStore.begin('token-123');
    await trpc.auth.session.query();
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).get(csrfHeader)).toBe(
      'token-123',
    );
    sessionStore.end();
    await trpc.auth.session.query();
    expect(new Headers((fetchMock.mock.calls[1] as [string, RequestInit])[1].headers).has(csrfHeader)).toBe(false);
  });

  it('batches concurrent queries into a single request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(batchResponse({ csrfToken: null }, { balance: 5, transactions: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const [session, account] = await Promise.all([trpc.auth.session.query(), trpc.transactions.account.query()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('auth.session,transactions.account');
    expect(session).toEqual({ csrfToken: null });
    expect(account).toEqual({ balance: 5, transactions: [] });
  });
});
