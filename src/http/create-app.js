import { NotFoundError, ValidationError } from '../domain/errors.js';
import { validatePagination } from '../domain/items/item-validation.js';
import { createAuthenticator } from './authenticate.js';
import { HttpError } from './http-error.js';
import { readJsonBody } from './read-json-body.js';

const ITEMS_PATH = '/api/v1/items';
const SECURITY_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
});

function sendJson(response, status, payload, headers = {}) {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    ...(payload === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
    ...headers,
  });
  response.end(body);
}

function methodNotAllowed(allowedMethods) {
  return new HttpError(405, 'method_not_allowed', 'The method is not allowed.', {
    Allow: allowedMethods,
  });
}

function notFound() {
  return new HttpError(404, 'not_found', 'The resource was not found.');
}

function toErrorResponse(error) {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      headers: {},
      body: { code: 'validation_failed', message: error.message, details: error.details },
    };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, headers: {}, body: { code: 'not_found', message: error.message } };
  }
  if (error instanceof HttpError) {
    return {
      status: error.status,
      headers: error.headers,
      body: { code: error.code, message: error.message },
    };
  }
  return null;
}

export function createApp({ itemService, apiToken, rateLimiter, maxBodyBytes, logError }) {
  const authenticate = createAuthenticator(apiToken);

  async function handleCollection(request, response, searchParams) {
    if (request.method === 'GET') {
      sendJson(response, 200, itemService.list(validatePagination(searchParams)));
    } else if (request.method === 'POST') {
      const item = await itemService.create(await readJsonBody(request, maxBodyBytes));
      sendJson(response, 201, item, { Location: `${ITEMS_PATH}/${item.id}` });
    } else {
      throw methodNotAllowed('GET, POST');
    }
  }

  async function handleItem(request, response, id) {
    if (request.method === 'GET') {
      sendJson(response, 200, itemService.get(id));
    } else if (request.method === 'PATCH') {
      const body = await readJsonBody(request, maxBodyBytes);
      sendJson(response, 200, await itemService.update(id, body));
    } else if (request.method === 'DELETE') {
      await itemService.remove(id);
      sendJson(response, 204);
    } else {
      throw methodNotAllowed('GET, PATCH, DELETE');
    }
  }

  async function route(request, response) {
    const url = request.url ?? '/';
    const queryStart = url.indexOf('?');
    const path = queryStart === -1 ? url : url.slice(0, queryStart);
    const query = queryStart === -1 ? '' : url.slice(queryStart + 1);
    if (path === '/health') {
      if (request.method !== 'GET') {
        throw methodNotAllowed('GET');
      }
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (path !== ITEMS_PATH && !path.startsWith(`${ITEMS_PATH}/`)) {
      throw notFound();
    }
    const limit = rateLimiter.check(request.socket.remoteAddress ?? 'unknown');
    if (!limit.allowed) {
      throw new HttpError(429, 'rate_limited', 'Too many requests.', {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }
    authenticate(request.headers.authorization);
    if (path === ITEMS_PATH) {
      await handleCollection(request, response, new URLSearchParams(query));
      return;
    }
    const id = path.slice(ITEMS_PATH.length + 1);
    if (id.includes('/')) {
      throw notFound();
    }
    await handleItem(request, response, id);
  }

  return async function handleRequest(request, response) {
    try {
      await route(request, response);
    } catch (error) {
      if (response.headersSent || response.destroyed) {
        response.destroy();
        return;
      }
      const mapped = toErrorResponse(error);
      if (mapped) {
        sendJson(response, mapped.status, { error: mapped.body }, mapped.headers);
        return;
      }
      logError(error);
      sendJson(response, 500, {
        error: { code: 'internal_error', message: 'An unexpected error occurred.' },
      });
    }
  };
}
