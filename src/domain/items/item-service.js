import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '../errors.js';
import { isItemId, validateCreateItem, validateItemChanges } from './item-validation.js';

export class ItemService {
  #repository;
  #now;
  #generateId;

  constructor({ repository, now = () => new Date(), generateId = randomUUID }) {
    this.#repository = repository;
    this.#now = now;
    this.#generateId = generateId;
  }

  async create(input) {
    const fields = validateCreateItem(input);
    const timestamp = this.#now().toISOString();
    return this.#repository.insert({
      id: this.#generateId(),
      ...fields,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  list(pagination) {
    return this.#repository.list(pagination);
  }

  get(id) {
    this.#requireId(id);
    const item = this.#repository.findById(id);
    if (!item) {
      throw new NotFoundError();
    }
    return item;
  }

  async update(id, input) {
    this.#requireId(id);
    const changes = validateItemChanges(input);
    const updated = await this.#repository.update(id, (current) => ({
      ...current,
      ...changes,
      updatedAt: this.#now().toISOString(),
    }));
    if (!updated) {
      throw new NotFoundError();
    }
    return updated;
  }

  async remove(id) {
    this.#requireId(id);
    if (!(await this.#repository.delete(id))) {
      throw new NotFoundError();
    }
  }

  #requireId(id) {
    if (!isItemId(id)) {
      throw new ValidationError([{ field: 'id', message: 'must be a UUID' }]);
    }
  }
}
