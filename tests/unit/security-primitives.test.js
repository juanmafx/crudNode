import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigError, loadConfig } from '../../src/config/load-config.js';
import { createAuthenticator } from '../../src/http/authenticate.js';
import { createHttpServer } from '../../src/http/create-server.js';
import { HttpError } from '../../src/http/http-error.js';
import { RateLimiter, toClientKey } from '../../src/http/rate-limiter.js';

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

describe('createHttpServer', () => {
  it('caps concurrent connections and enforces timeouts', () => {
    const server = createHttpServer(() => {});
    assert.equal(server.maxConnections, 1000);
    assert.equal(server.requestTimeout, 15_000);
    assert.equal(server.headersTimeout, 10_000);
  });
});

describe('toClientKey', () => {
  for (const [address, expected] of [
    [undefined, 'unknown'],
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64'],
    ['2001:db8:1:2::9', '2001:db8:1:2::/64'],
    ['2001:DB8:0001:2::9', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['fe80::1%eth0', 'fe80:0:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['::', '0:0:0:0::/64'],
    ['64:ff9b::192.0.2.1', '64:ff9b:0:0::/64'],
  ]) {
    it(`maps ${address} to ${expected}`, () => {
      assert.equal(toClientKey(address), expected);
    });
  }

  it('applies one budget across a rotating IPv6 /64', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000, maxClients: 10 });
    assert.equal(limiter.check(toClientKey('2001:db8:1:2::1')).allowed, true);
    assert.equal(limiter.check(toClientKey('2001:db8:1:2::2')).allowed, false);
    assert.equal(limiter.check(toClientKey('2001:db8:1:3::1')).allowed, true);
  });
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
