import { isBoss } from '../ai/bosses';
import type { EnemyState, Entity } from '../components';
import { config } from '../config';
import { enemyGlowColor } from '../entities/enemy';
import { effectsProfile } from '../quality';
import type { GameSystem } from '../types';
import {
  arcEffect,
  auraEffect,
  deathEffect,
  dyingEffect,
  flamesEffect,
  hitEffect,
  impactEffect,
  meteorTrailEffect,
  muzzleEffect,
  risingEffect,
  spawnEffect,
  trailEffect,
} from '../vfx/emitters';
import { meteorAt } from '../vfx/meteor';
import { primaryElement } from '../vfx/palette';

const meteor = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 };

/**
 * Emits effect particles from what happened this step (cosmetic fixed system):
 * new impacts and arcs (age 0, so it runs before `feedbackSystem` ages them),
 * hit marks, projectiles that appeared or flew, enemies rising, dying or under
 * a status, falling meteors and the burning ring. It only spawns and frees
 * particles; drawing evaluates them (`particle-render`). Randomness comes from
 * `state.vfx.rng`, never `ctx.rng`, so gameplay is the same with or without it.
 */
export function createVfxSystem(): GameSystem {
  // What each enemy was doing last step, to catch spawns and deaths as they start.
  const seenState = new WeakMap<Entity, EnemyState>();
  let layout: unknown = null;

  return (ctx) => {
    const { state, dt, world } = ctx;
    const vfx = state.vfx;
    vfx.clock += dt;
    vfx.stepDt = dt;
    vfx.density = effectsProfile(state.save.settings.quality).particles;
    if (state.layout !== layout) {
      // A new room: nothing from the old one keeps floating in it.
      layout = state.layout;
      vfx.particles.clear();
    }
    vfx.particles.expire(vfx.clock);

    const player = world.with('player', 'boons', 'skill').first;
    const primary = primaryElement(player?.boons.held);
    const skill = player?.skill.element ?? null;

    const pool = state.projectiles;
    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.alive[i]) {
        vfx.seen[i] = 0;
        continue;
      }
      const o = i * 3;
      const ax = pool.prev[o]!;
      const ay = pool.prev[o + 1]!;
      const az = pool.prev[o + 2]!;
      const bx = pool.pos[o]!;
      const by = pool.pos[o + 1]!;
      const bz = pool.pos[o + 2]!;
      const step = Math.hypot(bx - ax, by - ay, bz - az);
      // A slot reused for a new shot shows up as a life that went back up.
      const fresh = !vfx.seen[i] || pool.life[i]! > vfx.lastLife[i]!;
      const kind = pool.kind[i]!;
      const look = pool.look[i]!;
      if (fresh) {
        vfx.flown[i] = step;
        const v = pool.vel;
        muzzleEffect(vfx, kind, look, ax, ay, az, v[o]!, v[o + 1]!, v[o + 2]!, primary, skill);
      } else {
        vfx.flown[i]! += step;
      }
      vfx.seen[i] = 1;
      vfx.lastLife[i] = pool.life[i]!;
      trailEffect(vfx, kind, look, ax, ay, az, bx, by, bz, primary, skill);
    }

    for (const im of state.impacts) if (im.age === 0) impactEffect(vfx, im, primary, skill);
    for (const hit of state.hits) hitEffect(vfx, hit);
    state.hits.length = 0;
    for (const a of state.arcs) if (a.age === 0) arcEffect(vfx, a.x2, a.y2, a.z2);

    for (const entity of world.with('enemy', 'body', 'hurtbox')) {
      const { enemy, hurtbox, status } = entity;
      const before = seenState.get(entity);
      seenState.set(entity, enemy.state);
      const p = entity.body.translation();
      const boss = isBoss(enemy.kind);
      const glow = enemyGlowColor(enemy.kind);
      const ring = hurtbox.radius + 0.6;
      if (enemy.state === 'rising') {
        if (before === undefined) spawnEffect(vfx, p.x, p.z, ring, glow, boss);
        risingEffect(vfx, p.x, p.z, ring, glow, boss);
      } else if (enemy.state === 'dying') {
        if (before !== 'dying') deathEffect(vfx, p.x, p.y, p.z, hurtbox.radius, glow, boss);
        const done = Math.min(1, enemy.time / config.enemy.dyingSeconds);
        dyingEffect(vfx, p.x, p.y, p.z, hurtbox.radius, done, boss);
      } else if (status) {
        auraEffect(vfx, status, p.x, p.y, p.z, hurtbox.radius, hurtbox.halfHeight);
      }
    }

    for (const { body, hurtbox, status } of world.with('dummy', 'body', 'hurtbox', 'status')) {
      const p = body.translation();
      auraEffect(vfx, status, p.x, p.y, p.z, hurtbox.radius, hurtbox.halfHeight);
    }

    for (const h of state.hazards) {
      if (meteorAt(h.x, h.z, h.time, meteor)) {
        meteorTrailEffect(vfx, meteor.x, meteor.y, meteor.z, h.radius / 1.8);
      }
    }
    if (state.burnRing !== null) flamesEffect(vfx, state.burnRing);
  };
}
