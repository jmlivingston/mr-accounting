import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ZodType } from 'zod';
import { config } from '../config';

export async function readJsonFile<T>(fileName: string, schema: ZodType<T>, fallback: T): Promise<T> {
  try {
    const content = await readFile(path.join(config.dataDir, fileName), 'utf8');
    return schema.parse(JSON.parse(content));
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
