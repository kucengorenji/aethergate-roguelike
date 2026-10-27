import { migrate, type SaveData } from './data';

/** Where save data lives. The record is opaque until `migrate` checks it. */
export interface SaveStore {
  load(): Promise<unknown>;
  save(data: SaveData): Promise<void>;
}

/** Browser storage: one record in an IndexedDB object store. */
export function indexedDbStore(name = 'aethergate'): SaveStore {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('save');
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = () => {
        reject(req.error ?? new Error('IndexedDB open failed'));
      };
    });
  const run = <T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>) =>
    open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const req = op(db.transaction('save', mode).objectStore('save'));
          req.onsuccess = () => {
            resolve(req.result);
            db.close();
          };
          req.onerror = () => {
            reject(req.error ?? new Error('IndexedDB request failed'));
            db.close();
          };
        }),
    );
  return {
    load: () => run('readonly', (s) => s.get('slot1') as IDBRequest<unknown>),
    save: (data) => run('readwrite', (s) => s.put(data, 'slot1')).then(() => undefined),
  };
}

export function memoryStore(initial?: unknown): SaveStore & { stored: unknown } {
  const store = {
    stored: initial,
    load: () => Promise.resolve(store.stored),
    save: (data: SaveData) => {
      store.stored = structuredClone(data);
      return Promise.resolve();
    },
  };
  return store;
}

/**
 * Loads and checks the save, and returns a writer that keeps writes in order
 * (each waits for the previous one), so the last change always wins. A record
 * from a newer build is never overwritten: writes become no-ops.
 */
export async function openSave(
  store: SaveStore,
): Promise<{ data: SaveData; write: (d: SaveData) => Promise<void> }> {
  let raw: unknown;
  try {
    raw = await store.load();
  } catch {
    raw = undefined;
  }
  const migrated = migrate(raw);
  const readOnly = migrated === null;
  const data = migrated ?? migrate(undefined)!;
  let chain = Promise.resolve();
  const write = (d: SaveData) => {
    if (readOnly) return chain;
    const snapshot = structuredClone(d);
    chain = chain.then(() => store.save(snapshot)).catch(() => undefined);
    return chain;
  };
  return { data, write };
}
