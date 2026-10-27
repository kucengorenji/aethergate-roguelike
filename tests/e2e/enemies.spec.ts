import { expect, test } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  ENCOUNTER,
  holdFire,
  inspect,
  KIND,
  openGame,
  SANDBOX,
  type Snapshot,
} from './helpers';

const CENTER_Y = 0.9;
const enemyDistance = (s: Snapshot, i = 0) =>
  Math.hypot(s.enemies[i]!.x - s.player.x, s.enemies[i]!.z - s.player.z);

test('waves wait for the pointer lock', async ({ page }) => {
  await openGame(page, ENCOUNTER, { lock: false });
  await advance(page, 200);
  let s = await inspect(page);
  expect(s.encounter.status).toBe('waiting');
  expect(s.enemies).toHaveLength(0);
  await act(page, 'pointerLock', 1);
  await advance(page, 100);
  expect((await inspect(page)).enemies).toHaveLength(0);
  await advance(page, 30);
  s = await inspect(page);
  expect(s.encounter.status).toBe('active');
  expect(s.enemies.length).toBeGreaterThan(0);
  expect(s.enemies.every((e) => e.state === 'rising')).toBe(true);
  await expect(page.locator('#wave')).toHaveText('Wave 1 / 3');
});

test('rising enemies are untouchable', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, 0, 8, 1);
  await act(page, 'aimAt', 0, 1.2, 8);
  await holdFire(page, 1);
  await advance(page, 20);
  let s = await inspect(page);
  expect(s.enemies[0]!.state).toBe('rising');
  expect(s.enemies[0]!.health).toBe(40);
  expect(s.enemies[0]!.z).toBeCloseTo(8, 5);
  await advance(page, 40);
  s = await inspect(page);
  expect(s.enemies[0]!.state).toBe('chase');
});

test('soldiers telegraph before they hit', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, 0, 11.5);
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'windup', 60);
  const hitAfter = await advanceUntil(page, (s) => s.health < 100, 60);
  // The hit lands when the 0.5 s (30 step) wind-up ends.
  expect(hitAfter).toBeGreaterThanOrEqual(24);
  expect((await inspect(page)).health).toBe(88);
});

test('dodging a lunge avoids damage', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, 0, 12.2);
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'windup', 60);
  await advance(page, 18);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('Space');
  await advance(page, 30);
  await page.keyboard.up('KeyD');
  expect((await inspect(page)).health).toBe(100);
});

test('casters keep their distance', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.caster, 0, 10);
  await advance(page, 180);
  expect(enemyDistance(await inspect(page))).toBeGreaterThan(7);
});

test('knight shields block from the front', async ({ page }) => {
  test.slow(); // four phases of setup, shots and checks
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'spawnEnemy', KIND.knight, 0, 6);
  await act(page, 'aimAt', 0, 1.3, 6);
  await holdFire(page, 1);
  await advance(page, 16);
  expect((await inspect(page)).enemies[0]!.health).toBe(120);

  // Turned away, the same bolt lands in its back.
  await act(page, 'setEnemyFacing', 0, 0);
  await holdFire(page, 1);
  await advance(page, 16);
  expect((await inspect(page)).enemies[0]!.health).toBe(110);

  // Facing the player again, a bash breaks the guard, and then a frontal bolt hurts.
  await act(page, 'setEnemyFacing', 0, Math.PI);
  await act(page, 'teleportPlayer', 0, CENTER_Y, 7.6);
  await act(page, 'setLook', 0, 0);
  await page.keyboard.press('KeyF');
  await advance(page, 12);
  let s = await inspect(page);
  expect(s.enemies[0]!.state).toBe('stagger');
  expect(s.enemies[0]!.health).toBe(110);
  // Let the bash finish (no casting mid-swing); the guard stays broken for 1.6 s.
  await advance(page, 16);
  await act(page, 'teleportPlayer', 0, CENTER_Y, 14);
  await act(page, 'aimAt', 0, 1.3, 6);
  await holdFire(page, 1);
  await advance(page, 16);
  s = await inspect(page);
  expect(s.enemies[0]!.health).toBe(100);
});

