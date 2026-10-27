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
  dummy: { health: number; x: number; z: number; down: boolean } | null;
  mode: 'encounter' | 'training' | 'sandbox';
  bodies: number;
  encounter: { status: string; wave: number; total: number; timer: number };
  enemies: {
    kind: string;
    state: string;
    x: number;
    z: number;
    health: number;
    facing: number;
    status: { chill: number; frozen: number; weight: number; rot: number } | null;
  }[];
  skillElement: string | null;
  boons: { primary?: string; skill?: string; dodge?: string; passive?: string; duos: string[] };
  choice: { god: string; options: string[] } | null;
  layout: string;
  run: {
    seed: number | null;
    index: number;
    status: string;
    kind: string | null;
    reward: string | null;
    boons: number;
    shards: number;
    time: number;
    layouts: string[];
    offers: string[];
  };
  doors: { index: number; offer: string; open: boolean; x: number; z: number }[];
  pickups: { reward: string; x: number; z: number }[];
  projectiles: number;
  projectileList: (Vec3 & { kind: number })[];
  skillCooldown: number;
  damageNumbers: number;
  timeScale: number;
  stats: { casts: number; hits: number };
}

/**
 * Opens the game with the test hook and waits until it has rendered a frame.
 * Pointer lock is simulated unless `lock` is false, because headless browsers
 * cannot reliably lock the pointer. The default is training mode (dummy, no
 * waves); the training totem is off unless `totem` is true, so its orbs do not
 * interfere with unrelated tests.
 */
export async function openGame(
  page: Page,
  query = 'test&seed=1&paused&mode=training',
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

export const ENCOUNTER = 'test&seed=1&paused&mode=encounter';
export const RUN = (seed = 7) => `test&seed=${seed}&paused&mode=run`;
export const REWARD = { boon: 0, shards: 1, heal: 2, flask: 3 } as const;
export const SANDBOX = 'test&seed=1&paused&mode=sandbox';
export const KIND = { soldier: 0, caster: 1, knight: 2, hound: 3 } as const;

/**
 * Advances one step at a time inside the page until `done` holds, then renders
 * a frame. One round trip instead of one per step, so it is fast and exact.
 * `done` runs in the browser: it may only use its argument, not outer variables.
 * Returns the number of steps taken.
 */
export async function advanceUntil(
  page: Page,
  done: (s: Snapshot) => boolean,
  maxSteps: number,
): Promise<number> {
  const steps = await page.evaluate(
    ([source, max]) => {
      // The predicate is shipped as source because functions cannot cross into the page.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const check = new Function('s', `return (${source})(s);`) as (s: unknown) => boolean;
      const game = window.__game!;
      for (let n = 1; n <= max; n++) {
        game.advanceSync(1);
        if (check(game.inspect())) return n;
      }
      return -1;
    },
    [done.toString(), maxSteps] as const,
  );
  await page.evaluate(() => window.__game!.nextFrame());
  if (steps < 0) throw new Error(`condition not met within ${maxSteps} steps: ${done.toString()}`);
  return steps;
}

/** Kills waves until the current room's encounter is cleared (or has none). */
export async function clearRoom(page: Page): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const s = await inspect(page);
    if (s.encounter.status === 'cleared' || s.encounter.status === 'off') return;
    if (s.encounter.status === 'active') await act(page, 'killAllEnemies');
    await advanceUntil(
      page,
      (x) => x.encounter.status !== 'active' || x.enemies.every((e) => e.state === 'dying'),
      30,
    );
    await advanceUntil(
      page,
      (x) =>
        ['active', 'cleared', 'off'].includes(x.encounter.status) &&
        x.enemies.every((e) => e.state !== 'dying'),
      400,
    );
  }
  throw new Error('room did not clear');
}

/** Takes the room's reward token and goes through door `door` into the next room. */
export async function takeRewardAndEnter(page: Page, door = 0): Promise<void> {
  await advanceUntil(
    page,
    (s) => s.run.status === 'reward' || s.run.status === 'choosing' || s.run.status === 'complete',
    30,
  );
  if ((await inspect(page)).run.status === 'complete') return;
  await act(page, 'teleportToPickup');
  await advance(page, 2);
  // A Blessing opens a choice of cards first; take the first one.
  if ((await inspect(page)).choice) await page.keyboard.press('Digit1');
  await advanceUntil(page, (s) => s.run.status === 'choosing', 10);
  await act(page, 'teleportToDoor', door);
  await advance(page, 1);
  await page.keyboard.press('KeyE');
  await advanceUntil(page, (s) => s.run.status === 'fighting', 60);
}

/** Boon indexes in BOONS order (src/game/boons/data.ts). */
export const BOON = {
  moonlitBolts: 0,
  rimeComet: 1,
  paleStep: 2,
  coldHeart: 3,
  starfallBolts: 4,
  collapsingComet: 5,
  meteorStep: 6,
  starboundStaff: 7,
  blightedBolts: 8,
  blightComet: 9,
  sporeStep: 10,
  fester: 11,
  arcBolts: 12,
  thunderComet: 13,
  staticStep: 14,
  thunderhead: 15,
  shatter: 16,
  plagueStorm: 17,
} as const;

/**
 * Fires exactly one bolt at the crosshair and waits until it has landed. Holds
 * the button until the cast happens, because hitstop from the previous hit can
 * stretch the cast cooldown past a fixed wait.
 */
export async function shootOnce(page: Page): Promise<void> {
  const casts = (await inspect(page)).stats.casts;
  await page.mouse.down();
  await page.evaluate(
    ([before]) => {
      const game = window.__game!;
      const count = () => (game.inspect() as { stats: { casts: number } }).stats.casts;
      for (let n = 0; n < 60 && count() === before; n++) game.advanceSync(1);
    },
    [casts] as const,
  );
  await page.mouse.up();
  await advanceUntil(page, (s) => s.projectileList.every((p) => p.kind !== 0), 60);
}

/** Hurls one comet and waits until it has burst (including a Collapsing pull). */
export async function cometOnce(page: Page): Promise<void> {
  await page.mouse.down({ button: 'right' });
  await advance(page, 1);
  await page.mouse.up({ button: 'right' });
  await advanceUntil(page, (s) => s.projectileList.every((p) => p.kind !== 2), 90);
  await advance(page, 25);
}
