import { randomUUID } from 'node:crypto';
import { limits } from '../config';
import { errorReasons } from '../constants';
import type { Transaction, TransactionInput } from '../schemas/transaction';

export type LedgerAdapter = {
  load(): Promise<Transaction[]>;
  save(transactions: Transaction[]): Promise<void>;
};

export type AccountSnapshot = {
  balance: number;
  transactions: Transaction[];
};

export type PostResult =
  { ok: true; transaction: Transaction } | { ok: false; reason: typeof errorReasons.insufficientFunds };

export type Ledger = {
  snapshot(): Promise<AccountSnapshot>;
  post(input: TransactionInput): Promise<PostResult>;
};

function calculateBalance(transactions: Transaction[]) {
  const total = transactions.reduce((sum, { amount, type }) => sum + (type === 'credit' ? amount : -amount), 0);
  return Math.round(total * 100) / 100;
}

function selectRecent(transactions: Transaction[]) {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => Date.parse(b.transaction.date) - Date.parse(a.transaction.date) || b.index - a.index)
    .slice(0, limits.recentTransactions)
    .map(({ transaction }) => transaction);
}

export function createLedger(adapter: LedgerAdapter): Ledger {
  let writeQueue: Promise<unknown> = Promise.resolve();

  function serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = writeQueue.then(task);
    writeQueue = result.catch(() => undefined);
    return result;
  }

  return {
    async snapshot() {
      const transactions = await adapter.load();
      return { balance: calculateBalance(transactions), transactions: selectRecent(transactions) };
    },

    post(input) {
      return serialize(async (): Promise<PostResult> => {
        const transactions = await adapter.load();
        const transaction: Transaction = { id: randomUUID(), ...input };
        const updated = [...transactions, transaction];
        if (calculateBalance(updated) < 0) return { ok: false, reason: errorReasons.insufficientFunds };
        await adapter.save(updated);
        return { ok: true, transaction };
      });
    },
  };
}
