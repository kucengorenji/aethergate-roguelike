import { applyDamage } from '../combat/damage';
import { inFrontArc } from '../combat/guard';
import { ProjectileKind, Team } from '../combat/projectiles';
import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Resolves enemy attacks against the player: sword lunges and shield slams on
 * their first attack step, hound leaps on contact, caster orbs fired from the gem.
 * Player dodge i-frames are honored by applyDamage.
 */
export const enemyAttackSystem: GameSystem = (ctx) => {
  const player = ctx.world.with('player', 'body', 'hurtbox', 'health').first;
  if (!player || ctx.state.phase !== 'playing') return;
  const pp = player.body.translation();
  for (const { enemy, body } of ctx.world.with('enemy', 'body')) {
    if (enemy.state !== 'attack' || enemy.hit) continue;
    const p = body.translation();
    const dist = Math.hypot(pp.x - p.x, pp.z - p.z);
    const from = { x: p.x, z: p.z };
    switch (enemy.kind) {
      case 'soldier': {
        const k = config.enemies.soldier;
        enemy.hit = true;
        if (dist <= k.reach + 0.6 && inFrontArc(enemy.facing, p.x, p.z, pp.x, pp.z, 110)) {
          applyDamage(ctx, player, k.damage, { from });
        }
        ctx.audio.play('swing', { volume: 0.4, rate: 0.8 });
        break;
      }
      case 'knight': {
        const k = config.enemies.knight;
        enemy.hit = true;
        const cx = p.x + enemy.aimX * k.slamDistance;
        const cz = p.z + enemy.aimZ * k.slamDistance;
        if (Math.hypot(pp.x - cx, pp.z - cz) <= k.slamRadius + player.hurtbox.radius) {
          applyDamage(ctx, player, k.damage, { from });
        }
        ctx.state.feedback.shake = Math.max(ctx.state.feedback.shake, 0.12);
        ctx.audio.play('slam', { volume: 0.7 });
        break;
      }
      case 'hound': {
        const k = config.enemies.hound;
        if (dist <= k.radius + player.hurtbox.radius + 0.3) {
          enemy.hit = true;
          applyDamage(ctx, player, k.damage, { from });
        }
        break;
      }
      case 'caster': {
        const k = config.enemies.caster;
        enemy.hit = true;
        const y = p.y + 0.4;
        const dx = pp.x - p.x;
        const dy = pp.y - y;
        const dz = pp.z - p.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        ctx.state.projectiles.spawn({
          kind: ProjectileKind.Orb,
          team: Team.Enemy,
          x: p.x + enemy.aimX * 0.5,
          y,
          z: p.z + enemy.aimZ * 0.5,
          vx: (dx / len) * k.orbSpeed,
          vy: (dy / len) * k.orbSpeed,
          vz: (dz / len) * k.orbSpeed,
          radius: 0.22,
          damage: k.damage,
          life: 4,
        });
        ctx.audio.play('orb', { volume: 0.4, rate: 1.4 });
        break;
      }
    }
  }
};
