import { ItemService } from '../../src/domain/items/item-service.js';
import { createApp } from '../../src/http/create-app.js';
import { createHttpServer } from '../../src/http/create-server.js';
import { RateLimiter } from '../../src/http/rate-limiter.js';
import { ItemRepository } from '../../src/infrastructure/persistence/item-repository.js';

export const TEST_TOKEN = 'test-token-for-automated-suite-only-0001';

export async function startTestServer({ repository = new ItemRepository(), maxRequests = 1000, logError = () => {} } = {}) {
  const server = createHttpServer(
    createApp({
      itemService: new ItemService({ repository }),
      apiToken: TEST_TOKEN,
      rateLimiter: new RateLimiter({ maxRequests, windowMs: 60_000, maxClients: 100 }),
      maxBodyBytes: 1024,
      logError,
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    request(path, { headers = {}, json, ...options } = {}) {
      return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        ...(json === undefined ? {} : { body: JSON.stringify(json) }),
      });
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
