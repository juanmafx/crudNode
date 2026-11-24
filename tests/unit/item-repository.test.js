import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ItemRepository } from '../../src/infrastructure/persistence/item-repository.js';

const item = (id) => ({ id, name: id, description: '', createdAt: 't', updatedAt: 't' });

describe('ItemRepository', () => {
  it('returns immutable records', async () => {
    const repository = new ItemRepository();
    const stored = await repository.insert(item('a'));
    assert.throws(() => {
      stored.name = 'changed';
    }, TypeError);
  });

  it('keeps state unchanged when persistence fails', async () => {
    const repository = new ItemRepository({
      items: [item('a')],
      persist: async () => {
        throw new Error('disk full');
      },
    });
    await assert.rejects(repository.insert(item('b')));
    await assert.rejects(repository.delete('a'));
    await assert.rejects(repository.update('a', (current) => ({ ...current, name: 'z' })));
    assert.equal(repository.findById('b'), null);
    assert.equal(repository.findById('a').name, 'a');
  });

  it('continues after a failed write', async () => {
    let shouldFail = true;
    const repository = new ItemRepository({
      persist: async () => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('transient');
        }
      },
    });
    await assert.rejects(repository.insert(item('a')));
    await repository.insert(item('b'));
    assert.equal(repository.list({ limit: 10, offset: 0 }).total, 1);
  });

  it('serializes concurrent writes without lost updates', async () => {
    const snapshots = [];
    const repository = new ItemRepository({
      persist: async (items) => {
        await new Promise((resolve) => setImmediate(resolve));
        snapshots.push(items.length);
      },
    });
    await Promise.all(['a', 'b', 'c', 'd'].map((id) => repository.insert(item(id))));
    assert.deepEqual(snapshots, [1, 2, 3, 4]);
    assert.equal(repository.list({ limit: 10, offset: 0 }).total, 4);
  });

  it('reports missing records', async () => {
    const repository = new ItemRepository();
    assert.equal(await repository.update('none', (current) => current), null);
    assert.equal(await repository.delete('none'), false);
  });
});
