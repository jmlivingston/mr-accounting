import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, type $ZodType, type output } from 'zod/v4/core';
import { config } from '../config';

export async function readJsonFile<S extends $ZodType>(
  fileName: string,
  schema: S,
  fallback: output<S>,
): Promise<output<S>> {
  try {
    const content = await readFile(path.join(config.dataDir, fileName), 'utf8');
    return parse(schema, JSON.parse(content));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJsonFile(fileName: string, data: unknown) {
  await mkdir(config.dataDir, { recursive: true });
  const targetPath = path.join(config.dataDir, fileName);
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(data, null, 2));
  await rename(temporaryPath, targetPath);
}
