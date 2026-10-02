import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { config, files, scopes, session } from './config';
import { hashPassword } from './services/authService';
import { writeJsonFile } from './storage/jsonFile';
import { useTempDataDir } from './test/tempDataDir';

const password = 'Sup3r-secret';
const credentials = { username: 'tester', password };

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

useTempDataDir();

async function seedUser(userScopes: string[] = [scopes.transactionsRead, scopes.transactionsWrite]) {
  const user = { id: '0b8f6a0e-3a7c-4f7e-8f0e-1d2c3b4a5f60', username: 'tester', scopes: userScopes };
  await writeJsonFile(files.auth, { users: [{ ...user, ...(await hashPassword(password)) }] });
}

beforeEach(() => seedUser());

type TrpcResult = {
  result?: { data: Record<string, unknown> };
  error?: { message: string; data: { code: string } };
};

async function call(
  path: string,
  { method = 'GET', input, cookie, csrf }: { method?: string; input?: unknown; cookie?: string; csrf?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (csrf) headers[session.csrfHeader] = csrf;
  let url = `${baseUrl}/trpc/${path}`;
  let body: string | undefined;
  if (method === 'GET' && input !== undefined) url += `?input=${encodeURIComponent(JSON.stringify(input))}`;
  if (method === 'POST') {
    headers['content-type'] = 'application/json';
    if (input !== undefined) body = JSON.stringify(input);
  }
  const response = await fetch(url, { method, headers, body });
  return { response, body: (await response.json()) as TrpcResult };
}

// Sessions are cached per scope set because login is rate limited to a handful of attempts
const sessions = new Map<string, { cookie: string; csrf: string }>();

async function login(userScopes: string[] = [scopes.transactionsRead, scopes.transactionsWrite]) {
  const key = userScopes.join(',');
  const cached = sessions.get(key);
  if (cached) return cached;
  await seedUser(userScopes);
  const { response, body } = await call('auth.login', { method: 'POST', input: credentials });
  const created = {
    cookie: response.headers.getSetCookie()[0]?.split(';')[0] ?? '',
    csrf: String(body.result?.data.csrfToken),
  };
  sessions.set(key, created);
  return created;
}

const transaction = { date: '2026-03-01T12:00:00Z', amount: 100, type: 'credit', description: 'Salary' };

describe('auth.login', () => {
  it('sets a hardened session cookie and returns a CSRF token', async () => {
    const { response, body } = await call('auth.login', { method: 'POST', input: credentials });
    expect(response.status).toBe(200);
    expect(body.result?.data.username).toBe('tester');
    expect(body.result?.data.csrfToken).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/));
    const cookie = response.headers.getSetCookie()[0];
    expect(cookie).toContain(`${session.cookieName}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
  });

  it('rejects a wrong password with a generic message', async () => {
    const { response, body } = await call('auth.login', {
      method: 'POST',
      input: { username: 'tester', password: 'wrong' },
    });
    expect(response.status).toBe(401);
    expect(body.error?.message).toBe('Invalid username or password');
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it('gives the same error for an unknown user', async () => {
    const { response, body } = await call('auth.login', {
      method: 'POST',
      input: { username: 'nobody', password },
    });
    expect(response.status).toBe(401);
    expect(body.error?.message).toBe('Invalid username or password');
  });

  it('rejects an empty username with a validation message', async () => {
    const { response, body } = await call('auth.login', { method: 'POST', input: { username: '', password } });
    expect(response.status).toBe(400);
    expect(body.error?.message).toContain('username: Too small');
  });
});

describe('auth.session and auth.logout', () => {
  it('requires a session', async () => {
    const { response, body } = await call('auth.session');
    expect(response.status).toBe(401);
    expect(body.error?.data.code).toBe('UNAUTHORIZED');
  });

  it('ignores an invalid cookie', async () => {
    const { response } = await call('auth.session', { cookie: `${session.cookieName}=garbage` });
    expect(response.status).toBe(401);
  });

  it('returns the CSRF token for a valid session', async () => {
    const { cookie, csrf } = await login();
    const { response, body } = await call('auth.session', { cookie });
    expect(response.status).toBe(200);
    expect(body.result?.data.csrfToken).toBe(csrf);
  });

  it('clears the cookie on logout', async () => {
    const { cookie, csrf } = await login();
    const { response } = await call('auth.logout', { method: 'POST', cookie, csrf });
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()[0]).toMatch(new RegExp(`${session.cookieName}=;`));
  });

  it('requires the CSRF token on logout', async () => {
    const { cookie } = await login();
    const { response, body } = await call('auth.logout', { method: 'POST', cookie });
    expect(response.status).toBe(403);
    expect(body.error?.message).toBe('Invalid CSRF token');
  });
});

describe('transactions', () => {
  it('requires authentication to read', async () => {
    expect((await call('transactions.balance')).response.status).toBe(401);
    expect((await call('transactions.recent')).response.status).toBe(401);
  });

  it('creates a transaction and reflects it in balance and recent', async () => {
    const { cookie, csrf } = await login();
    const created = await call('transactions.create', { method: 'POST', input: transaction, cookie, csrf });
    expect(created.response.status).toBe(200);
    expect(created.body.result?.data).toMatchObject(transaction);

    const balance = await call('transactions.balance', { cookie });
    expect(balance.body.result?.data).toEqual({ balance: 100 });
    const recent = await call('transactions.recent', { cookie });
    expect(recent.body.result?.data).toHaveLength(1);
  });

  it('rejects creation without a CSRF token', async () => {
    const { cookie } = await login();
    const { response } = await call('transactions.create', { method: 'POST', input: transaction, cookie });
    expect(response.status).toBe(403);
  });

  it('rejects creation with the wrong CSRF token', async () => {
    const { cookie } = await login();
    const { response } = await call('transactions.create', {
      method: 'POST',
      input: transaction,
      cookie,
      csrf: 'wrong',
    });
    expect(response.status).toBe(403);
  });

  it('requires the write scope to create', async () => {
    const { cookie, csrf } = await login([scopes.transactionsRead]);
    const { response } = await call('transactions.create', { method: 'POST', input: transaction, cookie, csrf });
    expect(response.status).toBe(403);
    expect((await call('transactions.balance', { cookie })).response.status).toBe(200);
  });

  it('requires the read scope to read', async () => {
    const { cookie } = await login([scopes.transactionsWrite]);
    expect((await call('transactions.balance', { cookie })).response.status).toBe(403);
  });

  it('reports field-level validation errors', async () => {
    const { cookie, csrf } = await login();
    const { response, body } = await call('transactions.create', {
      method: 'POST',
      input: { ...transaction, amount: 1_000_001 },
      cookie,
      csrf,
    });
    expect(response.status).toBe(400);
    expect(body.error?.message).toBe('amount: Too big: expected number to be <=1000000');
  });

  it('rejects a debit that overdraws the account', async () => {
    const { cookie, csrf } = await login();
    const { response, body } = await call('transactions.create', {
      method: 'POST',
      input: { ...transaction, type: 'debit' },
      cookie,
      csrf,
    });
    expect(response.status).toBe(400);
    expect(body.error?.message).toContain('Insufficient funds');
  });

  it('hides internal errors from the client but logs them', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { cookie } = await login();
    await writeJsonFile(files.transactions, { transactions: [{ not: 'valid' }] });
    const { response, body } = await call('transactions.balance', { cookie });
    expect(response.status).toBe(500);
    expect(body.error?.message).toBe('Internal server error');
    expect(logged).toHaveBeenCalledWith('tRPC error on transactions.balance:', expect.anything());
    logged.mockRestore();
  });
});

describe('HTTP hardening', () => {
  it('sets security headers and disables caching', async () => {
    const response = await fetch(`${baseUrl}/trpc/auth.session`);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('advertises only the configured client origin for CORS', async () => {
    const allowed = await fetch(`${baseUrl}/trpc/auth.session`, { headers: { origin: config.clientOrigin } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe(config.clientOrigin);
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    const other = await fetch(`${baseUrl}/trpc/auth.session`, { headers: { origin: 'https://evil.example' } });
    expect(other.headers.get('access-control-allow-origin')).toBe(config.clientOrigin);
  });

  it('rejects disallowed methods', async () => {
    const response = await fetch(`${baseUrl}/trpc/auth.session`, { method: 'DELETE' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, POST, OPTIONS');
  });

  it('returns 404 JSON for unknown routes', async () => {
    const response = await fetch(`${baseUrl}/nope`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('rejects oversized request bodies', async () => {
    const response = await fetch(`${baseUrl}/trpc/auth.login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'a'.repeat(20_000), password }),
    });
    expect(response.status).toBe(413);
  });
});
