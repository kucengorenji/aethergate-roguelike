import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';
import { applyDamage } from './damage';

export interface Target {
  x: number;
  y: number;
  z: number;
  radius: number;
  halfHeight: number;
}

/**
 * Whether a burst at (x, y, z) with `radius` reaches a vertical capsule target:
 * the distance from the burst to the capsule's inner segment, minus its radius.
 */
export function burstReaches(x: number, y: number, z: number, radius: number, t: Target): boolean {
  const dy = Math.max(Math.abs(y - t.y) - t.halfHeight, 0);
  return Math.hypot(x - t.x, dy, z - t.z) - t.radius <= radius;
}

/** Damages and knocks back every living enemy the burst reaches. Returns how many were hit. */
export function burst(ctx: Ctx, x: number, y: number, z: number): number {
  const { radius, damage, knockback } = config.comet;
  let hits = 0;
  const victims: Entity[] = [];
  for (const target of ctx.world.with('enemy', 'body', 'hurtbox', 'health')) {
    if (target.health.current <= 0) continue;
    const p = target.body.translation();
    if (burstReaches(x, y, z, radius, { ...p, ...target.hurtbox })) victims.push(target);
  }
  for (const target of victims) {
    if (applyDamage(ctx, target, damage, { from: { x, z }, knockback })) hits++;
  }
  ctx.state.impacts.push({ x, y, z, age: 0, kind: 2 });
  ctx.state.feedback.shake = Math.max(ctx.state.feedback.shake, config.comet.burstShake);
  ctx.audio.play('burst', { volume: 0.8 });
  return hits;
}

/** Seconds a comet flies before bursting at its aim point, capped by its range. */
export function cometFuse(distance: number): number {
  const { speed, maxRange } = config.comet;
  return Math.max(0.02, Math.min(distance, maxRange) / speed);
}
