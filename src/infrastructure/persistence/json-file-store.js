import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isStoredItem } from '../../domain/items/item-validation.js';

export class CorruptDataFileError extends Error {
  name = 'CorruptDataFileError';
}

export async function loadItems(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  let items;
  try {
    items = JSON.parse(content);
  } catch {
    throw new CorruptDataFileError('The data file is not valid JSON.');
  }
  if (!Array.isArray(items) || !items.every(isStoredItem)) {
    throw new CorruptDataFileError('The data file does not contain valid items.');
  }
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new CorruptDataFileError('The data file contains duplicate item ids.');
  }
  return items;
}

export function createJsonFilePersister(filePath) {
  return async function persist(items) {
    await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temporaryPath, 'wx', 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(items, null, 2)}\n`, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  };
}
