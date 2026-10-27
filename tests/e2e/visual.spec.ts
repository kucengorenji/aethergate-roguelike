import { expect, test } from '@playwright/test';
import { advance, openGame } from './helpers';

// Deterministic scene: fixed seed, paused simulation, fixed number of steps.
// Update baselines intentionally with `pnpm e2e:update` and review the diff.
test('start scene matches the baseline', async ({ page }) => {
  await openGame(page);
  await advance(page, 60);
  await expect(page).toHaveScreenshot('start-scene.png');
});

test('win banner matches the baseline', async ({ page }) => {
  await openGame(page);
  await advance(page, 30);
  const { gems } = await page.evaluate(
    () => window.__game!.inspect() as { gems: { x: number; z: number }[] },
  );
  for (const { x, z } of gems) {
    await page.evaluate(
      ([gx, gz]) => {
        window.__game!.act('teleportPlayer', gx, 1, gz);
      },
      [x, z] as const,
    );
    await advance(page, 2);
  }
  await advance(page, 60);
  await expect(page).toHaveScreenshot('win-banner.png');
});
