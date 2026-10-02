import { describe, expect, it } from 'vitest';
import { limits } from '../config';
import type { TransactionInput } from '../schemas/transaction';
import { useTempDataDir } from '../test/tempDataDir';
import { createJsonFileLedgerAdapter } from './jsonFileAdapter';
import { createLedger, type PostResult } from './ledger';
import { createMemoryLedgerAdapter } from './memoryAdapter';

useTempDataDir();

function input(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return { date: '2026-01-01T00:00:00Z', amount: 100, type: 'credit', description: 'Deposit', ...overrides };
}

function accepted(result: PostResult) {
  if (!result.ok) throw new Error('Expected the transaction to be accepted');
  return result.transaction;
}

describe.each([
  ['memory adapter', createMemoryLedgerAdapter],
  ['JSON file adapter', createJsonFileLedgerAdapter],
])('Ledger with the %s', (_name, createAdapter) => {
  function setup() {
    const ledger = createLedger(createAdapter());
    const descriptions = async () => (await ledger.snapshot()).transactions.map(({ description }) => description);
    return { ledger, descriptions };
  }

  describe('balance', () => {
    it('is zero with no transactions', async () => {
      expect(await setup().ledger.snapshot()).toEqual({ balance: 0, transactions: [] });
    });

    it('adds credits and subtracts debits', async () => {
      const { ledger } = setup();
      await ledger.post(input({ amount: 100 }));
      await ledger.post(input({ amount: 30, type: 'debit' }));
      expect((await ledger.snapshot()).balance).toBe(70);
    });

    it('avoids floating point drift', async () => {
      const { ledger } = setup();
      await ledger.post(input({ amount: 0.1 }));
      await ledger.post(input({ amount: 0.2 }));
      await ledger.post(input({ amount: 0.3, type: 'debit' }));
      expect((await ledger.snapshot()).balance).toBe(0);
    });
  });

  describe('post', () => {
    it('assigns an id and returns the stored transaction', async () => {
      const transaction = accepted(await setup().ledger.post(input()));
      expect(transaction).toMatchObject(input());
      expect(transaction.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('rejects a debit that would make the balance negative', async () => {
      const { ledger } = setup();
      await ledger.post(input({ amount: 50 }));
      expect(await ledger.post(input({ amount: 50.01, type: 'debit' }))).toEqual({
        ok: false,
        reason: 'insufficientFunds',
      });
      expect((await ledger.snapshot()).balance).toBe(50);
    });

    it('allows a debit that brings the balance to exactly zero', async () => {
      const { ledger } = setup();
      await ledger.post(input({ amount: 50 }));
      accepted(await ledger.post(input({ amount: 50, type: 'debit' })));
      expect((await ledger.snapshot()).balance).toBe(0);
    });

    it('does not store a rejected transaction', async () => {
      const { ledger } = setup();
      await ledger.post(input({ type: 'debit' }));
      expect((await ledger.snapshot()).transactions).toEqual([]);
    });

    it('keeps working after a rejected transaction', async () => {
      const { ledger } = setup();
      await ledger.post(input({ type: 'debit' }));
      await ledger.post(input({ amount: 10 }));
      expect((await ledger.snapshot()).balance).toBe(10);
    });

    it('does not lose transactions posted concurrently', async () => {
      const { ledger } = setup();
      await Promise.all(Array.from({ length: 20 }, () => ledger.post(input({ amount: 1 }))));
      expect((await ledger.snapshot()).balance).toBe(20);
    });

    it('cannot be overdrawn by concurrent debits', async () => {
      const { ledger } = setup();
      await ledger.post(input({ amount: 100 }));
      const results = await Promise.all(
        Array.from({ length: 5 }, () => ledger.post(input({ amount: 30, type: 'debit' }))),
      );
      expect(results.filter(({ ok }) => ok)).toHaveLength(3);
      expect((await ledger.snapshot()).balance).toBe(10);
    });
  });

  describe('recent transactions', () => {
    it('returns newest first by date', async () => {
      const { ledger, descriptions } = setup();
      await ledger.post(input({ date: '2026-01-02T00:00:00Z', description: 'middle' }));
      await ledger.post(input({ date: '2026-01-03T00:00:00Z', description: 'newest' }));
      await ledger.post(input({ date: '2026-01-01T00:00:00Z', description: 'oldest' }));
      expect(await descriptions()).toEqual(['newest', 'middle', 'oldest']);
    });

    it('compares dates across time zone offsets', async () => {
      const { ledger, descriptions } = setup();
      await ledger.post(input({ date: '2026-01-01T10:00:00-07:00', description: 'later' }));
      await ledger.post(input({ date: '2026-01-01T12:00:00Z', description: 'earlier' }));
      expect(await descriptions()).toEqual(['later', 'earlier']);
    });

    it('puts the most recently added first when dates are equal', async () => {
      const { ledger, descriptions } = setup();
      await ledger.post(input({ description: 'first' }));
      await ledger.post(input({ description: 'second' }));
      expect(await descriptions()).toEqual(['second', 'first']);
    });

    it('limits the number of results but not the balance', async () => {
      const { ledger } = setup();
      const count = limits.recentTransactions + 3;
      for (let day = 1; day <= count; day++) {
        await ledger.post(input({ date: `2026-01-${String(day).padStart(2, '0')}T00:00:00Z` }));
      }
      const snapshot = await ledger.snapshot();
      expect(snapshot.transactions).toHaveLength(limits.recentTransactions);
      expect(snapshot.balance).toBe(count * 100);
    });
  });
});

describe('Ledger with the JSON file adapter', () => {
  it('persists across instances', async () => {
    await createLedger(createJsonFileLedgerAdapter()).post(input({ amount: 25 }));
    expect((await createLedger(createJsonFileLedgerAdapter()).snapshot()).balance).toBe(25);
  });
});
