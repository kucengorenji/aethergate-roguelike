import { isBoss } from '../ai/bosses';
import type { EnemyKind } from '../components';
import type { Wave } from '../run/plan';
import { config } from '../config';
import { despawnEnemy, ENEMY_KINDS, spawnEnemy } from '../entities/enemy';
import type { Ctx, GameSystem } from '../types';

/**
 * The encounter: waits for the pointer lock, then runs the configured waves.
 * A wave ends when none of its enemies is left standing; the last one clears
 * the chamber.
 */
export const wavesSystem: GameSystem = (ctx) => {
  const { state, input, dt } = ctx;
  const enc = state.encounter;
  if (enc.status === 'off' || enc.status === 'cleared' || state.phase !== 'playing') return;
  enc.timer += dt;
  switch (enc.status) {
    case 'waiting':
      if (!input.locked) enc.timer = 0;
      else if (enc.timer >= enc.startDelay) startWave(ctx, 0);
      break;
    case 'intermission':
      if (enc.timer >= config.encounter.intermission) startWave(ctx, enc.wave + 1);
      break;
    case 'active': {
      let standing = 0;
      for (const { enemy } of ctx.world.with('enemy')) if (enemy.state !== 'dying') standing++;
      if (standing > 0) break;
      enc.timer = 0;
      if (enc.wave + 1 < enc.total) {
        enc.status = 'intermission';
      } else {
        enc.status = 'cleared';
        ctx.audio.play('cleared', { volume: 0.6 });
      }
      break;
    }
  }
};

export function startWave(ctx: Ctx, index: number): void {
  const enc = ctx.state.encounter;
  enc.status = 'active';
  enc.wave = index;
  enc.timer = 0;
  const wave = enc.waves[index] ?? {};
  const kinds: EnemyKind[] = [];
  for (const kind of ENEMY_KINDS) for (let i = 0; i < (wave[kind] ?? 0); i++) kinds.push(kind);
  const points = spawnPoints(ctx, kinds.length);
  kinds.forEach((kind, i) => {
    // Bosses take the layout's first spawn point: the far end, facing the entrance.
    const pt = isBoss(kind) ? ctx.state.layout.enemySpawns[0]! : points[i % points.length]!;
    // Several enemies on one point get spread around it.
    const ring = Math.floor(i / points.length);
    spawnEnemy(ctx, kind, pt.x + ring * 1.2, pt.z + ring * 0.8);
  });
  ctx.audio.play('wave', { volume: 0.5 });
}

/** Spawn points at least the minimum distance from the player, shuffled by the seeded RNG. */
function spawnPoints(ctx: Ctx, count: number): { x: number; z: number }[] {
  const p = ctx.world.with('player', 'body').first?.body.translation() ?? { x: 0, z: 0 };
  const all = ctx.state.layout.enemySpawns.map((s) => ({
    ...s,
    d: Math.hypot(s.x - p.x, s.z - p.z),
  }));
  let far = all.filter((s) => s.d >= config.encounter.minSpawnDistance);
  if (far.length < Math.min(count, 3))
    far = [...all].sort((a, b) => b.d - a.d).slice(0, Math.max(3, count));
  for (let i = far.length - 1; i > 0; i--) {
    const j = ctx.rng.int(0, i);
    [far[i], far[j]] = [far[j]!, far[i]!];
  }
  return far;
}

/** Removes every enemy and returns the encounter to waiting for wave 1. */
export function resetEncounter(ctx: Ctx): void {
  removeEnemies(ctx);
  const enc = ctx.state.encounter;
  if (enc.status === 'off') return;
  Object.assign(enc, { status: 'waiting', wave: 0, timer: 0 });
}

/** Sets up the encounter for a room: its waves, or none (status off). */
export function setEncounter(ctx: Ctx, waves: Wave[], startDelay: number): void {
  removeEnemies(ctx);
  Object.assign(ctx.state.encounter, {
    status: waves.length > 0 ? 'waiting' : 'off',
    waves,
    startDelay,
    wave: 0,
    total: waves.length,
    timer: 0,
  });
}

function removeEnemies(ctx: Ctx): void {
  for (const e of [...ctx.world.with('enemy')]) despawnEnemy(ctx, e);
}
