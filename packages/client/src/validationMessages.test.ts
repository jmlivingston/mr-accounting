import { maxDescriptionLength, transactionInputSchema } from 'api/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { content } from './content/content';
import { getIssueMessage } from './validationMessages';

const valid = { date: '2026-01-01T00:00:00.000Z', amount: 5, type: 'debit', description: 'Coffee' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime('2026-06-01T12:00:00Z');
});

afterEach(() => {
  vi.useRealTimers();
});

function messagesFor(override: Record<string, unknown>) {
  const result = transactionInputSchema.safeParse({ ...valid, ...override });
  return result.error?.issues.map((issue) => getIssueMessage(issue)) ?? [];
}

describe('getIssueMessage', () => {
  it('describes an amount below the minimum with the formatted limit', () => {
    expect(messagesFor({ amount: 0 })).toEqual(['Amount must be at least $0.01']);
  });

  it('describes an amount above the maximum with the formatted limit', () => {
    expect(messagesFor({ amount: 1_000_001 })).toEqual(['Amount must be at most $1,000,000.00']);
  });

  it('describes a non-numeric amount', () => {
    expect(messagesFor({ amount: Number.NaN })).toEqual([content.validation.amount.invalid]);
  });

  it('describes an invalid date', () => {
    expect(messagesFor({ date: 'tomorrow' })).toEqual([content.validation.date.invalid]);
  });

  it('describes a date in the future', () => {
    expect(messagesFor({ date: '2026-06-02T00:00:00.000Z' })).toEqual([content.validation.date.future]);
  });

  it('describes a date more than a year ago', () => {
    expect(messagesFor({ date: '2025-05-31T00:00:00.000Z' })).toEqual([content.validation.date.tooOld]);
  });

  it('describes an invalid type', () => {
    expect(messagesFor({ type: 'refund' })).toEqual([content.validation.type.invalid]);
  });

  it('asks for a description when it is blank', () => {
    expect(messagesFor({ description: '   ' })).toEqual([content.validation.description.required]);
  });

  it('describes an overlong description with the limit', () => {
    expect(messagesFor({ description: 'x'.repeat(maxDescriptionLength + 1) })).toEqual([
      `Description must be at most ${maxDescriptionLength} characters`,
    ]);
  });

  it('falls back to a generic message for unknown fields', () => {
    expect(getIssueMessage({ path: ['other'], code: 'custom' })).toBe(content.validation.fallback);
    expect(getIssueMessage({ path: [], code: 'custom' })).toBe(content.validation.fallback);
  });

  it('never uses the schema English text', () => {
    const messages = messagesFor({ amount: -1, date: 'x', type: 'z', description: '' });
    expect(messages).toHaveLength(4);
    for (const message of messages) expect(message).not.toMatch(/Invalid|Too (big|small)|expected/);
  });
});
