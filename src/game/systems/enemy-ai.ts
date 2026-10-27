import { isBoss, phaseFor } from '../ai/bosses';
import { think } from '../ai/brains';
import { turnToward } from '../ai/steering';
import { timeFactor } from '../boons/status';
import { config } from '../config';
import { spawnEnemy } from '../entities/enemy';
import type { Entity } from '../components';
import type { Ctx, GameSystem } from '../types';

/**
 * Runs each enemy's brain: advances its state timers, picks the next state and
 * the velocity it wants, turns it toward the player, and locks the attack
 * direction when a wind-up starts.
 */
export const enemyAiSystem: GameSystem = (ctx) => {
  const { world, dt, state } = ctx;
  const player = world.with('player', 'body', 'health').first;
  const pp = player?.body.translation();
  const alive = state.phase === 'playing' && !!player && player.health.current > 0;
  for (const entity of [...world.with('enemy', 'body', 'health')]) {
    const { enemy, body, health, status } = entity;
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
      const shards = config.hub.bossShards[enemy.kind];
      if (shards) {
        state.run.shards += shards;
        state.message = { text: `+${shards} Lumen shards`, age: 0 };
      }
    }
    if (isBoss(enemy.kind) && enemy.state !== 'dying') {
      enemy.phaseTime += dt;
      const phase = phaseFor(enemy.kind, health.current / health.max);
      if (phase > enemy.phase) changePhase(ctx, entity, phase);
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
      move: enemy.move,
      phase: enemy.phase,
      pattern: enemy.pattern,
    });

    if (decision.state !== enemy.state) {
      // A boss finishing an attack moves on to the next move in its pattern.
      if (enemy.state === 'attack' && enemy.move) enemy.pattern++;
      if (decision.state === 'chase') enemy.move = null;
      if (decision.move) enemy.move = decision.move;
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
    const ranged = enemy.kind === 'caster' || enemy.move === 'well' || enemy.move === 'meteors';
    const tracking = decision.track || (enemy.state === 'windup' && ranged);
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

/**
 * A boss crossed into a new phase: it staggers for a moment, a shockwave pushes
 * the player away, and the Captain loses its shield and calls two soldiers.
 */
function changePhase(
  ctx: Ctx,
  boss: Entity & Required<Pick<Entity, 'enemy' | 'body'>>,
  phase: number,
): void {
  const { enemy, body } = boss;
  enemy.phase = phase;
  enemy.phaseTime = 0;
  enemy.move = null;
  enemy.state = 'stagger';
  // Stagger lasts config.enemy.staggerSeconds; start earlier for the longer phase stagger.
  enemy.time = config.enemy.staggerSeconds - config.enemy.phaseStagger;
  const p = body.translation();
  const player = ctx.world.with('player', 'body', 'locomotion').first;
  if (player) {
    const q = player.body.translation();
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    player.locomotion.velocity.x += (dx / d) * config.enemy.phaseShockwave;
    player.locomotion.velocity.z += (dz / d) * config.enemy.phaseShockwave;
  }
  ctx.state.impacts.push({ x: p.x, y: 0.4, z: p.z, age: 0, kind: 4 });
  ctx.state.feedback.shake = Math.max(ctx.state.feedback.shake, 0.25);
  ctx.audio.play('slam', { volume: 0.8, rate: 0.7 });
  if (enemy.kind === 'captain') {
    enemy.guardBroken = Infinity;
    spawnEnemy(ctx, 'soldier', p.x - 2.5, p.z + 1);
    spawnEnemy(ctx, 'soldier', p.x + 2.5, p.z + 1);
    ctx.state.message = { text: 'The Ward Captain casts its shield aside', age: 0 };
  } else {
    ctx.state.message = {
      text: phase === 2 ? 'Stars begin to fall' : 'The sky burns at the edges',
      age: 0,
    };
  }
}
