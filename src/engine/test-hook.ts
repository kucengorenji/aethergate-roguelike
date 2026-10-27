import type { CoreComponents } from './ecs';
import type { Game } from './game';

/**
 * The contract between the game and Playwright tests / agents. Exposed as
 * `window.__game` when `?test` is set (always in dev). Extend `inspect` in the
 * game layer to expose whatever state your tests assert on.
 */
export interface TestHook {
  ready: true;
  backend: string;
  tick: () => number;
  paused: (value?: boolean) => boolean;
  /** Simulate `steps` fixed steps synchronously, then wait for one rendered frame. */
  advance: (steps: number) => Promise<void>;
  /**
   * Simulate `steps` fixed steps without waiting for a frame. For tight loops
   * in tests that only read `inspect()`; DOM and camera update on the next frame.
   */
  advanceSync: (steps: number) => void;
  /** Wait for the next rendered frame. */
  nextFrame: () => Promise<void>;
  /** Per-step CPU time summary in ms. */
  stepTimes: () => { count: number; avg: number; p95: number; max: number };
  resetStepTimes: () => void;
  /** Game-specific snapshot (JSON-serializable). */
  inspect: () => unknown;
  /**
   * Runs a test action, e.g. act('teleportPlayer', x, y, z). Built in:
   * `pointerLock(1 | 0)` simulates pointer lock, `look(dx, dy)` injects mouse movement in pixels.
   */
  act: (name: string, ...args: number[]) => void;
}

export interface TestHookOptions {
  inspect: () => unknown;
  actions?: Record<string, (...args: number[]) => void>;
}

declare global {
  interface Window {
    __game?: TestHook;
  }
}

export function installTestHook<E extends CoreComponents, S>(
  game: Game<E, S>,
  { inspect, actions = {} }: TestHookOptions,
): void {
  if (!game.params.test) return;
  const waiters: (() => void)[] = [];
  game.onAfterRender(() => {
    for (const resolve of waiters.splice(0)) resolve();
  });
  const nextFrame = () =>
    new Promise<void>((resolve) => {
      waiters.push(resolve);
      game.requestFrame();
    });

  const { input } = game.ctx;
  const builtIn: Record<string, (...args: number[]) => void> = {
    pointerLock: (on = 1) => {
      input.setPointerLocked(on !== 0);
    },
    look: (dx = 0, dy = 0) => {
      input.injectLook(dx, dy);
    },
  };

  window.__game = {
    ready: true,
    backend: game.backend,
    tick: () => game.ctx.tick,
    paused: (value) => {
      if (value !== undefined) game.paused = value;
      return game.paused;
    },
    advance: async (steps) => {
      game.advance(steps);
      await nextFrame();
    },
    advanceSync: (steps) => {
      game.advance(steps);
    },
    nextFrame,
    stepTimes: () => game.stepTimes.summary(),
    resetStepTimes: () => {
      game.stepTimes.clear();
    },
    inspect,
    act: (name, ...args) => {
      const action = builtIn[name] ?? actions[name];
      if (!action) throw new Error(`Unknown test action "${name}"`);
      action(...args);
    },
  };
}
