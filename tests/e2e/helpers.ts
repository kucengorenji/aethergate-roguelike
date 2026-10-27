import { expect, type Page } from '@playwright/test';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Snapshot {
  elapsed: number;
  locked: boolean;
  player: Vec3;
  look: { yaw: number; pitch: number };
  grounded: boolean;
  speed: number;
  animation: string | null;
  camera: Vec3;
}

/**
 * Opens the game with the test hook and waits until it has rendered a frame.
 * Pointer lock is simulated unless `lock` is false, because headless browsers
 * cannot reliably lock the pointer.
 */
export async function openGame(
  page: Page,
  query = 'test&seed=1&paused',
  { lock = true }: { lock?: boolean } = {},
): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__game?.ready === true);
  if (lock) await act(page, 'pointerLock', 1);
  await page.evaluate(() => window.__game!.nextFrame());
  expect(errors, 'page errors during startup').toEqual([]);
}

export function inspect(page: Page): Promise<Snapshot> {
  return page.evaluate(() => window.__game!.inspect() as Snapshot);
}

export async function advance(page: Page, steps: number): Promise<void> {
  await page.evaluate((n) => window.__game!.advance(n), steps);
}

export async function act(page: Page, name: string, ...args: number[]): Promise<void> {
  await page.evaluate(
    ([n, a]) => {
      window.__game!.act(n, ...a);
    },
    [name, args] as const,
  );
}

/** Holds `keys` together for `steps` fixed steps of simulated time. */
export async function hold(page: Page, keys: string | string[], steps: number): Promise<void> {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) await page.keyboard.down(key);
  await advance(page, steps);
  for (const key of list) await page.keyboard.up(key);
}

/** Mouse pixels for a yaw change in radians, matching `config.look.sensitivity`. */
export const pixelsForRadians = (radians: number, sensitivity = 0.0022): number =>
  radians / sensitivity;
