import { act, renderHook, waitFor } from '@testing-library/react';
import type { Transaction, TransactionInput } from 'api/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { content } from '../content/content';
import { trpcError } from '../test/trpcErrors';
import { useAccount } from './useAccount';

const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../api/trpcClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/trpcClient')>()),
  trpc: {
    transactions: {
      account: { query: mocks.account },
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

function unauthorized() {
  return trpcError('UNAUTHORIZED');
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.account.mockResolvedValue({ balance: 50, transactions: [transaction] });
});

describe('useAccount', () => {
  it('starts empty then loads the balance and recent transactions', async () => {
    const { result } = renderHook(() => useAccount());
    expect(result.current.balance).toBeNull();
    expect(result.current.transactions).toEqual([]);
    await waitFor(() => expect(result.current.balance).toBe(50));
    expect(result.current.transactions).toEqual([transaction]);
    expect(result.current.loadError).toBeNull();
  });

  it('does not reload on re-render', async () => {
    const { result, rerender } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.balance).toBe(50));
    rerender();
    rerender();
    expect(mocks.account).toHaveBeenCalledTimes(1);
  });

  it('reports a load error', async () => {
    mocks.account.mockRejectedValue(trpcError('INTERNAL_SERVER_ERROR'));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loadError).toBe(content.errors.internal));
  });

  it('reports an unauthorized load error', async () => {
    mocks.account.mockRejectedValue(unauthorized());
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loadError).toBe(content.errors.unauthorized));
  });

  it('creates a transaction then refreshes the account', async () => {
    mocks.create.mockResolvedValue(transaction);
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.balance).toBe(50));
    mocks.account.mockResolvedValue({ balance: 100, transactions: [transaction] });

    await act(() => result.current.addTransaction(input));

    expect(mocks.create).toHaveBeenCalledWith(input);
    expect(result.current.balance).toBe(100);
  });

  it('clears an earlier load error after a successful refresh', async () => {
    mocks.account.mockRejectedValueOnce(trpcError('INTERNAL_SERVER_ERROR'));
    mocks.create.mockResolvedValue(transaction);
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loadError).toBe(content.errors.internal));

    await act(() => result.current.addTransaction(input));

    expect(result.current.loadError).toBeNull();
    expect(result.current.balance).toBe(50);
  });

  it('throws the server message when creating fails and does not refresh', async () => {
    mocks.create.mockRejectedValue(trpcError('BAD_REQUEST', 'insufficientFunds'));
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.balance).toBe(50));
    mocks.account.mockClear();

    await act(async () => {
      await expect(result.current.addTransaction(input)).rejects.toThrow(content.errors.insufficientFunds);
    });
    expect(mocks.account).not.toHaveBeenCalled();
  });

  it('reports an unauthorized error when creating', async () => {
    mocks.create.mockRejectedValue(unauthorized());
    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.balance).toBe(50));

    await act(async () => {
      await expect(result.current.addTransaction(input)).rejects.toThrow(content.errors.unauthorized);
    });
  });
});
