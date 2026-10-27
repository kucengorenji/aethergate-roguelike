import { expect, test } from '@playwright/test';
import { act, advance, DUMMY_CHEST, hold, openGame, pixelsForRadians } from './helpers';

// Deterministic scenes: fixed seed, paused simulation, fixed number of steps.
// Update baselines intentionally with `pnpm e2e:update` and review the diff.
test('arena from the shoulder at spawn', async ({ page }) => {
  await openGame(page);
  await advance(page, 60);
  await expect(page).toHaveScreenshot('spawn-view.png');
});

test('running mid-stride after turning', async ({ page }) => {
  await openGame(page);
  await advance(page, 5);
  await act(page, 'look', pixelsForRadians(-0.9), pixelsForRadians(-0.15));
  await hold(page, 'KeyW', 37);
  await expect(page).toHaveScreenshot('running-turned.png');
});

test('click-to-play prompt over the arena', async ({ page }) => {
  await openGame(page, undefined, { lock: false });
  await advance(page, 30);
  await expect(page).toHaveScreenshot('lock-prompt.png');
});

test('casting at the dummy', async ({ page }) => {
  await openGame(page);
  await act(page, 'aimAt', ...DUMMY_CHEST);
  await page.mouse.down();
  // The first bolt is mid-flight, about 5 m out.
  await advance(page, 8);
  await expect(page).toHaveScreenshot('casting-at-dummy.png');
  await page.mouse.up();
});

test('death banner', async ({ page }) => {
  await openGame(page);
  await act(page, 'setHealth', 15);
  await act(page, 'fireOrbAtPlayer', 0, 1.1, 10);
  await advance(page, 60);
  await expect(page).toHaveScreenshot('death-banner.png');
});
