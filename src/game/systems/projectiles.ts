import { burst } from '../combat/burst';
import { applyDamage } from '../combat/damage';
import { WORLD_RAYS } from '../combat/groups';
import { sweepSphereCapsule } from '../combat/hit';
import { ProjectileKind, Team } from '../combat/projectiles';
import type { Entity } from '../components';
import type { GameSystem } from '../types';

const dir = { x: 0, y: 0, z: 0 };
const origin = { x: 0, y: 0, z: 0 };

/**
 * Moves projectiles and resolves what they hit this step: the nearest of level
 * geometry (ray) and enemy-team hurtboxes (swept capsule test). Targets that
 * are invulnerable (mid-dodge) let projectiles pass through.
 */
export const projectilesSystem: GameSystem = (ctx) => {
  const { state, dt, physics, world } = ctx;
  const pool = state.projectiles;
  const targets = [...world.with('hurtbox', 'health', 'body')];
  for (let i = 0; i < pool.capacity; i++) {
    if (!pool.alive[i]) continue;
    pool.life[i]! -= dt;
    if (pool.life[i]! <= 0) {
      // A comet's fuse ends at its aim point: it bursts there instead of fading.
      if (pool.kind[i] === ProjectileKind.Comet) {
        burst(ctx, pool.pos[i * 3]!, pool.pos[i * 3 + 1]!, pool.pos[i * 3 + 2]!);
      }
      pool.release(i);
      continue;
    }
    const o = i * 3;
    const ax = pool.pos[o]!;
    const ay = pool.pos[o + 1]!;
    const az = pool.pos[o + 2]!;
    const mx = pool.vel[o]! * dt;
    const my = pool.vel[o + 1]! * dt;
    const mz = pool.vel[o + 2]! * dt;
    pool.prev[o] = ax;
    pool.prev[o + 1] = ay;
    pool.prev[o + 2] = az;

    const len = Math.hypot(mx, my, mz);
    let bestT = 1;
    let hitTarget: Entity | null = null;
    let hitWall = false;
    if (len > 0) {
      origin.x = ax;
      origin.y = ay;
      origin.z = az;
      dir.x = mx / len;
      dir.y = my / len;
      dir.z = mz / len;
      const wall = physics.castRay(origin, dir, len, undefined, WORLD_RAYS);
      if (wall !== null) {
        bestT = wall / len;
        hitWall = true;
      }
    }
    const team = pool.team[i];
    for (const target of targets) {
      if (target.health.current <= 0 || target.health.invulnerable > 0) continue;
      if ((team === Team.Player) === Boolean(target.player)) continue;
      const c = target.body.translation();
      const s = sweepSphereCapsule(
        ax,
        ay,
        az,
        ax + mx,
        ay + my,
        az + mz,
        pool.radius[i]!,
        c.x,
        c.y,
        c.z,
        target.hurtbox.halfHeight,
        target.hurtbox.radius,
      );
      if (s !== null && s <= bestT) {
        bestT = s;
        hitTarget = target;
      }
    }

    const hx = ax + mx * bestT;
    const hy = ay + my * bestT;
    const hz = az + mz * bestT;
    if ((hitTarget || hitWall) && pool.kind[i] === ProjectileKind.Comet) {
      burst(ctx, hx, hy, hz);
      pool.release(i);
    } else if (hitTarget) {
      applyDamage(ctx, hitTarget, pool.damage[i]!, { from: { x: ax, z: az } });
      impact(ctx, hx, hy, hz, pool.kind[i]!);
      pool.release(i);
    } else if (hitWall) {
      impact(ctx, hx, hy, hz, pool.kind[i]!);
      if (pool.kind[i] === ProjectileKind.Bolt) ctx.audio.play('wall', { volume: 0.25 });
      pool.release(i);
    } else {
      pool.pos[o] = ax + mx;
      pool.pos[o + 1] = ay + my;
      pool.pos[o + 2] = az + mz;
    }
  }
};

function impact(
  ctx: { state: { impacts: { x: number; y: number; z: number; age: number; kind: number }[] } },
  x: number,
  y: number,
  z: number,
  kind: number,
): void {
  if (ctx.state.impacts.length < 64) ctx.state.impacts.push({ x, y, z, age: 0, kind });
}
