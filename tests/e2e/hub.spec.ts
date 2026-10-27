import { expect, test, type Page } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  HUB,
  inspect,
  KIND,
  openGame,
  shootOnce,
  STATION,
} from './helpers';

async function useStation(page: Page, station: number): Promise<void> {
  await act(page, 'pointerLock', 1);
  await act(page, 'teleportToStation', station);
  await advance(page, 2);
  await page.keyboard.press('KeyE');
  await advance(page, 2);
}

test('the game starts in the hall and the grace site starts a run', async ({ page }) => {
  await openGame(page, HUB);
  let s = await inspect(page);
  expect(s.layout).toBe('kindled-hall');
  expect(s.runActive).toBe(false);
  await expect(page.locator('#wave')).toHaveText('The Kindled Hall');
  await act(page, 'teleportToStation', STATION.grace);
  await advance(page, 2);
  await expect(page.locator('#door-prompt')).toContainText('Begin a run');
  await page.keyboard.press('KeyE');
  await advance(page, 2);
  s = await inspect(page);
  expect(s.runActive).toBe(true);
  expect(s.run.index).toBe(0);
  await expect(page.locator('#wave')).toContainText('Room 1 / 8');
});

test('dying returns to the hall with the shards banked', async ({ page }) => {
  await openGame(page, HUB);
  await useStation(page, STATION.grace);
  await act(page, 'addRunShards', 35);
  await act(page, 'setHealth', 0);
  await advance(page, 3);
  await expect(page.locator('#death')).toContainText('return to the Kindled Hall');
  await page.keyboard.press('KeyE');
  await advance(page, 3);
  const s = await inspect(page);
  expect(s.layout).toBe('kindled-hall');
  expect(s.runActive).toBe(false);
  expect(s.save.shards).toBe(35);
  expect(s.save.stats.runs).toBe(1);
  expect(s.health).toBe(s.maxHealth);
  await expect(page.locator('#stat-shards')).toHaveText('35');
});

test('victory counts a win and the best time', async ({ page }) => {
  await openGame(page, HUB);
  await useStation(page, STATION.grace);
  await act(page, 'goToRoom', 7, 0);
  await advanceUntil(page, (s) => s.enemies.length > 0, 200);
  await act(page, 'killAllEnemies');
  await advanceUntil(page, (s) => s.run.status === 'complete', 200);
  // The Starfallen Knight is worth 100 shards.
  expect((await inspect(page)).run.shards).toBe(100);
  await expect(page.locator('#complete')).toContainText('return to the Kindled Hall');
  await page.keyboard.press('KeyE');
  await advance(page, 3);
  const s = await inspect(page);
  expect(s.save.stats.wins).toBe(1);
  expect(s.save.stats.bestTime).toBeGreaterThan(0);
  expect(s.save.shards).toBe(100);
});

test('upgrades cost shards, persist, and change the next run', async ({ page }) => {
  await openGame(page, HUB);
  await act(page, 'setShards', 50);
  await useStation(page, STATION.altar);
  await expect(page.locator('#meta-panel')).toBeVisible();
  const vigor = page.locator('.meta-row', { hasText: 'Vigor' }).locator('button');
  const flasks = page.locator('.meta-row', { hasText: 'Flask Bearer' }).locator('button');
  await expect(flasks).toBeDisabled();
  await vigor.click();
  await advance(page, 2);
  let s = await inspect(page);
  expect(s.save.shards).toBe(20);
  expect(s.save.upgrades.vigor).toBe(1);
  await expect(vigor).toBeDisabled();
  await page.keyboard.press('Escape');
  await advance(page, 2);
  expect((await inspect(page)).panel).toBeNull();

  // Saved: a fresh page load keeps the level.
  await page.waitForTimeout(300);
  await openGame(page, HUB);
  s = await inspect(page);
  expect(s.save.upgrades.vigor).toBe(1);
  await useStation(page, STATION.grace);
  s = await inspect(page);
  expect(s.maxHealth).toBe(115);
  expect(s.health).toBe(115);
});

test('the Lance Staff pierces through a line of enemies', async ({ page }) => {
  await openGame(page, HUB);
  await act(page, 'setShards', 160);
  await useStation(page, STATION.rack);
  await page.locator('.meta-row', { hasText: 'Lance Staff' }).locator('button').click();
  await page.locator('.meta-row', { hasText: 'Scatter Staff' }).locator('button').click();
  await page.locator('.meta-row', { hasText: 'Lance Staff' }).locator('button').click();
  await advance(page, 2);
  let s = await inspect(page);
  expect([...s.save.staffs].sort()).toEqual(['glint', 'lance', 'scatter']);
  expect(s.save.staff).toBe('lance');
  expect(s.save.shards).toBe(0);
  await page.keyboard.press('Escape');
  await useStation(page, STATION.grace);
  expect((await inspect(page)).loadout?.staff).toBe('lance');

  // Three soldiers in a line: one lance bolt goes through all of them.
  await act(page, 'freezeEnemies', 1);
  for (const z of [4, 2, 0]) await act(page, 'spawnEnemy', KIND.soldier, 0, z);
  await act(page, 'aimAt', 0, 1.2, 0);
  await shootOnce(page);
  s = await inspect(page);
  expect(s.enemies.filter((e) => e.kind === 'soldier' && e.health === 40 - 18)).toHaveLength(3);
});

test('the Scatter Staff fires three bolts', async ({ page }) => {
  await openGame(page, HUB);
  await act(page, 'setShards', 80);
  await useStation(page, STATION.rack);
  await page.locator('.meta-row', { hasText: 'Scatter Staff' }).locator('button').click();
  await page.locator('.meta-row', { hasText: 'Scatter Staff' }).locator('button').click();
  await page.keyboard.press('Escape');
  await useStation(page, STATION.grace);
  await act(page, 'setLook', 0, 0.6);
  const before = (await inspect(page)).stats.casts;
  await page.mouse.down();
  await advance(page, 1);
  await page.mouse.up();
  const s = await inspect(page);
  expect(s.stats.casts).toBe(before + 1);
  expect(s.projectileList.filter((p) => p.kind === 0)).toHaveLength(3);
});

test('the Ward Captain is worth 40 shards', async ({ page }) => {
  await openGame(page, HUB);
  await useStation(page, STATION.grace);
  await act(page, 'goToRoom', 4, 0);
  await advanceUntil(page, (s) => s.enemies.some((e) => e.kind === 'captain'), 200);
  await act(page, 'killAllEnemies');
  await advance(page, 3);
  expect((await inspect(page)).run.shards).toBe(40);
});
