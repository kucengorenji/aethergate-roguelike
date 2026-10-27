import { aimPoint, muzzlePoint } from '../combat/aim';
import { burst, cometFuse } from '../combat/burst';
import { ProjectileKind, Team } from '../combat/projectiles';
import { config } from '../config';
import { controlsLocked } from '../state';
import type { GameSystem } from '../types';

/** Right click hurls the Ash Comet toward the crosshair, then the skill recharges. */
export const skillSystem: GameSystem = (ctx) => {
  const { input, dt, state } = ctx;
  for (const pending of [...state.pendingBursts]) {
    pending.time -= dt;
    if (pending.time > 0) continue;
    state.pendingBursts.splice(state.pendingBursts.indexOf(pending), 1);
    burst(ctx, pending.x, pending.y, pending.z);
  }
  for (const player of ctx.world.with('player', 'skill', 'action', 'body', 'look')) {
    const { skill, action } = player;
    skill.cooldown = Math.max(0, skill.cooldown - dt);
    if (controlsLocked(state) || action.kind !== 'none') continue;
    if (!input.wasPressed('Mouse2') || skill.cooldown > 0) continue;

    const { speed, size, damage } = config.comet;
    const from = muzzlePoint(player.body.translation(), player.look.yaw);
    const to = aimPoint(ctx, player);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    state.projectiles.spawn({
      kind: ProjectileKind.Comet,
      team: Team.Player,
      ...from,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      vz: (dz / len) * speed,
      radius: size,
      damage,
      life: cometFuse(len),
    });
    skill.cooldown = skill.maxCooldown;
    state.feedback.kick += config.comet.castKick;
    player.animator?.triggerLayer('bash');
    ctx.audio.play('comet', { volume: 0.6 });
  }
};
