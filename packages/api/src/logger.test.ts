import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger', () => {
  it('writes info messages to stdout', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logger.info('started', 3001);
    expect(log).toHaveBeenCalledExactlyOnceWith('started', 3001);
  });

  it('writes errors to stderr', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cause = new Error('boom');
    logger.error('failed:', cause);
    expect(error).toHaveBeenCalledExactlyOnceWith('failed:', cause);
  });
});
