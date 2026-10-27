import { expect, test, type Page } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  BOON,
  clearRoom,
  cometOnce,
  inspect,
  KIND,
  openGame,
  RUN,
  SANDBOX,
  shootOnce,
} from './helpers';

const CENTER_Y = 0.9;

/** A sandbox with frozen-AI enemies at the given spots, the crosshair on the first one. */
async function arena(page: Page, kinds: number[], spots: [number, number][]): Promise<void> {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  for (let i = 0; i < kinds.length; i++)
    await act(page, 'spawnEnemy', kinds[i]!, spots[i]![0], spots[i]![1]);
  await act(page, 'aimAt', spots[0]![0], 1.2, spots[0]![1]);
}

const hp = async (page: Page) => (await inspect(page)).enemies.map((e) => e.health);

test('a Blessing token opens a choice that fills a slot', async ({ page }) => {
  await openGame(page, RUN());
  await advanceUntil(page, (s) => s.encounter.status === 'active', 200);
  await clearRoom(page);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  let s = await inspect(page);
  expect(s.choice?.options).toHaveLength(3);
  await expect(page.locator('#boon-choice')).toBeVisible();
  await expect(page.locator('.boon-card')).toHaveCount(3);
  expect(s.doors.every((d) => !d.open)).toBe(true);
  // No moving while choosing.
  const z = s.player.z;
  await page.keyboard.down('KeyW');
  await advance(page, 20);
  await page.keyboard.up('KeyW');
  expect((await inspect(page)).player.z).toBeCloseTo(z, 3);

  const second = s.choice!.options[1]!;
  await page.keyboard.press('Digit2');
  await advance(page, 2);
  s = await inspect(page);
  expect(s.choice).toBeNull();
  expect(Object.values(s.boons).flat()).toContain(second);
  expect(s.run.boons).toBe(1);
  expect(s.doors.every((d) => d.open)).toBe(true);
  await expect(page.locator('#boon-choice')).toBeHidden();
  await expect(page.locator('#boons-held li')).toHaveCount(1);
});

test('Moon Queen: chill, freeze, Cold Heart, Rime Comet, Pale Step', async ({ page }) => {
  await arena(
    page,
    [KIND.knight, KIND.soldier],
    [
      [0, 6],
      [-6, 9],
    ],
  );
  await act(page, 'setEnemyFacing', 0, 0); // turned away, so bolts land in its back
  await act(page, 'grantBoon', BOON.moonlitBolts);
  await shootOnce(page);
  expect((await inspect(page)).enemies[0]!.status!.chill).toBe(1);
  await shootOnce(page);
  await shootOnce(page);
  let s = await inspect(page);
  expect(s.enemies[0]!.status!.frozen).toBeGreaterThan(0);
  // Frozen enemies do not move even with their AI running.
  // Let the last bolt's knockback die down first; a frozen enemy can still be pushed.
  await advance(page, 20);
  await act(page, 'freezeEnemies', 0);
  const at = (await inspect(page)).enemies[0]!;
  await advance(page, 30);
  s = await inspect(page);
  expect(Math.hypot(s.enemies[0]!.x - at.x, s.enemies[0]!.z - at.z)).toBeLessThan(0.05);
  expect(s.enemies[0]!.state).not.toBe('windup');
  await act(page, 'freezeEnemies', 1);

  // Cold Heart: +25% against the frozen knight.
  await act(page, 'grantBoon', BOON.coldHeart);
  const before = (await hp(page))[0]!;
  await shootOnce(page);
  expect(before - (await hp(page))[0]!).toBeCloseTo(12.5, 3);

  // Rime Comet chills what the burst hits.
  await act(page, 'grantBoon', BOON.rimeComet);
  expect((await inspect(page)).skillElement).toBe('frost');
  await act(page, 'aimAt', -6, 0.05, 9);
  await cometOnce(page);
  expect((await inspect(page)).enemies[1]!.status!.chill).toBe(2);

  // Pale Step: a frost nova around the player when the roll starts.
  await act(page, 'grantBoon', BOON.paleStep);
  await act(page, 'teleportPlayer', -6, CENTER_Y, 10.8);
  await page.keyboard.press('Space');
  await advance(page, 2);
  expect((await inspect(page)).enemies[1]!.status!.frozen).toBeGreaterThan(0);
});

test('chilled enemies wind up slower', async ({ page }) => {
  const windupSteps = async (chill: number) => {
    await openGame(page, SANDBOX);
    await act(page, 'spawnEnemy', KIND.soldier, 0, 11.5);
    if (chill) await act(page, 'addStatus', 0, 0, chill);
    await advanceUntil(page, (s) => s.enemies[0]!.state === 'windup', 90);
    return advanceUntil(page, (s) => s.enemies[0]!.state !== 'windup', 120);
  };
  const normal = await windupSteps(0);
  const chilled = await windupSteps(2);
  expect(chilled).toBeGreaterThan(normal * 1.5);
});