test('hounds are faster than soldiers', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, -4, 0);
  await act(page, 'spawnEnemy', KIND.hound, 4, 0);
  const before = await inspect(page);
  await advance(page, 45);
  const after = await inspect(page);
  const closed = (i: number) => enemyDistance(before, i) - enemyDistance(after, i);
  expect(closed(1)).toBeGreaterThan(closed(0) + 1);
});

test('a bash interrupts a wind-up', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, 0, 12.3);
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'windup', 60);
  await page.keyboard.press('KeyF');
  await advance(page, 10);
  const s = await inspect(page);
  expect(s.enemies[0]!.state).toBe('stagger');
  expect(s.enemies[0]!.health).toBe(25);
  expect(s.health).toBe(100);
});

test('clearing three waves clears the chamber', async ({ page }) => {
  await openGame(page, ENCOUNTER);
  await advanceUntil(page, (s) => s.encounter.status === 'active', 200);
  await expect(page.locator('#wave')).toHaveText('Wave 1 / 3');
  for (const next of ['Wave 2 / 3 incoming', 'Wave 3 / 3 incoming']) {
    await act(page, 'killAllEnemies');
    await advanceUntil(page, (s) => s.encounter.status === 'intermission', 120);
    await expect(page.locator('#wave')).toHaveText(next);
    await advanceUntil(page, (s) => s.encounter.status === 'active', 200);
  }
  await expect(page.locator('#wave')).toHaveText('Wave 3 / 3');
  await act(page, 'killAllEnemies');
  await advanceUntil(page, (s) => s.encounter.status === 'cleared', 120);
  await expect(page.locator('#cleared')).toBeVisible();
  await expect(page.locator('#wave')).toBeHidden();
});

test('dead enemies are removed', async ({ page }) => {
  await openGame(page, SANDBOX);
  const bodies = (await inspect(page)).bodies;
  for (let i = 0; i < 3; i++) await act(page, 'spawnEnemy', KIND.soldier, -6 + i * 3, 0);
  await advance(page, 2);
  expect((await inspect(page)).bodies).toBe(bodies + 3);
  await act(page, 'killAllEnemies');
  await advance(page, 80);
  const s = await inspect(page);
  expect(s.enemies).toHaveLength(0);
  expect(s.bodies).toBe(bodies);
});

test('R restarts the encounter', async ({ page }) => {
  await openGame(page, ENCOUNTER);
  await advance(page, 130);
  await act(page, 'setHealth', 40);
  await page.keyboard.press('KeyR');
  await advance(page, 1);
  let s = await inspect(page);
  expect(s.enemies).toHaveLength(0);
  expect(s.encounter.status).toBe('waiting');
  expect(s.health).toBe(100);
  await advance(page, 125);
  s = await inspect(page);
  expect(s.encounter.status).toBe('active');
  expect(s.encounter.wave).toBe(0);
});

function closestPair(s: Snapshot): number {
  let min = Infinity;
  for (let i = 0; i < s.enemies.length; i++) {
    for (let j = i + 1; j < s.enemies.length; j++) {
      const a = s.enemies[i]!;
      const b = s.enemies[j]!;
      min = Math.min(min, Math.hypot(a.x - b.x, a.z - b.z));
    }
  }
  return min;
}

test('enemies spawned on one spot spread apart', async ({ page }) => {
  await openGame(page, SANDBOX);
  for (let i = 0; i < 6; i++) await act(page, 'spawnEnemy', KIND.soldier, 0, 0);
  await advance(page, 40);
  expect(closestPair(await inspect(page))).toBeGreaterThan(0.6);
});

test('a crowd closing on the player keeps apart', async ({ page }) => {
  await openGame(page, SANDBOX);
  for (let i = 0; i < 6; i++) await act(page, 'spawnEnemy', KIND.soldier, -2.5 + i, 6);
  await advance(page, 120);
  const s = await inspect(page);
  expect(closestPair(s)).toBeGreaterThan(0.6);
  for (const e of s.enemies) {
    expect(Math.hypot(e.x - s.player.x, e.z - s.player.z)).toBeGreaterThan(0.6);
  }
});

test('enemies stop attacking a dead player', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, 0, 12.5);
  await act(page, 'setHealth', 1);
  await advanceUntil(page, (s) => s.phase === 'dead', 120);
  await advance(page, 60);
  expect((await inspect(page)).enemies[0]!.state).not.toBe('windup');
});
