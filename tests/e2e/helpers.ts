import { expect, type Page } from '@playwright/test';

export interface Snapshot {
  phase: 'playing' | 'won';
  score: number;
  total: number;
  elapsed: number;
  gemsLeft: number;
  player: { x: number; y: number; z: number } | null;
  gems: { x: number; z: number }[];
}

/** Opens the game with the test hook and waits until it has rendered a frame. */
export async function openGame(page: Page, query = 'test&seed=1&paused'): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__game?.ready === true);
  await page.evaluate(() => window.__game!.nextFrame());
  expect(errors, 'page errors during startup').toEqual([]);
}

export function inspect(page: Page): Promise<Snapshot> {
  return page.evaluate(() => window.__game!.inspect() as Snapshot);
}

export async function advance(page: Page, steps: number): Promise<void> {
  await page.evaluate((n) => window.__game!.advance(n), steps);
}

/** Holds `key` for `steps` fixed steps of simulated time. */
export async function hold(page: Page, key: string, steps: number): Promise<void> {
  await page.keyboard.down(key);
  await advance(page, steps);
  await page.keyboard.up(key);
}
