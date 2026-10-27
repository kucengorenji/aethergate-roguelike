import { expect, test, type Page } from '@playwright/test';
import {
  act,
  advance,
  advanceUntil,
  BOON,
  DUMMY_CHEST,
  HUB,
  inspect,
  KIND,
  openGame,
  QUALITY,
  REWARD,
  RUN,
  SANDBOX,
  shootOnce,
  STAFF,
  STATUS,
  type Snapshot,
} from './helpers';

// Effects (spec 0014). They are cosmetic: these tests read what is drawn
// through inspect().vfx, which uses the same functions as the renderers.

/** Holds fire until exactly one cast happened, then lets go. */
async function castOne(page: Page): Promise<void> {
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
}

/** Steps one at a time and collects `pick` from every snapshot until `done`. */
async function record<T>(
  page: Page,
  pick: (s: Snapshot) => T,
  done: (s: Snapshot) => boolean,
  maxSteps: number,
): Promise<T[]> {
  return page.evaluate(
    ([pickSource, doneSource, max]) => {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const p = new Function('s', `return (${pickSource})(s);`) as (s: unknown) => T;
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const d = new Function('s', `return (${doneSource})(s);`) as (s: unknown) => boolean;
      const game = window.__game!;
      const out: T[] = [];
      for (let n = 0; n < max; n++) {
        game.advanceSync(1);
        const s = game.inspect();
        out.push(p(s));
        if (d(s)) break;
      }
      return out;
    },
    [pick.toString(), done.toString(), maxSteps] as const,
  );
}

test('every staff draws its own trail from the staff and bursts on impact', async ({ page }) => {
  const longest: Record<string, number> = {};
  for (const [name, staff] of Object.entries(STAFF)) {
    await openGame(page);
    await act(page, 'setStaff', staff);
    await act(page, 'aimAt', ...DUMMY_CHEST);
    await castOne(page);
    const first = await inspect(page);
    expect(first.vfx.trails.length, name).toBe(name === 'scatter' ? 3 : 1);
    expect(first.vfx.emitted.muzzle, name).toBeGreaterThan(0);
    // A trail never reaches back past the staff: at most as long as the bolt has flown.
    const trails = await record(
      page,
      (s) => s.vfx.trails.map((t) => ({ length: t.length, flown: t.flown })),
      (s) => s.vfx.trails.length === 0,
      60,
    );
    for (const step of trails) for (const t of step) expect(t.length).toBeLessThanOrEqual(t.flown);
    longest[name] = Math.max(...trails.flat().map((t) => t.length));
    expect((await inspect(page)).vfx.emitted.impact, name).toBeGreaterThan(0);
  }
  expect(longest.scatter!).toBeLessThan(longest.glint!);
  expect(longest.glint!).toBeLessThan(longest.lance!);
});

test('a primary blessing tints bolts and caster orbs are green', async ({ page }) => {
  await openGame(page);
  await act(page, 'aimAt', ...DUMMY_CHEST);
  for (const [boon, color] of [
    [null, 'bolt'],
    [BOON.moonlitBolts, 'frost'],
    [BOON.starfallBolts, 'gravity'],
    [BOON.blightedBolts, 'rot'],
    [BOON.arcBolts, 'storm'],
  ] as const) {
    if (boon !== null) await act(page, 'grantBoon', boon);
    await castOne(page);
    const s = await inspect(page);
    expect(s.vfx.trails[0]?.color, color).toBe(s.vfx.palette[color]);
    await advanceUntil(page, (x) => x.vfx.trails.length === 0, 60);
  }

  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.caster, 0, 4);
  await advanceUntil(page, (s) => s.vfx.trails.some((t) => t.kind === 1), 600);
  const s = await inspect(page);
  expect(s.vfx.trails.find((t) => t.kind === 1)?.color).toBe(s.vfx.palette.thorn);
});

