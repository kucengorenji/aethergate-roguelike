import { expect, test } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  clearRoom,
  inspect,
  openGame,
  REWARD,
  RUN,
  takeRewardAndEnter,
} from './helpers';

test('clearing a room offers its reward, then doors', async ({ page }) => {
  await openGame(page, RUN());
  await advanceUntil(page, (s) => s.encounter.status === 'active', 200);
  await expect(page.locator('#wave')).toHaveText('Room 1 / 8 · Wave 1 / 2');
  await clearRoom(page);
  await advanceUntil(page, (s) => s.run.status === 'reward', 10);
  let s = await inspect(page);
  expect(s.pickups).toEqual([expect.objectContaining({ reward: 'boon' })]);
  expect(s.doors.every((d) => !d.open)).toBe(true);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  // The Blessing opens a choice (spec 0007); the doors wait for it.
  s = await inspect(page);
  expect(s.choice).not.toBeNull();
  expect(s.doors.every((d) => !d.open)).toBe(true);
  await page.keyboard.press('Digit1');
  await advance(page, 2);
  s = await inspect(page);
  expect(s.run.boons).toBe(1);
  expect(s.run.status).toBe('choosing');
  expect(s.doors).toHaveLength(2);
  expect(s.doors.every((d) => d.open)).toBe(true);
  await expect(page.locator('#toast')).not.toBeEmpty();
  await expect(page.locator('#stat-boons')).toHaveText('1');
});

test('a door loads the next room', async ({ page }) => {
  await openGame(page, RUN());
  const before = await inspect(page);
  await advanceUntil(page, (s) => s.encounter.status === 'active', 200);
  await clearRoom(page);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  await page.keyboard.press('Digit1');
  await advance(page, 2);
  const offer = (await inspect(page)).doors.find((d) => d.index === 1)!.offer;
  await act(page, 'teleportToDoor', 1);
  await advance(page, 1);
  await expect(page.locator('#door-prompt')).toBeVisible();
  await page.keyboard.press('KeyE');
  await advanceUntil(page, (s) => s.run.status === 'fighting', 60);
  const s = await inspect(page);
  expect(s.run.index).toBe(1);
  expect(s.layout).toBe(before.run.layouts[1]);
  expect(s.run.reward).toBe(offer);
  expect(s.player.z).toBeGreaterThan(14);
  expect(s.enemies).toHaveLength(0);
  expect(s.pickups).toHaveLength(0);
  await expect(page.locator('#wave')).toHaveText('Room 2 / 8');
});

test('grace rooms reward without a fight', async ({ page }) => {
  await openGame(page, RUN());
  await act(page, 'setHealth', 50);
  await act(page, 'goToRoom', 2, REWARD.heal);
  await advance(page, 2);
  let s = await inspect(page);
  expect(s.run.kind).toBe('grace');
  expect(s.encounter.status).toBe('off');
  expect(s.enemies).toHaveLength(0);
  expect(s.pickups).toHaveLength(1);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  s = await inspect(page);
  expect(s.health).toBe(80);
  expect(s.run.status).toBe('choosing');
});

test('rewards change the run', async ({ page }) => {
  await openGame(page, RUN());
  await page.keyboard.press('KeyQ');
  await advance(page, 60);
  expect((await inspect(page)).flasks).toBe(2);
  await act(page, 'goToRoom', 2, REWARD.flask);
  await advance(page, 2);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  expect((await inspect(page)).flasks).toBe(3);

  await act(page, 'goToRoom', 6, REWARD.shards);
  await advance(page, 2);
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  expect((await inspect(page)).run.shards).toBe(25);
  await expect(page.locator('#stat-shards')).toHaveText('25');
});

test('a seeded run reaches the Aethergate', async ({ page }) => {
  test.slow(); // eight rooms of waves
  await openGame(page, RUN(11));
  const plan = (await inspect(page)).run.layouts;
  const visited: string[] = [];
  for (let room = 0; room < 8; room++) {
    const s = await inspect(page);
    visited.push(s.layout);
    await clearRoom(page);
    await takeRewardAndEnter(page);
  }
  const s = await inspect(page);
  expect(s.run.status).toBe('complete');
  expect(visited).toEqual(plan);
  expect(s.run.boons).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#complete')).toBeVisible();
  await page.keyboard.press('KeyR');
  await advance(page, 1);
  const next = await inspect(page);
  expect(next.run.index).toBe(0);
  expect(next.run.seed).toBe(12);
});

test('the same seed plays the same run', async ({ page }) => {
  await openGame(page, RUN(21));
  const first = (await inspect(page)).run;
  await openGame(page, RUN(21));
  const again = (await inspect(page)).run;
  await openGame(page, RUN(22));
  const other = (await inspect(page)).run;
  expect(again.layouts).toEqual(first.layouts);
  expect(again.offers).toEqual(first.offers);
  expect([other.layouts, other.offers]).not.toEqual([first.layouts, first.offers]);
});

test('dying starts a new run', async ({ page }) => {
  await openGame(page, RUN());
  await act(page, 'goToRoom', 3, REWARD.boon);
  await advance(page, 1);
  // R does nothing while alive in a run.
  await page.keyboard.press('KeyR');
  await advance(page, 1);
  expect((await inspect(page)).run.index).toBe(3);
  await act(page, 'setHealth', 1);
  await act(page, 'fireOrbAtPlayer', 0, 1.1, 10);
  await advanceUntil(page, (s) => s.phase === 'dead', 60);
  await page.keyboard.press('KeyR');
  await advance(page, 1);
  const s = await inspect(page);
  expect(s.phase).toBe('playing');
  expect(s.run.index).toBe(0);
  expect(s.run.seed).toBe(8);
  expect(s.health).toBe(100);
  expect(s.run.boons).toBe(0);
});
