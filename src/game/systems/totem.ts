import { ProjectileKind, Team } from '../combat/projectiles';
import { config } from '../config';
import type { GameSystem } from '../types';

/** Totems charge up (glowing gem), then fire a slow orb at the player. */
export const totemSystem: GameSystem = (ctx) => {
  const { world, dt, state } = ctx;
  const player = world.with('player', 'body').first;
  const { enabled, interval, chargeSeconds, orbSpeed, orbDamage, orbRadius, orbLife } =
    config.totem;
  for (const { totem } of world.with('totem')) {
    if (!enabled || !player || state.phase !== 'playing') {
      totem.timer = interval;
      totem.charge = 0;
    } else {
      totem.timer -= dt;
      totem.charge = Math.min(1, Math.max(0, 1 - totem.timer / chargeSeconds));
      if (totem.timer <= 0) {
        totem.timer = interval;
        totem.charge = 0;
        const from = totem.muzzle;
        const p = player.body.translation();
        const dx = p.x - from.x;
        const dy = p.y + 0.2 - from.y;
        const dz = p.z - from.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        state.projectiles.spawn({
          kind: ProjectileKind.Orb,
          team: Team.Enemy,
          ...from,
          vx: (dx / len) * orbSpeed,
          vy: (dy / len) * orbSpeed,
          vz: (dz / len) * orbSpeed,
          radius: orbRadius,
          damage: orbDamage,
          life: orbLife,
        });
        ctx.audio.play('orb', { volume: 0.5 });
      }
    }
    totem.gem.emissiveIntensity = 0.2 + totem.charge * 3;
  }
};
