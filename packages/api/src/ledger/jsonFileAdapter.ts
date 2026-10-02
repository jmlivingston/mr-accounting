import { z } from 'zod/mini';
import { files } from '../config';
import { transactionSchema } from '../schemas/transaction';
import { readJsonFile, writeJsonFile } from '../storage/jsonFile';
import type { LedgerAdapter } from './ledger';

const transactionsFileSchema = z.object({
  transactions: z.array(transactionSchema),
});

export function createJsonFileLedgerAdapter(): LedgerAdapter {
  return {
    async load() {
      const { transactions } = await readJsonFile(files.transactions, transactionsFileSchema, { transactions: [] });
      return transactions;
    },
    async save(transactions) {
      await writeJsonFile(files.transactions, { transactions });
    },
  };
}
