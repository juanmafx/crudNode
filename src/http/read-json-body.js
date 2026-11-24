import { HttpError } from './http-error.js';

const JSON_MEDIA_TYPE = /^application\/json\s*(;\s*charset=utf-8\s*)?$/i;

function payloadTooLarge() {
  return new HttpError(413, 'payload_too_large', 'The request body is too large.', {
    Connection: 'close',
  });
}

export async function readJsonBody(request, maxBytes) {
  if (!JSON_MEDIA_TYPE.test(request.headers['content-type'] ?? '')) {
    throw new HttpError(415, 'unsupported_media_type', 'Content-Type must be application/json.');
  }
  if (Number(request.headers['content-length'] ?? 0) > maxBytes) {
    throw payloadTooLarge();
  }
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      throw payloadTooLarge();
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request body must be valid UTF-8 JSON.');
  }
}
