import { expect, test } from '@playwright/test';
import { act, advance, advanceUntil, inspect, KIND, openGame, SANDBOX } from './helpers';

const COMET = 2;

async function rightClick(page: import('@playwright/test').Page): Promise<void> {
  await page.mouse.down({ button: 'right' });
  await advance(page, 1);
  await page.mouse.up({ button: 'right' });
}

test('right click hurls one comet', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'setLook', 0, 0.6);
  await rightClick(page);
  let s = await inspect(page);
  expect(s.projectileList.filter((p) => p.kind === COMET)).toHaveLength(1);
  expect(s.skillCooldown).toBeGreaterThan(5.9);
  await rightClick(page);
  s = await inspect(page);
  expect(s.projectileList.filter((p) => p.kind === COMET)).toHaveLength(1);
});

test('a burst hits the whole group', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  for (const [x, z] of [
    [-1.2, 6],
    [1.2, 6],
    [0, 4.8],
  ] as const) {
    await act(page, 'spawnEnemy', KIND.soldier, x, z);
  }
  const before = await inspect(page);
  await act(page, 'aimAt', 0, 0.05, 5.6);
  await rightClick(page);
  await advanceUntil(page, (s) => s.enemies.every((e) => e.health < 40), 60);
  const s = await inspect(page);
  for (const e of s.enemies) expect(e.health).toBe(40 - 35);
  // Knocked away from the burst center.
  const spread = (x: typeof s) =>
    Math.hypot(x.enemies[0]!.x - x.enemies[1]!.x, x.enemies[0]!.z - x.enemies[1]!.z);
  await advance(page, 10);
  expect(spread(await inspect(page))).toBeGreaterThan(spread(before));
});

test('comets burst at the aimed spot', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'aimAt', 0, 0, 4);
  await rightClick(page);
  const flight = await advanceUntil(page, (s) => s.projectileList.every((p) => p.kind !== 2), 60);
  // About 10 m from the staff tip at 22 m/s is roughly 27 steps; it must not stop early.
  expect(flight).toBeGreaterThan(20);
  expect(flight).toBeLessThan(35);
});

test('cover stops comets', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  // Behind the low wall at z 5.75 to 6.25 (courtyard), a soldier more than 3 m past it.
  await act(page, 'teleportPlayer', -5, 0.9, 10);
  await act(page, 'spawnEnemy', KIND.soldier, -5, 1.5);
  await act(page, 'aimAt', -5, 0.6, 1.5);
  await rightClick(page);
  await advanceUntil(page, (s) => s.projectileList.every((p) => p.kind !== 2), 60);
  expect((await inspect(page)).enemies[0]!.health).toBe(40);
});

test('no comet mid-roll', async ({ page }) => {
  await openGame(page, SANDBOX);
  await page.keyboard.press('Space');
  await advance(page, 3);
  await rightClick(page);
  const s = await inspect(page);
  expect(s.action).toBe('dodge');
  expect(s.projectileList.filter((p) => p.kind === COMET)).toHaveLength(0);
  expect(s.skillCooldown).toBe(0);
});

test('the icon shows the cooldown', async ({ page }) => {
  await openGame(page, SANDBOX);
  const icon = page.locator('#skill');
  await expect(icon).toHaveClass(/ready/);
  await act(page, 'setLook', 0, 0.6);
  await rightClick(page);
  await advance(page, 180);
  await expect(icon).not.toHaveClass(/ready/);
  expect(
    Number(await icon.evaluate((el) => getComputedStyle(el).getPropertyValue('--ready'))),
  ).toBeCloseTo(0.5, 1);
  await advance(page, 190);
  await expect(icon).toHaveClass(/ready/);
});
