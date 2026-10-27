import { applyDamage } from '../combat/damage';
import { inFrontArc } from '../combat/guard';
import { OrbLook, ProjectileKind, Team } from '../combat/projectiles';
import { config } from '../config';
import type { Entity } from '../components';
import { ImpactKind } from '../state';
import type { Ctx, GameSystem } from '../types';

/**
 * Resolves enemy attacks against the player: sword lunges and shield slams on
 * their first attack step, hound leaps on contact, caster orbs fired from the gem.
 * Player dodge i-frames are honored by applyDamage.
 */
export const enemyAttackSystem: GameSystem = (ctx) => {
  const player = ctx.world.with('player', 'body', 'hurtbox', 'health').first;
  if (!player || ctx.state.phase !== 'playing') return;
  const pp = player.body.translation();
  ctx.state.pull.x = 0;
  ctx.state.pull.z = 0;
  for (const { enemy, body } of ctx.world.with('enemy', 'body')) {
    if (enemy.state === 'attack' && enemy.move === 'well') pullPlayer(ctx, body.translation(), pp);
    if (enemy.state !== 'attack' || enemy.hit) continue;
    const p = body.translation();
    const dist = Math.hypot(pp.x - p.x, pp.z - p.z);
    const from = { x: p.x, z: p.z };
    if (enemy.move) {
      bossMove(ctx, enemy, p, pp, dist, player.hurtbox.radius);
      continue;
    }
    switch (enemy.kind) {
      case 'captain':
      case 'starfallen':
        break;
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
        ctx.state.impacts.push({
          x: cx,
          y: 0.3,
          z: cz,
          age: 0,
          kind: ImpactKind.Slam,
          radius: k.slamRadius,
        });
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
          look: OrbLook.Thorn,
        });
        ctx.audio.play('orb', { volume: 0.4, rate: 1.4 });
        break;
      }
    }
  }
};

type Vec = { x: number; y: number; z: number };

/** Resolves one step of a boss attack. Single-hit moves set `hit`; the well hits at its end. */
function bossMove(
  ctx: Ctx,
  enemy: NonNullable<Entity['enemy']>,
  p: Vec,
  pp: Vec,
  dist: number,
  playerRadius: number,
): void {
  const player = ctx.world.with('player', 'health', 'body').first!;
  const from = { x: p.x, z: p.z };
  switch (enemy.move) {
    case 'slam': {
      const c = config.enemies.captain;
      enemy.hit = true;
      const cx = p.x + enemy.aimX * c.slamDistance;
      const cz = p.z + enemy.aimZ * c.slamDistance;
      if (Math.hypot(pp.x - cx, pp.z - cz) <= c.slamRadius + playerRadius) {
        applyDamage(ctx, player, c.damage, { from });
      }
      ctx.state.impacts.push({
        x: cx,
        y: 0.3,
        z: cz,
        age: 0,
        kind: ImpactKind.Slam,
        radius: c.slamRadius,
      });
      ctx.state.feedback.shake = Math.max(ctx.state.feedback.shake, 0.15);
      ctx.audio.play('slam', { volume: 0.8 });
      break;
    }
    case 'charge': {
      const c = config.enemies.captain;
      if (dist <= c.radius + playerRadius + 0.3) {
        enemy.hit = true;
        applyDamage(ctx, player, c.chargeDamage, { from });
      }
      break;
    }
    case 'sweep': {
      const s = config.enemies.starfallen;
      enemy.hit = true;
      if (
        dist <= s.sweepRadius + playerRadius &&
        inFrontArc(enemy.facing, p.x, p.z, pp.x, pp.z, s.sweepArcDegrees)
      ) {
        applyDamage(ctx, player, s.damage, { from });
      }
      ctx.audio.play('swing', { volume: 0.7, rate: 0.6 });
      break;
    }
    case 'well': {
      const s = config.enemies.starfallen;
      // The well detonates on its last step.
      if (enemy.time + ctx.dt < s.wellTime) break;
      enemy.hit = true;
      if (dist <= s.wellRadius + playerRadius) applyDamage(ctx, player, s.wellDamage, { from });
      ctx.state.impacts.push({
        x: p.x,
        y: 0.4,
        z: p.z,
        age: 0,
        kind: ImpactKind.Gravity,
        radius: s.wellRadius,
      });
      ctx.state.feedback.shake = Math.max(ctx.state.feedback.shake, 0.2);
      ctx.audio.play('burst', { volume: 0.8, rate: 0.7 });
      break;
    }
    case 'meteors': {
      const s = config.enemies.starfallen;
      enemy.hit = true;
      // The first meteor targets the player; the rest scatter around them.
      for (let i = 0; i < s.meteors; i++) {
        const a = ctx.rng.range(0, Math.PI * 2);
        const r = i === 0 ? 0 : ctx.rng.range(2.5, 6.5);
        ctx.state.hazards.push({
          x: pp.x + Math.cos(a) * r,
          z: pp.z + Math.sin(a) * r,
          radius: s.meteorRadius,
          time: s.meteorDelay,
          damage: s.meteorDamage,
        });
      }
      ctx.audio.play('pull', { volume: 0.6, rate: 1.5 });
      break;
    }
    case null:
      break;
  }
}

/** The gravity well drags the player toward the boss while it charges. */
function pullPlayer(ctx: Ctx, p: Vec, pp: Vec): void {
  const dx = p.x - pp.x;
  const dz = p.z - pp.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.5) return;
  const { wellPull } = config.enemies.starfallen;
  ctx.state.pull.x += (dx / d) * wellPull;
  ctx.state.pull.z += (dz / d) * wellPull;
}
