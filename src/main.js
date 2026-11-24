import { loadConfig } from './config/load-config.js';
import { ItemService } from './domain/items/item-service.js';
import { createApp } from './http/create-app.js';
import { createHttpServer } from './http/create-server.js';
import { RateLimiter } from './http/rate-limiter.js';
import { ItemRepository } from './infrastructure/persistence/item-repository.js';
import { createJsonFilePersister, loadItems } from './infrastructure/persistence/json-file-store.js';

function logError(error) {
  console.error(`${error.name}: ${error.message}`);
}

async function start() {
  const config = loadConfig();
  const repository = new ItemRepository({
    items: await loadItems(config.dataFile),
    persist: createJsonFilePersister(config.dataFile),
  });
  const server = createHttpServer(
    createApp({
      itemService: new ItemService({ repository }),
      apiToken: config.apiToken,
      rateLimiter: new RateLimiter(config.rateLimit),
      maxBodyBytes: config.maxBodyBytes,
      logError,
    }),
  );
  const shutDown = () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  };
  process.once('SIGINT', shutDown);
  process.once('SIGTERM', shutDown);
  server.on('error', (error) => {
    logError(error);
    process.exit(1);
  });
  server.listen(config.port, config.host, () => {
    const { address, port } = server.address();
    console.log(`crudNode listening on http://${address}:${port}`);
  });
}

start().catch((error) => {
  logError(error);
  process.exit(1);
});
