import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { config } from '../config';

export function useTempDataDir() {
  const originalDir = config.dataDir;
  beforeEach(async () => {
    config.dataDir = await mkdtemp(path.join(tmpdir(), 'mr-accounting-test-'));
  });
  afterEach(async () => {
    await rm(config.dataDir, { recursive: true, force: true });
    config.dataDir = originalDir;
  });
}
