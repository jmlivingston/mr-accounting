import { describe, expect, it } from 'vitest';
import { limits } from '../config';
import type { TransactionInput } from '../schemas/transaction';
import { useTempDataDir } from '../test/tempDataDir';
import { addTransaction, getBalance, getRecentTransactions, InsufficientFundsError } from './transactionService';

useTempDataDir();

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return { date: '2026-01-01T00:00:00Z', amount: 100, type: 'credit', description: 'Deposit', ...overrides };
}

describe('getBalance', () => {
  it('is zero with no transactions', async () => {
    expect(await getBalance()).toBe(0);
  });

  it('adds credits and subtracts debits', async () => {
    await addTransaction(input({ amount: 100 }));
    await addTransaction(input({ amount: 30, type: 'debit' }));
    expect(await getBalance()).toBe(70);
  });

  it('avoids floating point drift', async () => {
    await addTransaction(input({ amount: 0.1 }));
    await addTransaction(input({ amount: 0.2 }));
    await addTransaction(input({ amount: 0.3, type: 'debit' }));
    expect(await getBalance()).toBe(0);
  });
});

describe('addTransaction', () => {
  it('assigns an id and returns the stored transaction', async () => {
    const transaction = await addTransaction(input());
    expect(transaction).toMatchObject(input());
    expect(transaction.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects a debit that would make the balance negative', async () => {
    await addTransaction(input({ amount: 50 }));
    await expect(addTransaction(input({ amount: 50.01, type: 'debit' }))).rejects.toBeInstanceOf(
      InsufficientFundsError,
    );
    expect(await getBalance()).toBe(50);
  });

  it('allows a debit that brings the balance to exactly zero', async () => {
    await addTransaction(input({ amount: 50 }));
    await addTransaction(input({ amount: 50, type: 'debit' }));
    expect(await getBalance()).toBe(0);
  });

  it('does not store a rejected transaction', async () => {
    await expect(addTransaction(input({ type: 'debit' }))).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await getRecentTransactions()).toEqual([]);
  });

  it('keeps working after a rejected transaction', async () => {
    await expect(addTransaction(input({ type: 'debit' }))).rejects.toBeInstanceOf(InsufficientFundsError);
    await addTransaction(input({ amount: 10 }));
    expect(await getBalance()).toBe(10);
  });

  it('does not lose transactions submitted concurrently', async () => {
    await Promise.all(Array.from({ length: 20 }, () => addTransaction(input({ amount: 1 }))));
    expect(await getBalance()).toBe(20);
  });

  it('cannot be overdrawn by concurrent debits', async () => {
    await addTransaction(input({ amount: 100 }));
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => addTransaction(input({ amount: 30, type: 'debit' }))),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(3);
    expect(await getBalance()).toBe(10);
  });
});

describe('getRecentTransactions', () => {
  it('returns newest first by date', async () => {
    await addTransaction(input({ date: '2026-01-02T00:00:00Z', description: 'middle' }));
    await addTransaction(input({ date: '2026-01-03T00:00:00Z', description: 'newest' }));
    await addTransaction(input({ date: '2026-01-01T00:00:00Z', description: 'oldest' }));
    const descriptions = (await getRecentTransactions()).map(({ description }) => description);
    expect(descriptions).toEqual(['newest', 'middle', 'oldest']);
  });

  it('compares dates across time zone offsets', async () => {
    await addTransaction(input({ date: '2026-01-01T10:00:00-07:00', description: 'later' }));
    await addTransaction(input({ date: '2026-01-01T12:00:00Z', description: 'earlier' }));
    const descriptions = (await getRecentTransactions()).map(({ description }) => description);
    expect(descriptions).toEqual(['later', 'earlier']);
  });

  it('puts the most recently added first when dates are equal', async () => {
    await addTransaction(input({ description: 'first' }));
    await addTransaction(input({ description: 'second' }));
    const descriptions = (await getRecentTransactions()).map(({ description }) => description);
    expect(descriptions).toEqual(['second', 'first']);
  });

  it('limits the number of results', async () => {
    for (let day = 1; day <= limits.recentTransactions + 3; day++) {
      await addTransaction(input({ date: `2026-01-${String(day).padStart(2, '0')}T00:00:00Z` }));
    }
    expect(await getRecentTransactions()).toHaveLength(limits.recentTransactions);
  });
});
