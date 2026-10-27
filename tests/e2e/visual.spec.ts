import { expect, test } from '@playwright/test';
import { act, advance, hold, openGame, pixelsForRadians } from './helpers';

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
