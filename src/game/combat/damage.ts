import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';
import { isBoss } from '../ai/bosses';
import { inFrontArc } from './guard';

export interface HitOptions {
  /** Where the hit comes from (projectile position, attacker), for guards and knockback. */
  from?: { x: number; z: number };
  /** Push speed in m/s away from `from`. */
  knockback?: number;
  /** Interrupts the target's action and breaks guards (staff bash). */
  staggers?: boolean;
  /** Damage over time and arcs: no hitstop or hit sound, so ticks do not stutter the game. */
  quiet?: boolean;
}

/**
 * Applies damage to an entity with health, honoring invulnerability and
 * shields. Triggers the hit flash, a damage number, and hit or hurt feedback.
 * Returns whether the damage landed.
 */
export function applyDamage(
  ctx: Ctx,
  target: Entity,
  amount: number,
  options: HitOptions = {},
): boolean {
  const { health, body, hurtbox, enemy } = target;
  if (!health || health.current <= 0 || health.invulnerable > 0) return false;
  const { from, knockback = 0, staggers = false, quiet = false } = options;
  const p = body?.translation();

  if (
    enemy &&
    p &&
    from &&
    guardUp(target) &&
    inFrontArc(enemy.facing, p.x, p.z, from.x, from.z, config.enemies.knight.guardArcDegrees)
  ) {
    if (staggers) {
      enemy.guardBroken = config.enemies.knight.guardBreak;
      stagger(target, config.enemies.knight.guardBreak, true);
      ctx.audio.play('guardbreak', { volume: 0.7 });
    } else {
      ctx.audio.play('block', { volume: 0.5, rate: ctx.rng.range(0.9, 1.1) });
    }
    return false;
  }

  health.current = Math.max(0, health.current - amount);
  if (target.flash) target.flash.time = config.feedback.flashSeconds;
  if (p) {
    const top = hurtbox ? hurtbox.halfHeight + hurtbox.radius : 1;
    ctx.state.damageNumbers.push({
      x: p.x,
      y: p.y + top + 0.15,
      z: p.z,
      value: Math.round(amount),
      age: 0,
    });
  }

  const { feedback } = ctx.state;
  if (target.player) {
    feedback.shake = config.feedback.hurtShake;
    feedback.hurt = 1;
    ctx.audio.play('hurt', { volume: 0.7 });
  } else if (!quiet) {
    feedback.hitstop = config.feedback.hitstopSteps;
    ctx.state.stats.hits++;
    ctx.audio.play('hit', { volume: 0.6, rate: ctx.rng.range(0.9, 1.1) });
  }

  if (from && p) {
    const dx = p.x - from.x;
    const dz = p.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const push = knockback || (enemy ? config.enemy.flinchPush : 0);
    if (target.dummy) {
      target.dummy.velocity.x += (dx / len) * push;
      target.dummy.velocity.z += (dz / len) * push;
    } else if (enemy) {
      enemy.pushX += (dx / len) * push;
      enemy.pushZ += (dz / len) * push;
    }
  }
  if (staggers && enemy && health.current > 0) stagger(target, config.enemy.staggerSeconds);
  return true;
}

/** Knights and the Captain hold their shield up unless the guard is broken or they are mid-swing. */
export function guardUp(target: Entity): boolean {
  const e = target.enemy;
  if (!e || (e.kind !== 'knight' && e.kind !== 'captain') || e.guardBroken > 0) return false;
  return e.state === 'chase' || e.state === 'windup' || e.state === 'rising';
}

function stagger(target: Entity, seconds: number, guardBreak = false): void {
  const e = target.enemy!;
  if (e.state === 'dying' || e.state === 'rising') return;
  // Bosses shrug off staggers, except a broken guard.
  if (isBoss(e.kind) && !guardBreak) return;
  e.move = null;
  e.state = 'stagger';
  // Stagger lasts config.enemy.staggerSeconds; start later for a longer one.
  e.time = config.enemy.staggerSeconds - seconds;
  e.hit = false;
}