test('Starfall General: weight, crush, Collapsing Comet, Meteor Step, Starbound Staff', async ({
  page,
}) => {
  await arena(page, [KIND.knight], [[0, 6]]);
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.starfallBolts);
  for (let i = 0; i < 3; i++) await shootOnce(page);
  let s = await inspect(page);
  expect(s.enemies[0]!.health).toBe(120 - 30 - 25);
  expect(s.enemies[0]!.state).toBe('stagger');

  // Collapsing Comet pulls two soldiers from outside the burst radius into it.
  await arena(
    page,
    [KIND.soldier, KIND.soldier],
    [
      [-4.5, 6],
      [4.5, 6],
    ],
  );
  await act(page, 'grantBoon', BOON.collapsingComet);
  await act(page, 'aimAt', 0, 0.05, 6);
  await cometOnce(page);
  s = await inspect(page);
  expect(s.enemies.map((e) => e.health)).toEqual([5, 5]);
  expect(Math.abs(s.enemies[0]!.x)).toBeLessThan(3);

  // Meteor Step slams where the roll ends.
  await arena(page, [KIND.soldier], [[0, 8.6]]);
  await act(page, 'grantBoon', BOON.meteorStep);
  await page.keyboard.press('Space');
  await advance(page, 30);
  s = await inspect(page);
  expect(s.enemies[0]!.health).toBe(25);
  expect(s.enemies[0]!.status!.weight).toBe(1);

  // Starbound Staff: a bash crushes at once.
  await arena(page, [KIND.soldier], [[0, 12.3]]);
  await act(page, 'grantBoon', BOON.starboundStaff);
  await page.keyboard.press('KeyF');
  await advance(page, 12);
  expect((await inspect(page)).enemies[0]!.health).toBe(0);
});

test('Rot Saint: rot ticks, Blight Comet, Spore Step, Fester', async ({ page }) => {
  await arena(page, [KIND.knight], [[0, 6]]);
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.blightedBolts);
  await shootOnce(page);
  let s = await inspect(page);
  expect(s.enemies[0]!.status!.rot).toBe(1);
  const afterHit = s.enemies[0]!.health;
  await advance(page, 4 * 60 + 30);
  s = await inspect(page);
  expect(afterHit - s.enemies[0]!.health).toBeCloseTo(12, 0);
  expect(s.enemies[0]!.status!.rot).toBe(0);

  await act(page, 'grantBoon', BOON.blightComet);
  await act(page, 'aimAt', 0, 0.05, 6);
  await cometOnce(page);
  expect((await inspect(page)).enemies[0]!.status!.rot).toBe(3);

  await arena(page, [KIND.soldier], [[0, 8.6]]);
  await act(page, 'grantBoon', BOON.sporeStep);
  await page.keyboard.press('Space');
  await advance(page, 30);
  expect((await inspect(page)).enemies[0]!.status!.rot).toBe(2);

  await act(page, 'grantBoon', BOON.fester);
  await act(page, 'addStatus', 0, 2, 20);
  expect((await inspect(page)).enemies[0]!.status!.rot).toBe(8);
});

test('Storm Warden: arcs, Thunder Comet, Static Step, Thunderhead', async ({ page }) => {
  await arena(
    page,
    [KIND.knight, KIND.soldier],
    [
      [0, 6],
      [2.5, 6],
    ],
  );
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.arcBolts);
  await shootOnce(page);
  let s = await inspect(page);
  expect(s.enemies[1]!.health).toBe(35);

  // Thunder Comet strikes enemies outside the burst.
  await arena(
    page,
    [KIND.soldier, KIND.soldier],
    [
      [0, 6],
      [6, 6],
    ],
  );
  await act(page, 'grantBoon', BOON.thunderComet);
  await act(page, 'aimAt', 0, 0.05, 6);
  await cometOnce(page);
  expect(await hp(page)).toEqual([5, 20]);

  // Static Step strikes the nearest enemy when the roll starts.
  await arena(page, [KIND.soldier], [[3, 9]]);
  await act(page, 'grantBoon', BOON.staticStep);
  await page.keyboard.press('Space');
  await advance(page, 2);
  expect(await hp(page)).toEqual([25]);

  // Thunderhead: the fifth landed bolt arcs to three enemies.
  await arena(
    page,
    [KIND.knight, KIND.soldier, KIND.soldier, KIND.soldier],
    [
      [0, 6],
      [2.5, 6],
      [-2.5, 6],
      [0, 3.5],
    ],
  );
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.thunderhead);
  for (let i = 0; i < 4; i++) await shootOnce(page);
  expect((await hp(page)).slice(1)).toEqual([40, 40, 40]);
  await shootOnce(page);
  s = await inspect(page);
  expect(s.enemies.slice(1).map((e) => e.health)).toEqual([30, 30, 30]);
});

test('duo blessings and replacing a slot', async ({ page }) => {
  // Shatter doubles a crush on a chilled enemy.
  await arena(page, [KIND.knight], [[0, 6]]);
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.starfallBolts);
  await act(page, 'grantBoon', BOON.shatter);
  await act(page, 'addStatus', 0, 0, 1);
  for (let i = 0; i < 3; i++) await shootOnce(page);
  expect((await hp(page))[0]).toBe(120 - 30 - 50);

  // Plague Storm: arcs carry Rot.
  await arena(
    page,
    [KIND.knight, KIND.soldier],
    [
      [0, 6],
      [2.5, 6],
    ],
  );
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.arcBolts);
  await act(page, 'grantBoon', BOON.plagueStorm);
  await shootOnce(page);
  expect((await inspect(page)).enemies[1]!.status!.rot).toBe(2);

  // Duos are offered once both demigods are held (Moon and Starfall here).
  await act(page, 'grantBoon', BOON.coldHeart);
  await act(page, 'grantBoon', BOON.meteorStep);
  await act(page, 'offerBoons', 1);
  expect((await inspect(page)).choice!.options).toContain('shatter');
  await page.keyboard.press('Digit1');
  await advance(page, 1);

  // A new Primary replaces the old one, and its effect goes with it.
  await arena(page, [KIND.knight], [[0, 6]]);
  await act(page, 'setEnemyFacing', 0, 0);
  await act(page, 'grantBoon', BOON.moonlitBolts);
  await act(page, 'grantBoon', BOON.blightedBolts);
  await shootOnce(page);
  const s = await inspect(page);
  expect(s.boons.primary).toBe('blighted-bolts');
  expect(s.enemies[0]!.status!.chill).toBe(0);
  expect(s.enemies[0]!.status!.rot).toBe(1);
});
