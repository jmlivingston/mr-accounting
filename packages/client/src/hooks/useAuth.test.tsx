import { act, renderHook, waitFor } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setCsrfToken: vi.fn(),
}));

vi.mock('../api/trpcClient', () => ({
  trpc: {
    auth: {
      session: { query: mocks.session },
      login: { mutate: mocks.login },
      logout: { mutate: mocks.logout },
    },
  },
  setCsrfToken: mocks.setCsrfToken,
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useAuth', () => {
  it('starts in the loading state', () => {
    mocks.session.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useAuth());
    expect(result.current.status).toBe('loading');
  });

  it('restores an existing session and stores its CSRF token', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf-1' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(mocks.setCsrfToken).toHaveBeenCalledWith('csrf-1');
  });

  it('is unauthenticated when there is no session', async () => {
    mocks.session.mockRejectedValue(new TRPCClientError('Unauthorized'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(mocks.setCsrfToken).not.toHaveBeenCalled();
  });

  it('logs in, stores the CSRF token and becomes authenticated', async () => {
    mocks.session.mockRejectedValue(new Error('no session'));
    mocks.login.mockResolvedValue({ username: 'alice', csrfToken: 'csrf-2' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(() => result.current.login('alice', 'pw'));

    expect(mocks.login).toHaveBeenCalledWith({ username: 'alice', password: 'pw' });
    expect(mocks.setCsrfToken).toHaveBeenCalledWith('csrf-2');
    expect(result.current.status).toBe('authenticated');
  });

  it('propagates login failures and stays unauthenticated', async () => {
    mocks.session.mockRejectedValue(new Error('no session'));
    mocks.login.mockRejectedValue(new Error('Invalid username or password'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await expect(result.current.login('alice', 'bad')).rejects.toThrow('Invalid username or password');
    });
    expect(result.current.status).toBe('unauthenticated');
  });

  it('logs out on the server and clears local state', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf-1' });
    mocks.logout.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(() => result.current.logout());

    expect(mocks.logout).toHaveBeenCalled();
    expect(mocks.setCsrfToken).toHaveBeenLastCalledWith(null);
    expect(result.current.status).toBe('unauthenticated');
  });

  it('expireSession clears local state without calling the server', async () => {
    mocks.session.mockResolvedValue({ csrfToken: 'csrf-1' });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    act(() => result.current.expireSession());

    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.setCsrfToken).toHaveBeenLastCalledWith(null);
    expect(result.current.status).toBe('unauthenticated');
  });
});
