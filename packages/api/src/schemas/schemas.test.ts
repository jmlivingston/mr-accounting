import { describe, expect, it } from 'vitest';
import { loginInputSchema } from './auth';
import {
  maxDescriptionLength,
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
