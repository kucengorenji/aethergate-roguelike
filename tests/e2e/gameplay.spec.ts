import { expect, test } from '@playwright/test';
import { act, advance, hold, inspect, openGame, pixelsForRadians } from './helpers';

const CENTER_Y = 0.9;

test('spawns idle on the floor', async ({ page }) => {
  await openGame(page);
  await advance(page, 5);
  const s = await inspect(page);
  expect(s.grounded).toBe(true);
  expect(s.player.y).toBeCloseTo(CENTER_Y, 1);
  expect(s.animation).toBe('idle');
});

test('W moves where the camera looks', async ({ page }) => {
  await openGame(page);
  await advance(page, 5);
  const before = (await inspect(page)).player;
  // Spawn faces -z. Turning 90 degrees right faces +x.
  await act(page, 'look', pixelsForRadians(Math.PI / 2), 0);
  await advance(page, 1);
  await hold(page, 'KeyW', 60);
  const after = (await inspect(page)).player;
  expect(after.x - before.x).toBeGreaterThan(4);
  expect(Math.abs(after.z - before.z)).toBeLessThan(0.2);
});

test('diagonals are not faster', async ({ page }) => {
  await openGame(page);
  await act(page, 'teleportPlayer', -6, CENTER_Y, 16);
  await advance(page, 5);
  await page.keyboard.down('KeyW');
  await advance(page, 30);
  const straight = (await inspect(page)).speed;
  await page.keyboard.down('KeyD');
  await advance(page, 30);
  const diagonal = (await inspect(page)).speed;
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  expect(straight).toBeGreaterThan(5);
  expect(Math.abs(diagonal - straight) / straight).toBeLessThan(0.02);
});

test('walls keep the player in the arena', async ({ page }) => {
  await openGame(page);
  await act(page, 'teleportPlayer', 0, CENTER_Y, 17);
  await act(page, 'setLook', Math.PI, 0);
  await hold(page, 'KeyW', 300);
  const { player } = await inspect(page);
  expect(player.z).toBeLessThan(20 - 0.3);
  expect(player.z).toBeGreaterThan(19);
});

test('climbs small steps, not walls', async ({ page }) => {
  await openGame(page);
  // In front of the 0.3 m dais, with a 1.1 m low wall behind it.
  await act(page, 'teleportPlayer', 0, CENTER_Y, -3);
  await advance(page, 5);
  await hold(page, 'KeyW', 45);
  const onDais = (await inspect(page)).player;
  expect(onDais.y).toBeGreaterThan(CENTER_Y + 0.25);
  await hold(page, 'KeyW', 150);
  const atWall = (await inspect(page)).player;
  expect(atWall.z).toBeGreaterThan(-11.8);
  expect(atWall.z).toBeLessThan(-10.5);
  expect(atWall.y).toBeLessThan(CENTER_Y + 0.1);
});

test('pitch is clamped', async ({ page }) => {
  await openGame(page);
  await act(page, 'look', 0, -5000);
  await advance(page, 1);
  expect((await inspect(page)).look.pitch).toBeCloseTo(0.9, 5);
  await act(page, 'look', 0, 10000);
  await advance(page, 1);
  expect((await inspect(page)).look.pitch).toBeCloseTo(-0.75, 5);
});

test('camera pushes in before walls', async ({ page }) => {
  await openGame(page);
  await advance(page, 2);
  const free = await inspect(page);
  const freeDistance = distanceToHead(free);
  await act(page, 'teleportPlayer', 0, CENTER_Y, 19.4);
  await advance(page, 2);
  const walled = await inspect(page);
  expect(distanceToHead(walled)).toBeLessThan(freeDistance - 1);
  expect(walled.camera.z).toBeLessThan(20);
});

test('run animation while moving', async ({ page }) => {
  await openGame(page);
  await advance(page, 5);
  await hold(page, 'KeyW', 10);
  expect((await inspect(page)).animation).toBe('run');
  await advance(page, 30);
  expect((await inspect(page)).animation).toBe('idle');
});

test('R resets the player to spawn', async ({ page }) => {
  await openGame(page);
  await hold(page, 'KeyW', 40);
  await page.keyboard.press('KeyR');
  await advance(page, 2);
  const s = await inspect(page);
  expect(s.player.x).toBeCloseTo(0, 1);
  expect(s.player.z).toBeCloseTo(14, 1);
  expect(s.look.yaw).toBe(0);
});

test('prompt shows until the pointer is locked', async ({ page }) => {
  await openGame(page, undefined, { lock: false });
  const prompt = page.locator('#lock-prompt');
  await expect(prompt).toBeVisible();
  await act(page, 'pointerLock', 1);
  await advance(page, 1);
  await expect(prompt).toBeHidden();
  await act(page, 'pointerLock', 0);
  await advance(page, 1);
  await expect(prompt).toBeVisible();
});

function distanceToHead(s: {
  player: { x: number; y: number; z: number };
  camera: { x: number; y: number; z: number };
}): number {
  return Math.hypot(
    s.camera.x - s.player.x,
    s.camera.y - (s.player.y + 0.95),
    s.camera.z - s.player.z,
  );
}
