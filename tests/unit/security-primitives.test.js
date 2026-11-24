import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigError, loadConfig } from '../../src/config/load-config.js';
import { createAuthenticator } from '../../src/http/authenticate.js';
import { HttpError } from '../../src/http/http-error.js';
import { RateLimiter } from '../../src/http/rate-limiter.js';

const TOKEN = 'unit-test-token-with-enough-length-0001';

describe('loadConfig', () => {
  it('binds to loopback by default', () => {
    const config = loadConfig({ API_TOKEN: TOKEN });
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.port, 3000);
  });

  for (const env of [{}, { API_TOKEN: 'short' }, { API_TOKEN: `${TOKEN} space` }]) {
    it(`refuses an unusable token (${Object.keys(env).length ? env.API_TOKEN.length : 0} chars)`, () => {
      assert.throws(() => loadConfig(env), ConfigError);
    });
  }

  for (const PORT of ['70000', 'abc', '-1']) {
    it(`refuses port ${PORT}`, () => {
      assert.throws(() => loadConfig({ API_TOKEN: TOKEN, PORT }), ConfigError);
    });
  }
});

describe('authenticator', () => {
  const authenticate = createAuthenticator(TOKEN);

  it('accepts the configured token', () => {
    assert.doesNotThrow(() => authenticate(`Bearer ${TOKEN}`));
  });

  for (const header of [undefined, '', 'Bearer', `bearer ${TOKEN}`, `Bearer ${TOKEN} extra`, 'Bearer wrong']) {
    it(`rejects header variant ${JSON.stringify(header?.replace(TOKEN, '<token>'))}`, () => {
      assert.throws(() => authenticate(header), (error) => error instanceof HttpError && error.status === 401);
    });
  }
});

describe('RateLimiter', () => {
  it('blocks after the limit and resets after the window', () => {
    let now = 0;
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000, maxClients: 10, now: () => now });
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').allowed, false);
    assert.equal(limiter.check('b').allowed, true);
    now = 1000;
    assert.equal(limiter.check('a').allowed, true);
  });

  it('fails closed when client tracking is full', () => {
    let now = 0;
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000, maxClients: 1, now: () => now });
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('b').allowed, false);
    now = 1000;
    assert.equal(limiter.check('b').allowed, true);
  });
});
