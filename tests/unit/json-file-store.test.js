import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  CorruptDataFileError,
  createJsonFilePersister,
  loadItems,
} from '../../src/infrastructure/persistence/json-file-store.js';

const ITEM = {
  id: '6f1c2f1e-7d43-4e55-9c55-0a4f4f3f7a11',
  name: 'Notebook',
  description: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('JSON file store', () => {
  let directory;

  before(async () => {
    directory = await mkdtemp(join(tmpdir(), 'crud-node-'));
  });

  after(() => rm(directory, { recursive: true, force: true }));

  it('returns no items when the file is missing', async () => {
    assert.deepEqual(await loadItems(join(directory, 'missing.json')), []);
  });

  it('round-trips items with owner-only permissions and no temp files', async () => {
    const nested = join(directory, 'nested');
    const filePath = join(nested, 'items.json');
    await createJsonFilePersister(filePath)([ITEM]);
    assert.deepEqual(await loadItems(filePath), [ITEM]);
    assert.equal((await stat(filePath)).mode & 0o777, 0o600);
    assert.deepEqual(await readdir(nested), ['items.json']);
    assert.ok((await readFile(filePath, 'utf8')).endsWith('\n'));
  });

  for (const [label, content] of [
    ['invalid JSON', '{'],
    ['a non-array', '{}'],
    ['an invalid item', '[{"id":"x"}]'],
    ['duplicate ids', JSON.stringify([ITEM, ITEM])],
  ]) {
    it(`rejects ${label}`, async () => {
      const filePath = join(directory, 'corrupt.json');
      await writeFile(filePath, content);
      await assert.rejects(loadItems(filePath), CorruptDataFileError);
    });
  }
});
