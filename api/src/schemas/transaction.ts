import { z } from 'zod'

export const transactionTypes = ['debit', 'credit'] as const

export const transactionInputSchema = z.object({
  date: z.iso.datetime({ offset: true }),
  amount: z.number().positive().max(1_000_000_000_000),
  type: z.enum(transactionTypes),
  description: z.string().trim().min(1).max(200),
})

export const transactionSchema = transactionInputSchema.extend({
  id: z.uuid(),
})

export type TransactionInput = z.infer<typeof transactionInputSchema>
export type Transaction = z.infer<typeof transactionSchema>
