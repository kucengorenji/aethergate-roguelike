import { expect, test } from '@playwright/test';
import { advance, hold, inspect, openGame } from './helpers';

test('starts a round with gems to collect', async ({ page }) => {
  await openGame(page);
  const s = await inspect(page);
  expect(s.phase).toBe('playing');
  expect(s.total).toBeGreaterThan(0);
  expect(s.gemsLeft).toBe(s.total);
  await expect(page.locator('#hud-score')).toHaveText(`0 / ${s.total}`);
});

test('arrow keys roll the ball', async ({ page }) => {
  await openGame(page);
  await advance(page, 30); // settle on the ground
  const before = (await inspect(page)).player!;
  await hold(page, 'ArrowRight', 60);
  const after = (await inspect(page)).player!;
  expect(after.x - before.x).toBeGreaterThan(1);
});

test('space jumps only when grounded', async ({ page }) => {
  await openGame(page);
  await advance(page, 30);
  const groundY = (await inspect(page)).player!.y;
  await page.keyboard.press('Space');
  await advance(page, 10);
  const airborneY = (await inspect(page)).player!.y;
  expect(airborneY).toBeGreaterThan(groundY + 0.3);
});

test('collecting every gem wins, R restarts', async ({ page }) => {
  await openGame(page);
  await advance(page, 30);
  // Teleporting the ball onto each gem keeps the test about rules, not steering.
  const { gems } = await inspect(page);
  for (const gem of gems) {
    await page.evaluate(({ x, z }) => {
      window.__game!.act('teleportPlayer', x, 1, z);
    }, gem);
    await advance(page, 2);
  }
  const won = await inspect(page);
  expect(won.phase).toBe('won');
  expect(won.score).toBe(won.total);
  await expect(page.locator('#banner')).toBeVisible();

  await page.keyboard.press('KeyR');
  await advance(page, 1);
  const restarted = await inspect(page);
  expect(restarted.phase).toBe('playing');
  expect(restarted.score).toBe(0);
  expect(restarted.gemsLeft).toBe(restarted.total);
  await expect(page.locator('#banner')).toBeHidden();
});
