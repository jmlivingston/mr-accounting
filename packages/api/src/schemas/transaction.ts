import './locale';
import { z } from 'zod/mini';

export const transactionTypes = ['debit', 'credit'] as const;

export const transactionInputSchema = z.object({
  date: z.iso.datetime({ offset: true }),
  amount: z.number().check(z.positive(), z.maximum(1_000_000_000_000)),
  type: z.enum(transactionTypes),
  description: z.string().check(z.trim(), z.minLength(1), z.maxLength(200)),
});

export const transactionSchema = z.extend(transactionInputSchema, {
  id: z.uuid(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
