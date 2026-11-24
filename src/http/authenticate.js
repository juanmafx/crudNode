import { createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http-error.js';

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9._~+/=-]+)$/;

function digest(value) {
  return createHash('sha256').update(value).digest();
}

export function createAuthenticator(apiToken) {
  const expected = digest(apiToken);
  return function authenticate(authorizationHeader) {
    const match = BEARER_PATTERN.exec(authorizationHeader ?? '');
    const provided = digest(match?.[1] ?? '');
    if (!timingSafeEqual(provided, expected) || !match) {
      throw new HttpError(401, 'unauthorized', 'A valid bearer token is required.', {
        'WWW-Authenticate': 'Bearer',
      });
    }
  };
}
