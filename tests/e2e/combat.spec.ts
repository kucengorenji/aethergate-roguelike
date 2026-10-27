import { expect, test } from '@playwright/test';
import { act, advance, DUMMY_CHEST, holdFire, inspect, openGame } from './helpers';

const CENTER_Y = 0.9;

test('holding fire casts five bolts a second', async ({ page }) => {
  await openGame(page);
  await act(page, 'setLook', 0, 0.8); // open sky: no hits, so no hitstop
  await holdFire(page, 60);
  const s = await inspect(page);
  expect(s.stats.casts).toBeGreaterThanOrEqual(4);
  expect(s.stats.casts).toBeLessThanOrEqual(6);
  expect(s.focus).toBeCloseTo(100 - s.stats.casts * 6, 5);
});

test('bolts damage the dummy', async ({ page }) => {
  await openGame(page);
  await act(page, 'aimAt', ...DUMMY_CHEST);
  await holdFire(page, 1);
  await advance(page, 20);
  const s = await inspect(page);
  expect(s.dummy!.health).toBe(290);
  expect(s.stats.hits).toBe(1);
  expect(s.damageNumbers).toBe(1);
});

test('cover blocks bolts', async ({ page }) => {
  await openGame(page);
  // Behind the low wall at z 5.75 to 6.25, aiming low through it.
  await act(page, 'teleportPlayer', -5, CENTER_Y, 10);
  await act(page, 'aimAt', -5, 0.5, 0);
  await holdFire(page, 1);
  await advance(page, 2);
  const inFlight = (await inspect(page)).projectileList;
  expect(inFlight).toHaveLength(1);
  expect(inFlight[0]!.z).toBeGreaterThan(6.25);
  // A bolt that passed the wall would still be alive (1.6 s life) on the far side.
  await advance(page, 12);
  const s = await inspect(page);
  expect(s.projectiles).toBe(0);
  expect(s.stats.hits).toBe(0);
});

test('no focus, no bolt', async ({ page }) => {
  await openGame(page);
  await act(page, 'setLook', 0, 0.8);
  await act(page, 'setFocus', 3);
  await holdFire(page, 90);
  const s = await inspect(page);
  expect(s.stats.casts).toBe(0);
  expect(s.projectiles).toBe(0);
  expect(s.focus).toBe(3);
});

test('focus regenerates after a pause', async ({ page }) => {
  await openGame(page);
  await act(page, 'setFocus', 10);
  await advance(page, 30);
  expect((await inspect(page)).focus).toBeLessThan(100);
  await advance(page, 240);
  expect((await inspect(page)).focus).toBe(100);
});

test('dodge moves and avoids damage', async ({ page }) => {
  await openGame(page);
  const start = (await inspect(page)).player;
  await page.keyboard.press('Space');
  await act(page, 'fireOrbAtPlayer', 0, 1.1, 10);
  await advance(page, 30);
  const s = await inspect(page);
  expect(start.z - s.player.z).toBeGreaterThan(4);
  expect(s.health).toBe(100);
});

test('an orb hurts without a dodge', async ({ page }) => {
  await openGame(page);
  await act(page, 'fireOrbAtPlayer', 0, 1.1, 10);
  await advance(page, 40);
  expect((await inspect(page)).health).toBe(80);
});

test('dodge has a cooldown', async ({ page }) => {
  await openGame(page);
  await page.keyboard.press('Space');
  await advance(page, 1);
  expect((await inspect(page)).action).toBe('dodge');
  await advance(page, 26);
  expect((await inspect(page)).action).toBe('none');
  await page.keyboard.press('Space');
  await advance(page, 1);
  expect((await inspect(page)).action).toBe('none');
  await advance(page, 22);
  await page.keyboard.press('Space');
  await advance(page, 1);
  expect((await inspect(page)).action).toBe('dodge');
});

test('bash hits in front only', async ({ page }) => {
  await openGame(page);
  await act(page, 'teleportPlayer', 1.2, CENTER_Y, 3.4);
  await act(page, 'setLook', 0, 0); // facing -z, the dummy at z 5 is behind
  await page.keyboard.press('KeyF');
  await advance(page, 30);
  expect((await inspect(page)).dummy!.health).toBe(300);

  await act(page, 'teleportPlayer', 1.2, CENTER_Y, 6.8);
  await page.keyboard.press('KeyF');
  await advance(page, 12);
  const s = await inspect(page);
  expect(s.dummy!.health).toBe(285);
  expect(s.dummy!.z).toBeLessThan(4.9);
});

test('flask heals and runs out', async ({ page }) => {
  await openGame(page);
  await act(page, 'setHealth', 30);
  await page.keyboard.press('KeyQ');
  await advance(page, 60);
  let s = await inspect(page);
  expect(s.health).toBe(70);
  expect(s.flasks).toBe(2);
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('KeyQ');
    await advance(page, 60);
  }
  s = await inspect(page);
  expect(s.flasks).toBe(0);
  expect(s.health).toBe(100);
  await act(page, 'setHealth', 50);
  await page.keyboard.press('KeyQ');
  await advance(page, 60);
  s = await inspect(page);
  expect(s.health).toBe(50);
  expect(s.action).toBe('none');
});

test('hits cause hitstop', async ({ page }) => {
  await openGame(page);
  await act(page, 'aimAt', ...DUMMY_CHEST);
  await holdFire(page, 1);
  // The bolt needs about 13 steps to cross the 8 m to the dummy.
  await advance(page, 11);
  for (let i = 0; i < 6 && (await inspect(page)).stats.hits === 0; i++) await advance(page, 1);
  expect((await inspect(page)).stats.hits).toBe(1);
  expect((await inspect(page)).timeScale).toBeLessThan(0.5);
  await advance(page, 6);
  expect((await inspect(page)).timeScale).toBe(1);
});

test('dummy collapses and returns', async ({ page }) => {
  await openGame(page);
  await act(page, 'setDummyHealth', 5);
  await act(page, 'aimAt', ...DUMMY_CHEST);
  await holdFire(page, 1);
  await advance(page, 20);
  let s = await inspect(page);
  expect(s.dummy!.health).toBe(0);
  expect(s.dummy!.down).toBe(true);
  await advance(page, 90);
  expect((await inspect(page)).dummy!.down).toBe(true);
  await advance(page, 45);
  s = await inspect(page);
  expect(s.dummy!.down).toBe(false);
  expect(s.dummy!.health).toBe(300);
});

test('totem orbs can kill, R restores', async ({ page }) => {
  await openGame(page);
  await act(page, 'setHealth', 15);
  await act(page, 'fireOrbAtPlayer', 0, 1.1, 10);
  await advance(page, 40);
  expect((await inspect(page)).phase).toBe('dead');
  await expect(page.locator('#death')).toBeVisible();
  await page.keyboard.press('KeyR');
  await advance(page, 1);
  const s = await inspect(page);
  expect(s.phase).toBe('playing');
  expect(s.health).toBe(100);
  expect(s.flasks).toBe(3);
  expect(s.focus).toBe(100);
  await expect(page.locator('#death')).toBeHidden();
});

test('the totem fires at the player', async ({ page }) => {
  await openGame(page, undefined, { totem: true });
  // First shot after the 3.5 s interval (210 steps).
  await advance(page, 200);
  expect((await inspect(page)).projectiles).toBe(0);
  await advance(page, 20);
  expect((await inspect(page)).projectiles).toBeGreaterThan(0);
});
