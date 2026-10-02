import './locale';
import { z } from 'zod/mini';

export const minTransactionAmount = 0.01;
export const maxTransactionAmount = 1_000_000;
export const maxDescriptionLength = 200;

export const maxFutureSkewMs = 5 * 60_000;
export const maxTransactionAgeYears = 1;

export const dateRuleReasons = { future: 'dateInFuture', tooOld: 'dateTooOld' } as const;

export function getTransactionDateRange(now = new Date()) {
  const earliest = new Date(now);
  earliest.setFullYear(now.getFullYear() - maxTransactionAgeYears);
  return { earliest, latest: new Date(now.getTime() + maxFutureSkewMs) };
}

export const transactionTypes = ['debit', 'credit'] as const;

const isoDateTimeSchema = z.iso.datetime({ offset: true });

// Unparseable values are left to the datetime check so they report a single issue
const transactionDateSchema = isoDateTimeSchema.check(
  z.refine(
    (value) => {
      const time = Date.parse(value);
      return Number.isNaN(time) || time <= getTransactionDateRange().latest.getTime();
    },
    { error: 'Date cannot be in the future', params: { reason: dateRuleReasons.future } },
  ),
  z.refine(
    (value) => {
      const time = Date.parse(value);
      return Number.isNaN(time) || time >= getTransactionDateRange().earliest.getTime();
    },
    {
      error: `Date cannot be more than ${maxTransactionAgeYears} year ago`,
      params: { reason: dateRuleReasons.tooOld },
    },
  ),
);

export const transactionInputSchema = z.object({
  date: transactionDateSchema,
  amount: z.number().check(z.minimum(minTransactionAmount), z.maximum(maxTransactionAmount)),
  type: z.enum(transactionTypes),
  description: z.string().check(z.trim(), z.minLength(1), z.maxLength(maxDescriptionLength)),
});

// Stored transactions keep their dates however old they get, so the date rules apply to new input only
export const transactionSchema = z.extend(transactionInputSchema, {
  id: z.uuid(),
  date: isoDateTimeSchema,
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
