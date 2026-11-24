import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { ItemRepository } from '../../src/infrastructure/persistence/item-repository.js';
import { startTestServer, TEST_TOKEN } from '../helpers/api-harness.js';

const UNKNOWN_ID = '6f1c2f1e-7d43-4e55-9c55-0a4f4f3f7a11';

describe('items API', () => {
  let api;

  before(async () => {
    api = await startTestServer();
  });

  after(() => api.close());

  it('runs the full create, read, update, delete lifecycle', async () => {
    const created = await api.request('/api/v1/items', {
      method: 'POST',
      json: { name: '  Notebook ', description: 'A5' },
    });
    assert.equal(created.status, 201);
    const item = await created.json();
    assert.equal(item.name, 'Notebook');
    assert.equal(created.headers.get('location'), `/api/v1/items/${item.id}`);

    const fetched = await api.request(`/api/v1/items/${item.id}`);
    assert.deepEqual(await fetched.json(), item);

    const patched = await api.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      json: { description: 'A4' },
    });
    assert.equal(patched.status, 200);
    const updated = await patched.json();
    assert.equal(updated.description, 'A4');
    assert.equal(updated.name, 'Notebook');
    assert.equal(updated.createdAt, item.createdAt);

    const deleted = await api.request(`/api/v1/items/${item.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), '');

    const missing = await api.request(`/api/v1/items/${item.id}`);
    assert.equal(missing.status, 404);
  });

  it('paginates the collection', async () => {
    for (const name of ['first', 'second', 'third']) {
      await api.request('/api/v1/items', { method: 'POST', json: { name } });
    }
    const response = await api.request('/api/v1/items?limit=1&offset=1');
    const page = await response.json();
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].name, 'second');
    assert.equal(page.total, 3);
  });

  for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1e3']) {
    it(`rejects invalid pagination: ${query}`, async () => {
      const response = await api.request(`/api/v1/items?${query}`);
      assert.equal(response.status, 400);
    });
  }

  it('requires a bearer token', async () => {
    const response = await fetch(`${api.baseUrl}/api/v1/items`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('www-authenticate'), 'Bearer');
  });

  for (const authorization of [`Bearer ${TEST_TOKEN}x`, `Basic ${TEST_TOKEN}`, 'Bearer ', TEST_TOKEN]) {
    it(`rejects a malformed or wrong credential (${authorization.length} chars)`, async () => {
      const response = await api.request('/api/v1/items', { headers: { Authorization: authorization } });
      assert.equal(response.status, 401);
    });
  }

  it('leaves health open and free of data', async () => {
    const response = await fetch(`${api.baseUrl}/health`);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('sets security headers on success and error responses', async () => {
    for (const response of [await fetch(`${api.baseUrl}/health`), await fetch(`${api.baseUrl}/nope`)]) {
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    }
  });

  it('returns stored markup as inert JSON', async () => {
    const name = '<script>alert(1)</script>';
    const response = await api.request('/api/v1/items', { method: 'POST', json: { name } });
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.equal((await response.json()).name, name);
  });

  it('rejects a non-JSON content type', async () => {
    const response = await api.request('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{"name":"x"}',
    });
    assert.equal(response.status, 415);
  });

  it('rejects malformed JSON', async () => {
    const response = await api.request('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'invalid_json');
  });

  it('rejects invalid UTF-8', async () => {
    const response = await api.request('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from([0x7b, 0xff, 0x7d]),
    });
    assert.equal(response.status, 400);
  });

  it('rejects an oversized body', async () => {
    const response = await api.request('/api/v1/items', {
      method: 'POST',
      json: { name: 'x', description: 'y'.repeat(2048) },
    });
    assert.equal(response.status, 413);
  });

  it('rejects an oversized chunked body', async () => {
    const { port } = new URL(api.baseUrl);
    const raw = await new Promise((resolve, reject) => {
      const socket = connect(Number(port), '127.0.0.1');
      let received = '';
      socket.on('data', (chunk) => {
        received += chunk;
      });
      socket.on('close', () => resolve(received));
      socket.on('error', reject);
      const chunk = 'a'.repeat(2048);
      socket.write(
        `POST /api/v1/items HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${TEST_TOKEN}\r\n` +
          `Content-Type: application/json\r\nTransfer-Encoding: chunked\r\n\r\n` +
          `${chunk.length.toString(16)}\r\n${chunk}\r\n0\r\n\r\n`,
      );
    });
    assert.match(raw, /^HTTP\/1\.1 413 /);
  });

  it('rejects prototype pollution keys', async () => {
    const response = await api.request('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"x","__proto__":{"polluted":true}}',
    });
    assert.equal(response.status, 400);
    assert.equal({}.polluted, undefined);
  });

  it('rejects a malformed id', async () => {
    const response = await api.request('/api/v1/items/not-a-uuid');
    assert.equal(response.status, 400);
  });

  it('returns 404 for an unknown id on every item method', async () => {
    const path = `/api/v1/items/${UNKNOWN_ID}`;
    assert.equal((await api.request(path)).status, 404);
    assert.equal((await api.request(path, { method: 'PATCH', json: { name: 'x' } })).status, 404);
    assert.equal((await api.request(path, { method: 'DELETE' })).status, 404);
  });

  it('returns 404 for nested item paths', async () => {
    const response = await api.request(`/api/v1/items/${UNKNOWN_ID}/extra`);
    assert.equal(response.status, 404);
  });

  it('returns 405 with Allow', async () => {
    const response = await api.request('/api/v1/items', { method: 'PUT' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, POST');
  });
});

describe('API failure handling', () => {
  it('enforces the rate limit before authentication', async () => {
    const api = await startTestServer({ maxRequests: 2 });
    try {
      await api.request('/api/v1/items');
      await api.request('/api/v1/items');
      const limited = await fetch(`${api.baseUrl}/api/v1/items`);
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.headers.get('retry-after')) >= 1);
    } finally {
      await api.close();
    }
  });

  it('hides internal error details', async () => {
    const logged = [];
    const repository = new ItemRepository({
      persist: async () => {
        throw new Error('sensitive internal path');
      },
    });
    const api = await startTestServer({ repository, logError: (error) => logged.push(error) });
    try {
      const response = await api.request('/api/v1/items', { method: 'POST', json: { name: 'x' } });
      assert.equal(response.status, 500);
      assert.doesNotMatch(await response.text(), /sensitive/);
      assert.equal(logged.length, 1);
    } finally {
      await api.close();
    }
  });
});
