/** Runtime switches read from the URL query string. Documented in AGENTS.md. */
export interface LaunchParams {
  /** Seed for the game's Rng. */
  seed: number;
  /** Show debug overlay on start (also toggled with the backquote key). */
  debug: boolean;
  /** Expose `window.__game` for Playwright and console poking. */
  test: boolean;
  /** Start with the fixed-step simulation paused; advance via the test hook. */
  paused: boolean;
  /** Force the WebGL 2 backend. */
  forceWebGL: boolean;
}

export function readLaunchParams(search = window.location.search): LaunchParams {
  const q = new URLSearchParams(search);
  const seed = Number(q.get('seed'));
  return {
    seed: Number.isFinite(seed) && q.has('seed') ? seed : Date.now() % 2 ** 31,
    debug: q.has('debug'),
    test: q.has('test') || import.meta.env.DEV,
    paused: q.has('paused'),
    forceWebGL: q.get('renderer') === 'webgl',
  };
}