test('the comet flashes, trails embers and rings out to its damage radius', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'grantBoon', BOON.rimeComet);
  await act(page, 'aimAt', 0, 0.05, 4);
  await page.mouse.down({ button: 'right' });
  await advance(page, 1);
  await page.mouse.up({ button: 'right' });
  const cast = await inspect(page);
  expect(cast.vfx.emitted.comet).toBeGreaterThan(0);
  const comet = cast.vfx.trails.find((t) => t.kind === 2);
  expect(comet?.color).toBe(cast.vfx.palette.frost);

  const flight = await record(
    page,
    (s) => ({
      trail: s.vfx.trails.some((t) => t.kind === 2),
      shed: s.vfx.emitted.comet,
      ring: s.vfx.decals
        .filter((d) => d.kind === 'shock')
        .map((d) => ({ reach: d.sx * d.progress, radius: d.sx })),
    }),
    (s) => s.projectileList.every((p) => p.kind !== 2) && s.vfx.decals.length === 0,
    120,
  );
  expect(flight.some((f) => f.trail)).toBe(true);
  expect(flight.at(-1)!.shed).toBeGreaterThan(cast.vfx.emitted.comet!);
  const rings = flight.flatMap((f) => f.ring);
  expect(rings.length).toBeGreaterThan(0);
  expect(Math.max(...rings.map((r) => r.reach))).toBeGreaterThanOrEqual(rings[0]!.radius * 0.95);
});

test('statuses show their auras and arcs draw lightning', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  for (const x of [-3, -1, 1, 3]) await act(page, 'spawnEnemy', KIND.soldier, x, 6);
  await act(page, 'addStatus', 0, STATUS.chill, 2);
  await act(page, 'addStatus', 1, STATUS.weight, 2);
  await act(page, 'addStatus', 2, STATUS.rot, 3);
  await act(page, 'addStatus', 3, STATUS.freeze, 0);
  await advance(page, 40);
  const s = await inspect(page);
  for (const aura of ['chill', 'weight', 'rot', 'frozen']) {
    expect(s.vfx.emitted[aura], aura).toBeGreaterThan(0);
  }
  expect(s.vfx.ice).toBe(1);
  const weight = s.vfx.decals.filter((d) => d.kind === 'weight');
  expect(weight).toHaveLength(1);
  expect(weight[0]!.x).toBeCloseTo(-1, 1);

  await act(page, 'grantBoon', BOON.arcBolts);
  await act(page, 'aimAt', 1, 1.2, 6);
  await castOne(page);
  await advanceUntil(page, (x) => x.vfx.lightning > 0, 60);
  expect((await inspect(page)).vfx.emitted.arc).toBeGreaterThan(0);
});

test('hits, hurts and blocks throw sparks', async ({ page }) => {
  await openGame(page);
  await act(page, 'aimAt', ...DUMMY_CHEST);
  await shootOnce(page);
  expect((await inspect(page)).vfx.emitted.hit).toBeGreaterThan(0);
  await act(page, 'fireOrbAtPlayer', 0, 1.1, 10);
  await advanceUntil(page, (s) => s.health < 100, 120);
  expect((await inspect(page)).vfx.emitted.hurt).toBeGreaterThan(0);

  await openGame(page, SANDBOX);
  await act(page, 'freezeEnemies', 1);
  await act(page, 'spawnEnemy', KIND.knight, 0, 6);
  // Yaw pi faces +z, toward the player at the entrance.
  await act(page, 'setEnemyFacing', 0, Math.PI);
  await act(page, 'aimAt', 0, 1.2, 6);
  await shootOnce(page);
  const s = await inspect(page);
  expect(s.enemies[0]!.health).toBe(120);
  expect(s.vfx.emitted.block).toBeGreaterThan(0);
  expect(s.vfx.emitted.hit).toBe(0);
});

test('enemies rise through a ring and die in ash, bosses with a shockwave', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.soldier, -2, 6, 1);
  await advance(page, 20);
  let s = await inspect(page);
  const ring = s.vfx.decals.find((d) => d.kind === 'spawn');
  expect(ring?.progress).toBeGreaterThan(0.2);
  expect(ring?.progress).toBeLessThan(1);
  expect(s.vfx.emitted.spawn).toBeGreaterThan(0);
  await advanceUntil(page, (x) => x.enemies[0]!.state !== 'rising', 120);
  expect((await inspect(page)).vfx.decals.some((d) => d.kind === 'spawn')).toBe(false);

  await act(page, 'killAllEnemies');
  await advance(page, 3);
  s = await inspect(page);
  expect(s.vfx.emitted.death).toBeGreaterThan(0);
  expect(s.vfx.decals.some((d) => d.kind === 'death')).toBe(false);
  const soldierAsh = s.vfx.emitted.death!;

  // Index-based actions only stay reliable with a single enemy, so the boss gets its own room.
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.captain, 2, 4);
  await act(page, 'killAllEnemies');
  await advance(page, 3);
  s = await inspect(page);
  expect(s.vfx.decals.some((d) => d.kind === 'death')).toBe(true);
  expect(s.vfx.emitted.death).toBeGreaterThan(soldierAsh);
});

