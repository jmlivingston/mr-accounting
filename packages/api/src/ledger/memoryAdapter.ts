import type { Transaction } from '../schemas/transaction';
import type { LedgerAdapter } from './ledger';

export function createMemoryLedgerAdapter(initial: Transaction[] = []): LedgerAdapter {
  let stored = [...initial];
  return {
    load: () => Promise.resolve([...stored]),
    save(transactions) {
      stored = [...transactions];
      return Promise.resolve();
    },
  };
}
