import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';

/**
 * Applies damage to an entity with health, honoring invulnerability. Triggers
 * the hit flash, a damage number, and hit or hurt feedback. Returns whether the
 * damage landed.
 */
export function applyDamage(
  ctx: Ctx,
  target: Entity,
  amount: number,
  from?: { x: number; z: number },
  knockback = 0,
): boolean {
  const { health, body, hurtbox } = target;
  if (!health || health.current <= 0 || health.invulnerable > 0) return false;
  health.current = Math.max(0, health.current - amount);

  if (target.flash) target.flash.time = config.feedback.flashSeconds;
  const p = body?.translation();
  if (p) {
    const top = hurtbox ? hurtbox.halfHeight + hurtbox.radius : 1;
    ctx.state.damageNumbers.push({ x: p.x, y: p.y + top + 0.15, z: p.z, value: amount, age: 0 });
  }

  const { feedback } = ctx.state;
  if (target.player) {
    feedback.shake = config.feedback.hurtShake;
    feedback.hurt = 1;
    ctx.audio.play('hurt', { volume: 0.7 });
  } else {
    feedback.hitstop = config.feedback.hitstopSteps;
    ctx.state.stats.hits++;
    ctx.audio.play('hit', { volume: 0.6, rate: ctx.rng.range(0.9, 1.1) });
  }

  if (knockback > 0 && from && p && target.dummy) {
    const dx = p.x - from.x;
    const dz = p.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    target.dummy.velocity.x += (dx / len) * knockback;
    target.dummy.velocity.z += (dz / len) * knockback;
  }
  return true;
}
