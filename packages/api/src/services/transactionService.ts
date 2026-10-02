import { randomUUID } from 'node:crypto';
import { z } from 'zod/mini';
import { files, limits } from '../config';
import { transactionSchema, type Transaction, type TransactionInput } from '../schemas/transaction';
import { readJsonFile, writeJsonFile } from '../storage/jsonFile';

const transactionsFileSchema = z.object({
  transactions: z.array(transactionSchema),
});

export class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient funds: this transaction would result in a negative balance');
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task);
  writeQueue = result.catch(() => undefined);
  return result;
}

async function readTransactions() {
  const { transactions } = await readJsonFile(files.transactions, transactionsFileSchema, { transactions: [] });
  return transactions;
}

function calculateBalance(transactions: Transaction[]) {
  const total = transactions.reduce((sum, { amount, type }) => sum + (type === 'credit' ? amount : -amount), 0);
  return Math.round(total * 100) / 100;
}

export async function getBalance() {
  return calculateBalance(await readTransactions());
}

export async function getRecentTransactions() {
  const transactions = await readTransactions();
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => Date.parse(b.transaction.date) - Date.parse(a.transaction.date) || b.index - a.index)
    .slice(0, limits.recentTransactions)
    .map(({ transaction }) => transaction);
}

export function addTransaction(input: TransactionInput) {
  return serialize(async () => {
    const transactions = await readTransactions();
    const transaction: Transaction = { id: randomUUID(), ...input };
    const updated = [...transactions, transaction];
    if (calculateBalance(updated) < 0) throw new InsufficientFundsError();
    await writeJsonFile(files.transactions, { transactions: updated });
    return transaction;
  });
}
