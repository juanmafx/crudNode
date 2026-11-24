export class ItemRepository {
  #items;
  #persist;
  #queue = Promise.resolve();

  constructor({ items = [], persist = async () => {} } = {}) {
    this.#items = new Map(items.map((item) => [item.id, Object.freeze({ ...item })]));
    this.#persist = persist;
  }

  list({ limit, offset }) {
    const items = [...this.#items.values()].slice(offset, offset + limit);
    return { items, total: this.#items.size, limit, offset };
  }

  findById(id) {
    return this.#items.get(id) ?? null;
  }

  insert(item) {
    return this.#enqueue(async () => {
      const stored = Object.freeze({ ...item });
      await this.#commit(new Map(this.#items).set(stored.id, stored));
      return stored;
    });
  }

  update(id, applyChanges) {
    return this.#enqueue(async () => {
      const current = this.#items.get(id);
      if (!current) {
        return null;
      }
      const stored = Object.freeze(applyChanges(current));
      await this.#commit(new Map(this.#items).set(id, stored));
      return stored;
    });
  }

  delete(id) {
    return this.#enqueue(async () => {
      if (!this.#items.has(id)) {
        return false;
      }
      const next = new Map(this.#items);
      next.delete(id);
      await this.#commit(next);
      return true;
    });
  }

  async #commit(next) {
    await this.#persist([...next.values()]);
    this.#items = next;
  }

  #enqueue(operation) {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => {});
    return result;
  }
}
