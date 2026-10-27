import type { RAPIER } from '@engine/physics';
import { separation, type Disc } from '../ai/steering';
import { ENEMY_GROUPS } from '../combat/groups';
import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Moves enemies through one shared character controller: the brain's desired
 * velocity, plus separation from other enemies and the player, plus decaying
 * knockback. Attacks with movement (lunges, leaps) set their own velocity.
 * Without a navmesh, an enemy blocked by cover walks sideways along it for a
 * moment (detour), which gets it around the sparse cover in our arenas.
 */
const DETOUR_AFTER = 0.35;
const DETOUR_SECONDS = 0.8;

export function createEnemyMotionSystem(
  controller: RAPIER.KinematicCharacterController,
): GameSystem {
  const discs: Disc[] = [];
  return ({ world, dt }) => {
    discs.length = 0;
    const enemies = [...world.with('enemy', 'body', 'hurtbox')];
    for (const e of enemies) {
      const p = e.body.translation();
      discs.push({ x: p.x, z: p.z, radius: e.hurtbox.radius });
    }
    const player = world.with('player', 'body', 'hurtbox').first;
    if (player) {
      const p = player.body.translation();
      discs.push({ x: p.x, z: p.z, radius: player.hurtbox.radius });
    }

    enemies.forEach(({ enemy, body }, i) => {
      if (enemy.state === 'dying' || enemy.state === 'rising') return;
      let vx = enemy.wantX;
      let vz = enemy.wantZ;
      if (enemy.detour > 0) {
        enemy.detour -= dt;
        const t = vx;
        vx = -vz * enemy.side;
        vz = t * enemy.side;
      }
      if (enemy.state === 'attack') {
        const k = config.enemies[enemy.kind];
        const lunge = 'lunge' in k ? k.lunge : 'leapSpeed' in k ? k.leapSpeed : 0;
        vx = enemy.aimX * lunge;
        vz = enemy.aimZ * lunge;
      }
      const push = separation(discs[i]!, discs, config.enemy.separation, 6, i);
      vx += push.x + enemy.pushX;
      vz += push.z + enemy.pushZ;
      const decay = Math.exp(-8 * dt);
      enemy.pushX *= decay;
      enemy.pushZ *= decay;

      controller.computeColliderMovement(
        enemy.collider,
        { x: vx * dt, y: 0, z: vz * dt },
        undefined,
        ENEMY_GROUPS,
      );
      const m = controller.computedMovement();
      const p = body.translation();
      body.setNextKinematicTranslation({ x: p.x + m.x, y: p.y, z: p.z + m.z });

      const wanted = Math.hypot(enemy.wantX, enemy.wantZ) * dt;
      if (enemy.state === 'chase' && wanted > 0.01 && Math.hypot(m.x, m.z) < wanted * 0.3) {
        enemy.stuck += dt;
        if (enemy.stuck > DETOUR_AFTER && enemy.detour <= 0) {
          enemy.detour = DETOUR_SECONDS;
          enemy.stuck = 0;
        }
      } else {
        enemy.stuck = Math.max(0, enemy.stuck - dt);
      }
    });
  };
}
