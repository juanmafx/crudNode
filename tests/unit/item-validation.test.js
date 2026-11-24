import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../../src/domain/errors.js';
import {
  isItemId,
  isStoredItem,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  validateCreateItem,
  validateItemChanges,
  validatePagination,
} from '../../src/domain/items/item-validation.js';

const ID = '6f1c2f1e-7d43-4e55-9c55-0a4f4f3f7a11';
const TIME = '2026-01-01T00:00:00.000Z';

describe('validateCreateItem', () => {
  it('trims the name and defaults the description', () => {
    assert.deepEqual(validateCreateItem({ name: ' Pen ' }), { name: 'Pen', description: '' });
  });

  it('accepts boundary lengths', () => {
    const input = { name: 'n'.repeat(MAX_NAME_LENGTH), description: 'd'.repeat(MAX_DESCRIPTION_LENGTH) };
    assert.deepEqual(validateCreateItem(input), input);
  });

  it('keeps line breaks in descriptions', () => {
    assert.equal(validateCreateItem({ name: 'x', description: 'a\nb\tc' }).description, 'a\nb\tc');
  });

  for (const [label, input] of [
    ['null', null],
    ['an array', []],
    ['a missing name', {}],
    ['a numeric name', { name: 1 }],
    ['a blank name', { name: '   ' }],
    ['a long name', { name: 'n'.repeat(MAX_NAME_LENGTH + 1) }],
    ['a control character in the name', { name: 'a\u0000b' }],
    ['a lone surrogate', { name: '\ud800' }],
    ['a non-string description', { name: 'x', description: 5 }],
    ['a long description', { name: 'x', description: 'd'.repeat(MAX_DESCRIPTION_LENGTH + 1) }],
    ['a control character in the description', { name: 'x', description: 'a\u0007' }],
    ['an unknown field', { name: 'x', admin: true }],
  ]) {
    it(`rejects ${label}`, () => {
      assert.throws(() => validateCreateItem(input), ValidationError);
    });
  }
});

describe('validateItemChanges', () => {
  it('returns only supplied fields', () => {
    assert.deepEqual(validateItemChanges({ description: 'new' }), { description: 'new' });
  });

  it('rejects an empty change set', () => {
    assert.throws(() => validateItemChanges({}), ValidationError);
  });

  it('rejects immutable fields', () => {
    assert.throws(() => validateItemChanges({ id: ID }), ValidationError);
  });
});

describe('validatePagination', () => {
  it('applies defaults', () => {
    assert.deepEqual(validatePagination(new URLSearchParams()), { limit: 20, offset: 0 });
  });

  it('parses explicit values', () => {
    assert.deepEqual(validatePagination(new URLSearchParams('limit=5&offset=10')), { limit: 5, offset: 10 });
  });
});

describe('identifiers and stored items', () => {
  it('recognizes UUIDs', () => {
    assert.equal(isItemId(ID), true);
    assert.equal(isItemId(ID.toUpperCase()), false);
    assert.equal(isItemId('../etc'), false);
  });

  it('accepts a complete stored item', () => {
    assert.equal(isStoredItem({ id: ID, name: 'x', description: '', createdAt: TIME, updatedAt: TIME }), true);
  });

  for (const [label, item] of [
    ['a bad id', { id: 'x', name: 'x', description: '', createdAt: TIME, updatedAt: TIME }],
    ['an extra field', { id: ID, name: 'x', description: '', createdAt: TIME, updatedAt: TIME, extra: 1 }],
    ['a bad timestamp', { id: ID, name: 'x', description: '', createdAt: 'never', updatedAt: TIME }],
    ['a missing description', { id: ID, name: 'x', createdAt: TIME, updatedAt: TIME }],
  ]) {
    it(`rejects ${label}`, () => {
      assert.equal(isStoredItem(item), false);
    });
  }
});
