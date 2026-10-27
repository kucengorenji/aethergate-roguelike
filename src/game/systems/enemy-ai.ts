import { think } from '../ai/brains';
import { turnToward } from '../ai/steering';
import { timeFactor } from '../boons/status';
import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Runs each enemy's brain: advances its state timers, picks the next state and
 * the velocity it wants, turns it toward the player, and locks the attack
 * direction when a wind-up starts.
 */
export const enemyAiSystem: GameSystem = ({ world, dt, state }) => {
  const player = world.with('player', 'body', 'health').first;
  const pp = player?.body.translation();
  const alive = state.phase === 'playing' && !!player && player.health.current > 0;
  for (const { enemy, body, health, status } of world.with('enemy', 'body', 'health')) {
    // Chill slows an enemy's own clock (wind-ups last longer); frozen stops it.
    const slow = enemy.state === 'dying' ? 1 : timeFactor(status);
    const edt = dt * slow;
    enemy.time += edt;
    enemy.cooldown = Math.max(0, enemy.cooldown - edt);
    enemy.guardBroken = Math.max(0, enemy.guardBroken - dt);
    health.invulnerable = Math.max(0, health.invulnerable - dt);
    if (health.current <= 0 && enemy.state !== 'dying') {
      enemy.state = 'dying';
      enemy.time = 0;
      enemy.collider.setEnabled(false);
    }
    if ((config.enemy.frozen || slow === 0) && enemy.state !== 'dying') {
      enemy.wantX = enemy.wantZ = 0;
      continue;
    }

    const p = body.translation();
    const dx = pp ? pp.x - p.x : 0;
    const dz = pp ? pp.z - p.z : -1;
    const dist = Math.hypot(dx, dz) || 1e-6;
    const decision = think({
      kind: enemy.kind,
      state: enemy.state,
      time: enemy.time,
      cooldown: enemy.cooldown,
      side: enemy.side,
      dist,
      dirX: dx / dist,
      dirZ: dz / dist,
      playerAlive: alive,
    });

    if (decision.state !== enemy.state) {
      enemy.state = decision.state;
      enemy.time = 0;
      enemy.hit = false;
      if (decision.state === 'windup') {
        enemy.aimX = dx / dist;
        enemy.aimZ = dz / dist;
        enemy.facing = Math.atan2(-enemy.aimX, -enemy.aimZ);
      }
      if (decision.state === 'recover' && enemy.kind === 'caster') {
        enemy.cooldown = config.enemies.caster.cooldown;
        enemy.side = enemy.side === 1 ? -1 : 1;
      }
    }
    enemy.wantX = decision.wantX * slow;
    enemy.wantZ = decision.wantZ * slow;

    // Melee wind-ups commit to the aim locked at their start; everything else tracks the player.
    const tracking = decision.track || (enemy.state === 'windup' && enemy.kind === 'caster');
    if (tracking && pp) {
      enemy.aimX = dx / dist;
      enemy.aimZ = dz / dist;
      enemy.facing = turnToward(
        enemy.facing,
        Math.atan2(-enemy.aimX, -enemy.aimZ),
        config.enemy.turnRate * edt,
      );
    }
  }
};
