import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';

const schema = readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8');
const sqliteAvailable = spawnSync('sqlite3', ['--version']).status === 0;
const skip = sqliteAvailable ? false : 'sqlite3 CLI is not installed';
const ID = '6f1c2f1e-7d43-4e55-9c55-0a4f4f3f7a11';
const TIME = '2026-01-01T00:00:00.000Z';

function runSql(statements) {
  return execFileSync('sqlite3', [':memory:'], {
    input: `${schema}\n${statements}`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

it('applies the schema and stores a valid item', { skip }, () => {
  const output = runSql(
    `INSERT INTO items VALUES ('${ID}', 'Notebook', '', '${TIME}', '${TIME}');\nSELECT count(*) FROM items;`,
  );
  assert.equal(output.trim(), '1');
});

it('is idempotent', { skip }, () => {
  assert.doesNotThrow(() => runSql(schema));
});

for (const [label, values] of [
  ['an empty name', `'${ID}', '', '', '${TIME}', '${TIME}'`],
  ['an untrimmed name', `'${ID}', ' x', '', '${TIME}', '${TIME}'`],
  ['a short id', `'short', 'x', '', '${TIME}', '${TIME}'`],
  ['an invalid timestamp', `'${ID}', 'x', '', 'never', '${TIME}'`],
  ['updated before created', `'${ID}', 'x', '', '${TIME}', '2025-01-01T00:00:00.000Z'`],
]) {
  it(`rejects ${label}`, { skip }, () => {
    assert.throws(() => runSql(`.bail on\nINSERT INTO items VALUES (${values});`));
  });
}
