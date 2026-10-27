import { expect, test } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  DUMMY_CHEST,
  hold,
  KIND,
  openGame,
  pixelsForRadians,
  SANDBOX,
} from './helpers';

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

test('wave fight with a telegraph', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.knight, 0, 9);
  await act(page, 'spawnEnemy', KIND.soldier, -3.5, 7);
  await act(page, 'spawnEnemy', KIND.caster, 5, 4);
  await advanceUntil(
    page,
    (s) => s.enemies.some((e) => e.kind === 'knight' && e.state === 'windup'),
    240,
  );
  await advance(page, 25);
  await expect(page).toHaveScreenshot('wave-fight.png');
});

// The character's action poses from the shoulder camera.
test('dodge roll mid-tumble', async ({ page }) => {
  await openGame(page);
  await advance(page, 5);
  await page.keyboard.press('Space');
  await advance(page, 10);
  await expect(page).toHaveScreenshot('dodge-roll.png');
});

test('staff bash wind-up', async ({ page }) => {
  await openGame(page);
  await advance(page, 5);
  await page.keyboard.press('KeyF');
  await advance(page, 4);
  await expect(page).toHaveScreenshot('bash-windup.png');
});

test('drinking the flask', async ({ page }) => {
  await openGame(page);
  await act(page, 'setHealth', 50);
  await page.keyboard.press('KeyQ');
  await advance(page, 25);
  await expect(page).toHaveScreenshot('drinking.png');
});
