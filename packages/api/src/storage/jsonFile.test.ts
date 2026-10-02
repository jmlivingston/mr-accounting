import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { config } from '../config';
import { useTempDataDir } from '../test/tempDataDir';
import { readJsonFile, writeJsonFile } from './jsonFile';

const schema = z.object({ items: z.array(z.string()) });

useTempDataDir();

describe('jsonFile', () => {
  it('returns the fallback when the file does not exist', async () => {
    expect(await readJsonFile('missing.json', schema, { items: ['fallback'] })).toEqual({ items: ['fallback'] });
  });

  it('round-trips data through write and read', async () => {
    await writeJsonFile('data.json', { items: ['a', 'b'] });
    expect(await readJsonFile('data.json', schema, { items: [] })).toEqual({ items: ['a', 'b'] });
  });

  it('creates the data directory when it is missing', async () => {
    config.dataDir = path.join(config.dataDir, 'nested', 'dir');
    await writeJsonFile('data.json', { items: [] });
    expect(JSON.parse(await readFile(path.join(config.dataDir, 'data.json'), 'utf8'))).toEqual({ items: [] });
  });

  it('leaves no temporary files behind', async () => {
    await writeJsonFile('data.json', { items: [] });
    expect(await readdir(config.dataDir)).toEqual(['data.json']);
  });

  it('rejects content that does not match the schema', async () => {
    await writeFile(path.join(config.dataDir, 'bad.json'), JSON.stringify({ items: [1] }));
    await expect(readJsonFile('bad.json', schema, { items: [] })).rejects.toThrow();
  });

  it('rejects malformed JSON instead of using the fallback', async () => {
    await writeFile(path.join(config.dataDir, 'broken.json'), '{ not json');
    await expect(readJsonFile('broken.json', schema, { items: [] })).rejects.toThrow(SyntaxError);
  });
});
