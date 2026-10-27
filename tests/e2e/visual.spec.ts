import { expect, test } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  BOON,
  DUMMY_CHEST,
  hold,
  KIND,
  openGame,
  pixelsForRadians,
  REWARD,
  RUN,
  SANDBOX,
  shootOnce,
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

test('door choice after taking the reward', async ({ page }) => {
  await openGame(page, RUN());
  await act(page, 'goToRoom', 1, REWARD.heal);
  await act(page, 'killAllEnemies');
  await act(page, 'goToRoom', 2, REWARD.shards);
  await advance(page, 2);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  await act(page, 'resetPlayer');
  await advance(page, 150);
  await expect(page).toHaveScreenshot('door-choice.png');
});

test('grace room with its reward', async ({ page }) => {
  await openGame(page, RUN());
  await act(page, 'goToRoom', 2, REWARD.boon);
  await advance(page, 30);
  await expect(page).toHaveScreenshot('grace-room.png');
});

test('comet burst', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'spawnEnemy', KIND.soldier, -1.2, 6);
  await act(page, 'spawnEnemy', KIND.hound, 1.2, 6);
  await act(page, 'aimAt', 0, 0.05, 5.6);
  await page.mouse.down({ button: 'right' });
  await advanceUntil(page, (s) => s.enemies.every((e) => e.health < 30), 60);
  await page.mouse.up({ button: 'right' });
  await advance(page, 3);
  await expect(page).toHaveScreenshot('comet-burst.png');
});

test('blessing choice', async ({ page }) => {
  await openGame(page, RUN());
  await act(page, 'grantBoon', BOON.moonlitBolts);
  await act(page, 'goToRoom', 2, REWARD.boon);
  await advance(page, 2);
  await act(page, 'teleportToPickup');
  await advance(page, 3);
  await expect(page).toHaveScreenshot('blessing-choice.png');
});

test('status effects and an arc', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  for (const [kind, x] of [
    [KIND.knight, 0],
    [KIND.soldier, 2.4],
    [KIND.soldier, -2.4],
    [KIND.hound, 4.6],
  ] as const) {
    await act(page, 'spawnEnemy', kind, x, 6);
  }
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'addStatus', 1, 2, 3);
  await act(page, 'addStatus', 2, 0, 2);
  await act(page, 'addStatus', 3, 1, 2);
  await act(page, 'grantBoon', BOON.arcBolts);
  await act(page, 'grantBoon', BOON.coldHeart);
  await act(page, 'aimAt', 0, 1.3, 6);
  await shootOnce(page);
  await expect(page).toHaveScreenshot('status-and-arc.png');
});
