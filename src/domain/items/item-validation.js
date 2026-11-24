import { ValidationError } from '../errors.js';

export const MAX_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

const ALLOWED_FIELDS = new Set(['name', 'description']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const NAME_FORBIDDEN = /[\u0000-\u001F\u007F-\u009F]/;
const DESCRIPTION_FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
const PAGE_NUMBER = /^\d{1,7}$/;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateName(value, details) {
  if (typeof value !== 'string' || !value.isWellFormed()) {
    details.push({ field: 'name', message: 'must be a string' });
    return undefined;
  }
  const name = value.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    details.push({ field: 'name', message: `must have 1 to ${MAX_NAME_LENGTH} characters` });
  } else if (NAME_FORBIDDEN.test(name)) {
    details.push({ field: 'name', message: 'must not contain control characters' });
  }
  return name;
}

function validateDescription(value, details) {
  if (typeof value !== 'string' || !value.isWellFormed()) {
    details.push({ field: 'description', message: 'must be a string' });
    return undefined;
  }
  if (value.length > MAX_DESCRIPTION_LENGTH) {
    details.push({
      field: 'description',
      message: `must have at most ${MAX_DESCRIPTION_LENGTH} characters`,
    });
  } else if (DESCRIPTION_FORBIDDEN.test(value)) {
    details.push({ field: 'description', message: 'must not contain control characters' });
  }
  return value;
}

function collectUnknownFields(input, details) {
  for (const field of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(field)) {
      details.push({ field, message: 'is not allowed' });
    }
  }
}

function requireObject(input) {
  if (!isPlainObject(input)) {
    throw new ValidationError([{ field: 'body', message: 'must be a JSON object' }]);
  }
}

export function validateCreateItem(input) {
  requireObject(input);
  const details = [];
  collectUnknownFields(input, details);
  const name = validateName(input.name, details);
  const description = Object.hasOwn(input, 'description')
    ? validateDescription(input.description, details)
    : '';
  if (details.length > 0) {
    throw new ValidationError(details);
  }
  return { name, description };
}

export function validateItemChanges(input) {
  requireObject(input);
  const details = [];
  const changes = {};
  collectUnknownFields(input, details);
  if (Object.hasOwn(input, 'name')) {
    changes.name = validateName(input.name, details);
  }
  if (Object.hasOwn(input, 'description')) {
    changes.description = validateDescription(input.description, details);
  }
  if (details.length === 0 && Object.keys(changes).length === 0) {
    details.push({ field: 'body', message: 'must include name or description' });
  }
  if (details.length > 0) {
    throw new ValidationError(details);
  }
  return changes;
}

export function isItemId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parsePageNumber(rawValue, field, fallback, details) {
  if (rawValue === null) {
    return fallback;
  }
  if (!PAGE_NUMBER.test(rawValue)) {
    details.push({ field, message: 'must be a non-negative integer' });
    return fallback;
  }
  return Number(rawValue);
}

export function validatePagination(searchParams) {
  const details = [];
  const limit = parsePageNumber(searchParams.get('limit'), 'limit', DEFAULT_PAGE_LIMIT, details);
  const offset = parsePageNumber(searchParams.get('offset'), 'offset', 0, details);
  if (limit < 1 || limit > MAX_PAGE_LIMIT) {
    details.push({ field: 'limit', message: `must be between 1 and ${MAX_PAGE_LIMIT}` });
  }
  if (details.length > 0) {
    throw new ValidationError(details);
  }
  return { limit, offset };
}

function isCanonicalTimestamp(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const time = new Date(value);
  return !Number.isNaN(time.getTime()) && time.toISOString() === value;
}

export function isStoredItem(value) {
  if (!isPlainObject(value) || !isItemId(value.id)) {
    return false;
  }
  try {
    validateCreateItem({ name: value.name, description: value.description });
  } catch {
    return false;
  }
  return (
    value.name === value.name.trim() &&
    Object.keys(value).length === 5 &&
    isCanonicalTimestamp(value.createdAt) &&
    isCanonicalTimestamp(value.updatedAt)
  );
}
