import { createServer } from 'node:http';

export function createHttpServer(handler) {
  const server = createServer({ maxHeaderSize: 16 * 1024, connectionsCheckingInterval: 1_000 }, handler);
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 50;
  server.maxConnections = 1_000;
  server.maxRequestsPerSocket = 1_000;
  return server;
}
