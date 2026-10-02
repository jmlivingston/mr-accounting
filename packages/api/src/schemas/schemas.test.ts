import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginInputSchema } from './auth';
import {
  dateRuleReasons,
  maxDescriptionLength,
  maxFutureSkewMs,
  maxTransactionAmount,
  minTransactionAmount,
  transactionInputSchema,
  transactionSchema,
} from './transaction';

const validTransaction = {
  date: '2026-01-01T00:00:00Z',
  amount: 25.5,
  type: 'debit',
  description: 'Coffee',
};

const now = new Date('2026-06-01T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

function dateIssueReasons(date: string): unknown[] {
  const result = transactionInputSchema.safeParse({ ...validTransaction, date });
  const issues = result.error?.issues ?? [];
  return issues.map((issue): unknown => (issue.code === 'custom' ? issue.params?.reason : issue.code));
}

describe('transaction date rules', () => {
  it('accepts the current time', () => {
    expect(dateIssueReasons(now.toISOString())).toEqual([]);
  });

  it('accepts a date within the clock skew allowance', () => {
    expect(dateIssueReasons(new Date(now.getTime() + maxFutureSkewMs).toISOString())).toEqual([]);
  });

  it('rejects a date beyond the clock skew allowance', () => {
    expect(dateIssueReasons(new Date(now.getTime() + maxFutureSkewMs + 1000).toISOString())).toEqual([
      dateRuleReasons.future,
    ]);
  });

  it('rejects a date in the far future', () => {
    expect(dateIssueReasons('2030-01-01T00:00:00Z')).toEqual([dateRuleReasons.future]);
  });

  it('accepts a date exactly one year ago', () => {
    expect(dateIssueReasons('2025-06-01T12:00:00Z')).toEqual([]);
  });

  it('rejects a date just over one year ago', () => {
    expect(dateIssueReasons('2025-06-01T11:59:59Z')).toEqual([dateRuleReasons.tooOld]);
  });

  it('compares across time zone offsets', () => {
    expect(dateIssueReasons('2026-06-01T05:00:00-07:00')).toEqual([]);
    expect(dateIssueReasons('2026-06-01T12:30:00-07:00')).toEqual([dateRuleReasons.future]);
  });

  it('reports only the format issue for an unparseable date', () => {
    expect(dateIssueReasons('yesterday')).toEqual(['invalid_format']);
  });
});

describe('transactionInputSchema', () => {
  it('accepts a valid transaction', () => {
    expect(transactionInputSchema.safeParse(validTransaction).success).toBe(true);
  });

  it('accepts datetimes with an offset', () => {
    const result = transactionInputSchema.safeParse({ ...validTransaction, date: '2026-01-01T10:00:00-07:00' });
    expect(result.success).toBe(true);
  });

  it('trims the description', () => {
    const result = transactionInputSchema.parse({ ...validTransaction, description: '  Lunch  ' });
    expect(result.description).toBe('Lunch');
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -5 }],
    ['non-numeric amount', { amount: '5' }],
    ['unknown type', { type: 'refund' }],
    ['blank description', { description: '   ' }],
    ['overlong description', { description: 'x'.repeat(maxDescriptionLength + 1) }],
    ['non-ISO date', { date: 'yesterday' }],
    ['date without time', { date: '2026-01-01' }],
  ])('rejects %s', (_name, override) => {
    expect(transactionInputSchema.safeParse({ ...validTransaction, ...override }).success).toBe(false);
  });

  it('allows a description of exactly the maximum length', () => {
    const description = 'x'.repeat(maxDescriptionLength);
    expect(transactionInputSchema.safeParse({ ...validTransaction, description }).success).toBe(true);
  });

  it('allows an amount of exactly the minimum', () => {
    const result = transactionInputSchema.safeParse({ ...validTransaction, amount: minTransactionAmount });
    expect(result.success).toBe(true);
  });

  it('rejects an amount below the minimum', () => {
    const result = transactionInputSchema.safeParse({ ...validTransaction, amount: minTransactionAmount / 2 });
    expect(result.success).toBe(false);
  });

  it('allows an amount of exactly the maximum', () => {
    const result = transactionInputSchema.safeParse({ ...validTransaction, amount: maxTransactionAmount });
    expect(result.success).toBe(true);
  });

  it('rejects an amount above the maximum', () => {
    const result = transactionInputSchema.safeParse({ ...validTransaction, amount: maxTransactionAmount + 1 });
    expect(result.success).toBe(false);
  });

  it('reports readable English messages', () => {
    const result = transactionInputSchema.safeParse({ ...validTransaction, amount: maxTransactionAmount * 2 });
    expect(result.error?.issues[0]?.message).toBe(`Too big: expected number to be <=${maxTransactionAmount}`);
  });
});

describe('transactionSchema', () => {
  it('accepts stored transactions of any age', () => {
    const id = '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69';
    expect(transactionSchema.safeParse({ ...validTransaction, id, date: '2015-01-01T00:00:00Z' }).success).toBe(true);
  });

  it('requires a UUID id', () => {
    expect(transactionSchema.safeParse({ ...validTransaction, id: 'nope' }).success).toBe(false);
    const id = '3f2b8c1e-5d4a-4f6b-9a7c-1e2d3c4b5a69';
    expect(transactionSchema.safeParse({ ...validTransaction, id }).success).toBe(true);
  });
});

describe('loginInputSchema', () => {
  it('accepts a username and password', () => {
    expect(loginInputSchema.safeParse({ username: 'a', password: 'b' }).success).toBe(true);
  });

  it.each([
    ['empty username', { username: '', password: 'b' }],
    ['empty password', { username: 'a', password: '' }],
    ['overlong username', { username: 'a'.repeat(101), password: 'b' }],
    ['overlong password', { username: 'a', password: 'b'.repeat(201) }],
    ['missing password', { username: 'a' }],
  ])('rejects %s', (_name, input) => {
    expect(loginInputSchema.safeParse(input).success).toBe(false);
  });
});
