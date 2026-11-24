const MIN_TOKEN_LENGTH = 32;
const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;

export class ConfigError extends Error {
  name = 'ConfigError';
}

function parsePort(rawPort) {
  if (rawPort === undefined || rawPort === '') {
    return DEFAULT_PORT;
  }
  if (!/^\d{1,5}$/.test(rawPort) || Number(rawPort) > MAX_PORT) {
    throw new ConfigError(`PORT must be an integer between 0 and ${MAX_PORT}.`);
  }
  return Number(rawPort);
}

export function loadConfig(env = process.env) {
  const apiToken = env.API_TOKEN ?? '';
  if (apiToken.length < MIN_TOKEN_LENGTH || !/^[A-Za-z0-9._~+/=-]+$/.test(apiToken)) {
    throw new ConfigError(
      `API_TOKEN is required, must have at least ${MIN_TOKEN_LENGTH} characters, and must use bearer token characters.`,
    );
  }
  return Object.freeze({
    apiToken,
    host: env.HOST || '127.0.0.1',
    port: parsePort(env.PORT),
    dataFile: env.DATA_FILE || 'data/items.json',
    maxBodyBytes: 64 * 1024,
    rateLimit: Object.freeze({ maxRequests: 120, windowMs: 60_000, maxClients: 10_000 }),
  });
}
