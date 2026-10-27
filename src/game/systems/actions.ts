import { applyDamage } from '../combat/damage';
import { config } from '../config';
import type { Ctx, GameSystem } from '../types';
import type { Entity } from '../components';
import { yawBasis } from './look';

/**
 * The player's exclusive actions: dodge roll (Space), staff bash (F) and flask
 * (Q). Only one runs at a time, and casting waits until it ends.
 */
export const actionsSystem: GameSystem = (ctx) => {
  const { input, dt, state } = ctx;
  if (state.phase !== 'playing') return;
  for (const player of ctx.world.with('player', 'action', 'health', 'look', 'flask', 'body')) {
    const { action, health, look, flask, animator } = player;
    action.dodgeCooldown = Math.max(0, action.dodgeCooldown - dt);
    health.invulnerable = Math.max(0, health.invulnerable - dt);

    if (action.kind !== 'none') {
      action.time += dt;
      if (action.kind === 'dodge' && action.time >= config.dodge.duration) {
        action.dodgeCooldown = config.dodge.cooldown;
        endAction(player);
      } else if (action.kind === 'bash') {
        if (!action.applied && action.time >= config.bash.hitAt) {
          action.applied = true;
          bashHit(ctx, player);
        }
        if (action.time >= config.bash.duration) endAction(player);
      } else if (action.kind === 'drink') {
        if (!action.applied && action.time >= config.flask.healAt) {
          action.applied = true;
          health.current = Math.min(health.max, health.current + config.flask.heal);
        }
        if (action.time >= config.flask.duration) endAction(player);
      }
      continue;
    }

    if (input.wasPressed('Space') && action.dodgeCooldown <= 0) {
      const strafe = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      const forward = input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
      const { fx, fz, rx, rz } = yawBasis(look.yaw);
      let dx = fx * forward + rx * strafe;
      let dz = fz * forward + rz * strafe;
      const len = Math.hypot(dx, dz);
      if (len === 0) {
        dx = fx;
        dz = fz;
      } else {
        dx /= len;
        dz /= len;
      }
      startAction(player, 'dodge');
      action.dirX = dx;
      action.dirZ = dz;
      health.invulnerable = config.dodge.invulnerable;
      animator?.play('dodge', 0.05, 1, true);
      ctx.audio.play('dodge', { volume: 0.5 });
    } else if (input.wasPressed('KeyF')) {
      startAction(player, 'bash');
      animator?.triggerLayer('bash');
      ctx.audio.play('swing', { volume: 0.5 });
    } else if (input.wasPressed('KeyQ') && flask.charges > 0) {
      flask.charges--;
      startAction(player, 'drink');
      animator?.triggerLayer('drink');
      ctx.audio.play('flask', { volume: 0.5 });
    }
  }
};

function startAction(player: Entity, kind: 'dodge' | 'bash' | 'drink'): void {
  Object.assign(player.action!, { kind, time: 0, applied: false });
}

function endAction(player: Entity): void {
  Object.assign(player.action!, { kind: 'none', time: 0, applied: false });
}

/** Damages and knocks back every target in a cone in front of the player. */
function bashHit(ctx: Ctx, player: Entity): void {
  const p = player.body!.translation();
  const { fx, fz } = yawBasis(player.look!.yaw);
  const { range, arcDegrees, damage, knockback } = config.bash;
  const cosHalfArc = Math.cos(((arcDegrees / 2) * Math.PI) / 180);
  for (const target of ctx.world.with('hurtbox', 'health', 'body')) {
    if (target === player) continue;
    const t = target.body.translation();
    const dx = t.x - p.x;
    const dz = t.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist - target.hurtbox.radius > range) continue;
    if (dist > 1e-3 && (dx * fx + dz * fz) / dist < cosHalfArc) continue;
    applyDamage(ctx, target, damage, p, knockback);
  }
}
