import { expect, type Page } from '@playwright/test';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Snapshot {
  phase: 'playing' | 'dead';
  elapsed: number;
  locked: boolean;
  player: Vec3;
  look: { yaw: number; pitch: number };
  grounded: boolean;
  speed: number;
  animation: string | null;
  camera: Vec3;
  health: number;
  invulnerable: boolean;
  focus: number;
  flasks: number;
  action: 'none' | 'dodge' | 'bash' | 'drink';
  dummy: { health: number; x: number; z: number; down: boolean };
  projectiles: number;
  projectileList: Vec3[];
  damageNumbers: number;
  timeScale: number;
  stats: { casts: number; hits: number };
}

/**
 * Opens the game with the test hook and waits until it has rendered a frame.
 * Pointer lock is simulated unless `lock` is false, because headless browsers
 * cannot reliably lock the pointer. The training totem is off unless `totem`
 * is true, so its orbs do not interfere with unrelated tests.
 */
export async function openGame(
  page: Page,
  query = 'test&seed=1&paused',
  { lock = true, totem = false }: { lock?: boolean; totem?: boolean } = {},
): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__game?.ready === true);
  if (lock) await act(page, 'pointerLock', 1);
  if (!totem) await act(page, 'totem', 0);
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

/** Holds the left mouse button for `steps` fixed steps. */
export async function holdFire(page: Page, steps: number): Promise<void> {
  await page.mouse.down();
  await advance(page, steps);
  await page.mouse.up();
}

/** The training dummy's chest, a good aim point. */
export const DUMMY_CHEST = [1.2, 1.2, 5] as const;
