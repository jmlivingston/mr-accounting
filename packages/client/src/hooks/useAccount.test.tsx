import { act, renderHook, waitFor } from '@testing-library/react';
import { TRPCClientError } from '@trpc/client';
import type { Transaction, TransactionInput } from 'api/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount } from './useAccount';

const mocks = vi.hoisted(() => ({
  balance: vi.fn(),
  recent: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../api/trpcClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/trpcClient')>()),
  trpc: {
    transactions: {
      balance: { query: mocks.balance },
      recent: { query: mocks.recent },
      create: { mutate: mocks.create },
    },
  },
}));

const transaction: Transaction = {
  id: '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69',
  date: '2026-03-01T12:00:00Z',
  amount: 50,
  type: 'credit',
  description: 'Salary',
};

const input: TransactionInput = {
  date: transaction.date,
  amount: 50,
  type: 'credit',
  description: 'Salary',
};

const onSessionExpired = vi.fn();

function unauthorized() {
  return new TRPCClientError('Unauthorized', {
    result: { error: { message: 'Unauthorized', code: -32001, data: { code: 'UNAUTHORIZED' } } } as never,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.balance.mockResolvedValue({ balance: 50 });
  mocks.recent.mockResolvedValue([transaction]);
});

describe('useAccount', () => {
  it('starts empty then loads the balance and recent transactions', async () => {
    const { result } = renderHook(() => useAccount(onSessionExpired));
    expect(result.current.balance).toBeNull();
    expect(result.current.transactions).toEqual([]);
    await waitFor(() => expect(result.current.balance).toBe(50));
    expect(result.current.transactions).toEqual([transaction]);
    expect(result.current.loadError).toBeNull();
  });

  it('does not reload when the caller passes a new callback on every render', async () => {
    const { result, rerender } = renderHook(() => useAccount(() => undefined));
    await waitFor(() => expect(result.current.balance).toBe(50));
    rerender();
    rerender();
    expect(mocks.balance).toHaveBeenCalledTimes(1);
  });

  it('calls the latest callback when the session expires', async () => {
    mocks.create.mockRejectedValue(unauthorized());
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ callback }) => useAccount(callback), {
      initialProps: { callback: first },
    });
    await waitFor(() => expect(result.current.balance).toBe(50));
    rerender({ callback: second });

    await act(async () => {
      await expect(result.current.addTransaction(input)).rejects.toThrow();
    });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('reports a load error without expiring the session', async () => {
    mocks.balance.mockRejectedValue(new TRPCClientError('Internal server error'));
    const { result } = renderHook(() => useAccount(onSessionExpired));
    await waitFor(() => expect(result.current.loadError).toBe('Internal server error'));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('expires the session when loading is unauthorized', async () => {
    mocks.recent.mockRejectedValue(unauthorized());
    renderHook(() => useAccount(onSessionExpired));
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it('creates a transaction then refreshes the account', async () => {
    mocks.create.mockResolvedValue(transaction);
    const { result } = renderHook(() => useAccount(onSessionExpired));
    await waitFor(() => expect(result.current.balance).toBe(50));
    mocks.balance.mockResolvedValue({ balance: 100 });

    await act(() => result.current.addTransaction(input));

    expect(mocks.create).toHaveBeenCalledWith(input);
    expect(result.current.balance).toBe(100);
  });

  it('clears an earlier load error after a successful refresh', async () => {
    mocks.balance.mockRejectedValueOnce(new TRPCClientError('Temporary failure'));
    mocks.create.mockResolvedValue(transaction);
    const { result } = renderHook(() => useAccount(onSessionExpired));
    await waitFor(() => expect(result.current.loadError).toBe('Temporary failure'));

    await act(() => result.current.addTransaction(input));

    expect(result.current.loadError).toBeNull();
    expect(result.current.balance).toBe(50);
  });

  it('throws the server message when creating fails and does not refresh', async () => {
    mocks.create.mockRejectedValue(new TRPCClientError('Insufficient funds'));
    const { result } = renderHook(() => useAccount(onSessionExpired));
    await waitFor(() => expect(result.current.balance).toBe(50));
    mocks.balance.mockClear();

    await act(async () => {
      await expect(result.current.addTransaction(input)).rejects.toThrow('Insufficient funds');
    });
    expect(mocks.balance).not.toHaveBeenCalled();
  });

  it('expires the session when creating is unauthorized', async () => {
    mocks.create.mockRejectedValue(unauthorized());
    const { result } = renderHook(() => useAccount(onSessionExpired));
    await waitFor(() => expect(result.current.balance).toBe(50));

    await act(async () => {
      await expect(result.current.addTransaction(input)).rejects.toThrow('Unauthorized');
    });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
});