/**
 * Spawns one enemy, then records its telegraph decal's fill through the
 * wind-up and on the strike step.
 */
async function telegraphFill(
  page: Page,
  kind: number,
  x: number,
  z: number,
  decal: string,
  pattern?: number,
): Promise<{ windup: number[]; strike: number | null }> {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', kind, x, z);
  if (pattern !== undefined) await act(page, 'setEnemyPattern', 0, pattern);
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'windup', 600);
  const steps = await page.evaluate(
    ([name]) => {
      const game = window.__game!;
      const out: { state: string; fill: number | null }[] = [];
      for (let n = 0; n < 300; n++) {
        const s = game.inspect() as Snapshot;
        const d = s.vfx.decals.find((x) => x.kind === name);
        out.push({ state: s.enemies[0]!.state, fill: d ? d.progress : null });
        if (s.enemies[0]!.state !== 'windup') break;
        game.advanceSync(1);
      }
      return out;
    },
    [decal] as const,
  );
  return {
    windup: steps.filter((st) => st.state === 'windup').map((st) => st.fill ?? -1),
    strike: steps.at(-1)!.fill,
  };
}

for (const [name, kind, x, z, decal, pattern] of [
  ['knight slam', KIND.knight, 0, 11.6, 'slam'],
  ['soldier sword arc', KIND.soldier, 0, 12.4, 'sword'],
  ['hound leap', KIND.hound, 0, 9.5, 'leap'],
  ['Captain slam', KIND.captain, 0, 12, 'slam'],
  ['Captain charge', KIND.captain, 0, 3, 'charge'],
  ['Starfallen sweep', KIND.starfallen, 0, 11.5, 'sweep', 0],
] as const) {
  test(`the ${name} telegraph fills to its rim at the strike moment`, async ({ page }) => {
    const { windup, strike } = await telegraphFill(page, kind, x, z, decal, pattern);
    expect(windup.length).toBeGreaterThan(5);
    expect(windup[0]).toBeGreaterThan(0);
    for (let i = 1; i < windup.length; i++) expect(windup[i]!).toBeGreaterThan(windup[i - 1]!);
    expect(windup.at(-1)).toBe(1);
    expect(strike).toBe(1);
  });
}

test('the gravity well telegraph fills through its pull and is full when it detonates', async ({
  page,
}) => {
  const well = await telegraphFill(page, KIND.starfallen, 0, 8, 'well', 1);
  expect(well.windup.at(-1)!).toBeLessThan(1);
  const pull = await record(
    page,
    (s) => ({ state: s.enemies[0]!.state, fill: s.vfx.decals.find((d) => d.kind === 'well') }),
    (s) => s.enemies[0]!.state !== 'attack',
    200,
  );
  const charging = pull.filter((p) => p.state === 'attack');
  expect(charging.at(-1)!.fill?.progress).toBe(1);
});

test('meteors fall onto full markers and the burning edge shows in phase 3', async ({ page }) => {
  await openGame(page, SANDBOX);
  await act(page, 'spawnEnemy', KIND.starfallen, 0, 4);
  await act(page, 'setEnemyHealth', 0, 900);
  await advanceUntil(
    page,
    (s) => s.enemies[0]!.phase === 2 && s.enemies[0]!.state === 'chase',
    120,
  );
  await act(page, 'setEnemyPattern', 0, 1);
  await advanceUntil(page, (s) => s.hazards.length > 0, 120);
  await act(page, 'freezeEnemies', 1);
  const count = (await inspect(page)).hazards.length;
  expect((await inspect(page)).vfx.decals.filter((d) => d.kind === 'meteor')).toHaveLength(count);
  const fall = await record(
    page,
    (s) => ({
      hazards: s.hazards.length,
      falling: s.vfx.meteors,
      fill: Math.min(...s.vfx.decals.filter((d) => d.kind === 'meteor').map((d) => d.progress)),
    }),
    (s) => s.hazards.length === 0,
    120,
  );
  expect(fall.some((f) => f.falling === count)).toBe(true);
  const last = fall.filter((f) => f.hazards > 0).at(-1)!;
  expect(last.fill).toBe(1);
  expect((await inspect(page)).vfx.emitted.meteor).toBeGreaterThan(0);

  await act(page, 'freezeEnemies', 0);
  await act(page, 'setEnemyHealth', 0, 300);
  await advanceUntil(page, (s) => s.burnRing !== null, 240);
  await advance(page, 10);
  const s = await inspect(page);
  const burn = s.vfx.decals.find((d) => d.kind === 'burn');
  expect(burn!.param * burn!.sx).toBeCloseTo(s.burnRing!, 1);
  expect(s.vfx.emitted.flame).toBeGreaterThan(0);
});

