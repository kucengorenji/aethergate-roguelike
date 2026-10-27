import { describe, expect, it } from 'vitest';
import { defaultSave, SAVE_VERSION } from './data';
import { memoryStore, openSave } from './store';

describe('openSave', () => {
  it('starts from defaults and writes in order, last write winning', async () => {
    const store = memoryStore();
    const { data, write } = await openSave(store);
    expect(data).toEqual(defaultSave());
    data.shards = 10;
    void write(data);
    data.shards = 20;
    await write(data);
    expect((store.stored as { shards: number }).shards).toBe(20);
  });

  it('writes a snapshot, not a live reference', async () => {
    const store = memoryStore();
    const { data, write } = await openSave(store);
    data.shards = 5;
    await write(data);
    data.shards = 99;
    expect((store.stored as { shards: number }).shards).toBe(5);
  });

  it('never overwrites a save from a newer build', async () => {
    const newer = { version: SAVE_VERSION + 1, shards: 500 };
    const store = memoryStore(newer);
    const { data, write } = await openSave(store);
    await write({ ...data, shards: 1 });
    expect(store.stored).toEqual(newer);
  });

  it('survives a store that fails to load', async () => {
    const { data } = await openSave({
      load: () => Promise.reject(new Error('no')),
      save: () => Promise.resolve(),
    });
    expect(data).toEqual(defaultSave());
  });
});
