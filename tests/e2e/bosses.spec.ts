import { expect, test } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  BOON,
  inspect,
  KIND,
  openGame,
  REWARD,
  RUN,
  SANDBOX,
  shootOnce,
} from './helpers';

const CENTER_Y = 0.9;

test('the elite and boss rooms bring their bosses and a health bar', async ({ page }) => {
  await openGame(page, RUN());
  await act(page, 'goToRoom', 4, REWARD.heal);
  await advanceUntil(page, (s) => s.enemies.length > 0, 200);
  expect((await inspect(page)).enemies.map((e) => e.kind).sort()).toEqual([
    'captain',
    'soldier',
    'soldier',
  ]);
  await advanceUntil(page, (s) => s.enemies.every((e) => e.state !== 'rising'), 120);
  await expect(page.locator('#boss-bar .boss-name')).toHaveText('The Ward Captain');
  await act(page, 'goToRoom', 7, REWARD.heal);
  await advanceUntil(page, (s) => s.enemies.length > 0, 200);
  expect((await inspect(page)).enemies.map((e) => e.kind)).toEqual(['starfallen']);
  await advance(page, 2);
  await expect(page.locator('#boss-bar .boss-name')).toHaveText('The Starfallen Knight');
});

test('the Captain blocks, telegraphs its charge, and splits at half health', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'spawnEnemy', KIND.captain, 0, 4);
  await act(page, 'aimAt', 0, 1.6, 4);
  await shootOnce(page);
  expect((await inspect(page)).enemies[0]!.health).toBe(450);

  await act(page, 'freezeEnemies', 0);
  await advanceUntil(
    page,
    (s) => s.enemies[0]!.move === 'charge' && s.enemies[0]!.state === 'windup',
    60,
  );
  const windup = await advanceUntil(page, (s) => s.enemies[0]!.state === 'attack', 90);
  expect(windup).toBeGreaterThanOrEqual(50);
  await advanceUntil(page, (s) => s.health < 100, 60);
  expect((await inspect(page)).health).toBe(80);

  await act(page, 'setEnemyHealth', 0, 220);
  await advance(page, 2);
  const s = await inspect(page);
  // The summoned soldiers can come first in the list, so find the Captain by kind.
  const captainNow = () => inspect(page).then((x) => x.enemies.find((e) => e.kind === 'captain')!);
  expect((await captainNow()).phase).toBe(2);
  expect(s.enemies.filter((e) => e.kind === 'soldier')).toHaveLength(2);
  await expect(page.locator('#toast')).toHaveText('The Ward Captain casts its shield aside');
  // The shield is gone: a frontal bolt now lands.
  await act(page, 'freezeEnemies', 1);
  const captain = await captainNow();
  await act(page, 'aimAt', captain.x, 1.6, captain.z);
  await shootOnce(page);
  expect((await captainNow()).health).toBeLessThan(220);
});

test('the sweep hits in front of the boss, not behind it', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 11);
  await advanceUntil(
    page,
    (s) => s.enemies[0]!.move === 'sweep' && s.enemies[0]!.state === 'windup',
    60,
  );
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'recover', 90);
  expect((await inspect(page)).health).toBe(74);

  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 11);
  await advanceUntil(
    page,
    (s) => s.enemies[0]!.move === 'sweep' && s.enemies[0]!.state === 'windup',
    60,
  );
  // The sweep commits to its direction: stepping behind the boss avoids it.
  await act(page, 'teleportPlayer', 0, CENTER_Y, 8);
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'recover', 90);
  expect((await inspect(page)).health).toBe(100);
});

test('the gravity well pulls the player in, and a roll away escapes', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 6);
  await act(page, 'setEnemyPattern', 0, 1);
  await advanceUntil(
    page,
    (s) => s.enemies[0]!.move === 'well' && s.enemies[0]!.state === 'attack',
    90,
  );
  const start = (await inspect(page)).player.z;
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'recover', 120);
  const s = await inspect(page);
  expect(start - s.player.z).toBeGreaterThan(3);
  expect(s.health).toBe(78);

  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 6);
  await act(page, 'setEnemyPattern', 0, 1);
  await advanceUntil(
    page,
    (x) => x.enemies[0]!.move === 'well' && x.enemies[0]!.state === 'attack',
    90,
  );
  await page.keyboard.down('KeyS');
  await page.keyboard.press('Space');
  await advanceUntil(page, (x) => x.enemies[0]!.state === 'recover', 120);
  await page.keyboard.up('KeyS');
  expect((await inspect(page)).health).toBe(100);
});

test('meteors strike their markers', async ({ page }) => {
  for (const stay of [true, false]) {
    await openGame(page, SANDBOX);
    await act(page, 'spawnEnemy', KIND.starfallen, 0, -14);
    await act(page, 'setEnemyHealth', 0, 900);
    await advanceUntil(
      page,
      (s) => s.enemies[0]!.phase === 2 && s.enemies[0]!.state === 'chase',
      120,
    );
    await act(page, 'setEnemyPattern', 0, 1);
    await advanceUntil(page, (s) => s.hazards.length > 0, 120);
    await act(page, 'freezeEnemies', 1);
    const { hazards, player } = await inspect(page);
    // The first meteor targets where the player stood when they were called.
    expect(Math.hypot(hazards[0]!.x - player.x, hazards[0]!.z - player.z)).toBeLessThan(0.5);
    if (!stay) await act(page, 'teleportPlayer', 15, CENTER_Y, 16);
    await advanceUntil(page, (s) => s.hazards.length === 0, 120);
    expect((await inspect(page)).health).toBe(stay ? 82 : 100);
  }
});

test('the last phase burns outside the closing ring', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, -14);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'setEnemyHealth', 0, 400);
  await advance(page, 2);
  expect((await inspect(page)).burnRing).toBeCloseTo(22, 0);
  await advanceUntil(page, (s) => (s.burnRing ?? 99) < 15, 900);
  await act(page, 'teleportPlayer', 16, CENTER_Y, 4);
  await advance(page, 40);
  const burned = (await inspect(page)).health;
  expect(burned).toBeLessThan(100);
  await act(page, 'teleportPlayer', 0, CENTER_Y, 5);
  await advance(page, 40);
  expect((await inspect(page)).health).toBe(burned);
});

test('phase changes push the player back; bosses resist control', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 11);
  await act(page, 'setEnemyHealth', 0, 900);
  await advance(page, 12);
  let s = await inspect(page);
  expect(s.player.z).toBeGreaterThan(14.5);
  await expect(page.locator('#toast')).toHaveText('Stars begin to fall');

  // A fresh boss for the control checks, so the phase-change stagger is not in play.
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 11);
  await act(page, 'teleportPlayer', 0, CENTER_Y, 16);
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.moonlitBolts);
  await act(page, 'grantBoon', BOON.starboundStaff);
  await act(page, 'aimAt', 0, 2, 11);
  for (let i = 0; i < 4; i++) await shootOnce(page);
  s = await inspect(page);
  expect(s.enemies[0]!.status!.frozen).toBe(0);
  expect(s.enemies[0]!.status!.chill).toBe(2);

  await act(page, 'teleportPlayer', 0, CENTER_Y, 12.8);
  await act(page, 'setLook', 0, 0);
  await page.keyboard.press('KeyF');
  await advance(page, 12);
  expect((await inspect(page)).enemies[0]!.state).not.toBe('stagger');
});