test('ash drifts in the hall and in a run room', async ({ page }) => {
  await openGame(page, HUB);
  await advance(page, 5);
  expect((await inspect(page)).vfx.ash).toBeGreaterThan(0);
  const shot = async () => page.screenshot();
  const before = await shot();
  await advance(page, 60);
  // Only the air moves: the scene is otherwise still.
  expect((await shot()).equals(before)).toBe(false);

  await openGame(page, RUN());
  await act(page, 'goToRoom', 3, REWARD.shards);
  await advance(page, 5);
  expect((await inspect(page)).vfx.ash).toBeGreaterThan(0);
});

test('quality scales bloom, particles and ash', async ({ page }) => {
  const comet = async (quality: number) => {
    await openGame(page, SANDBOX);
    await act(page, 'setQuality', quality);
    await act(page, 'aimAt', 0, 0.05, 6);
    await page.mouse.down({ button: 'right' });
    await advance(page, 1);
    await page.mouse.up({ button: 'right' });
    await advanceUntil(page, (s) => s.projectileList.every((p) => p.kind !== 2), 90);
    return inspect(page);
  };
  const low = await comet(QUALITY.low);
  const medium = await comet(QUALITY.medium);
  const high = await comet(QUALITY.high);
  expect([low.vfx.bloom, medium.vfx.bloom, high.vfx.bloom]).toEqual([false, true, true]);
  expect(low.vfx.ash).toBeLessThan(medium.vfx.ash);
  expect(medium.vfx.ash).toBeLessThan(high.vfx.ash);
  expect(low.vfx.emitted.comet!).toBeLessThan(high.vfx.emitted.comet!);
});

test('effects never change gameplay randomness', async ({ page }) => {
  // The boss's meteors are placed with ctx.rng; effects at Low spawn far fewer
  // particles than at High, which must not move a single meteor.
  const meteors = async (quality: number) => {
    await openGame(page, SANDBOX);
    await act(page, 'setQuality', quality);
    await act(page, 'spawnEnemy', KIND.starfallen, 0, 4);
    await act(page, 'setEnemyHealth', 0, 900);
    await advanceUntil(
      page,
      (s) => s.enemies[0]!.phase === 2 && s.enemies[0]!.state === 'chase',
      120,
    );
    await act(page, 'setEnemyPattern', 0, 1);
    await advanceUntil(page, (s) => s.hazards.length > 0, 120);
    const s = await inspect(page);
    return { hazards: s.hazards, emitted: Object.values(s.vfx.emitted).reduce((a, b) => a + b) };
  };
  const low = await meteors(QUALITY.low);
  const high = await meteors(QUALITY.high);
  expect(low.emitted).toBeLessThan(high.emitted);
  expect(low.hazards).toEqual(high.hazards);
});

test('the WebGL 2 backend renders the post chain without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await openGame(page, 'test&seed=1&paused&mode=sandbox&renderer=webgl');
  expect(await page.evaluate(() => window.__game!.backend)).toBe('webgl2');
  await act(page, 'spawnEnemy', KIND.knight, 0, 11.6);
  await advanceUntil(page, (s) => s.enemies[0]!.state === 'windup', 300);
  await advance(page, 10);
  const s = await inspect(page);
  expect(s.vfx.bloom).toBe(true);
  expect(s.vfx.decals.some((d) => d.kind === 'slam')).toBe(true);
  expect(errors).toEqual([]);
});
