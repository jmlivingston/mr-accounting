import './locale';
import { z } from 'zod/mini';

export const minTransactionAmount = 0.01;
export const maxTransactionAmount = 1_000_000;
export const maxDescriptionLength = 200;

export const transactionTypes = ['debit', 'credit'] as const;

export const transactionInputSchema = z.object({
  date: z.iso.datetime({ offset: true }),
  amount: z.number().check(z.minimum(minTransactionAmount), z.maximum(maxTransactionAmount)),
  type: z.enum(transactionTypes),
  description: z.string().check(z.trim(), z.minLength(1), z.maxLength(maxDescriptionLength)),
});

export const transactionSchema = z.extend(transactionInputSchema, {
  id: z.uuid(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
