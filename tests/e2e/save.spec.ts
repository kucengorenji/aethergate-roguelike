import { expect, test } from '@playwright/test';
import { act, advance, hold, inspect, KIND, openGame, RUN, SANDBOX } from './helpers';

test('save data survives a reload', async ({ page }) => {
  await openGame(page, RUN());
  expect((await inspect(page)).save.shards).toBe(0);
  await act(page, 'setShards', 42);
  // Writes are asynchronous; wait until IndexedDB holds the new value.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open('aethergate', 1);
        req.onsuccess = () => {
          const get = req.result.transaction('save').objectStore('save').get('slot1');
          get.onsuccess = () => {
            resolve((get.result as { shards?: number } | undefined)?.shards === 42);
          };
        };
      }),
  );
  await openGame(page, RUN());
  expect((await inspect(page)).save.shards).toBe(42);
});

test('an open panel stops the player and frees the pointer', async ({ page }) => {
  await openGame(page, RUN());
  const z = (await inspect(page)).player.z;
  await act(page, 'panel', 3);
  await hold(page, 'KeyW', 20);
  let s = await inspect(page);
  expect(s.panel).toBe('shop');
  expect(s.locked).toBe(false);
  expect(s.player.z).toBeCloseTo(z, 3);
  await expect(page.locator('#lock-prompt')).toBeHidden();
  await act(page, 'panel', -1);
  await act(page, 'pointerLock', 1);
  await hold(page, 'KeyW', 20);
  s = await inspect(page);
  expect(s.panel).toBeNull();
  expect(s.player.z).toBeLessThan(z - 1);
});

test('a suspended game simulates nothing', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, 0, 0);
  await advance(page, 5);
  await act(page, 'suspend', 1);
  const before = await inspect(page);
  await advance(page, 60);
  const during = await inspect(page);
  expect(during.enemies[0]!.z).toBe(before.enemies[0]!.z);
  expect(during.elapsed).toBe(before.elapsed);
  await act(page, 'suspend', 0);
  await advance(page, 30);
  expect((await inspect(page)).enemies[0]!.z).toBeGreaterThan(before.enemies[0]!.z);
});
