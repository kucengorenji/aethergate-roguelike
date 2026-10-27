import { aimPoint, muzzlePoint } from '../combat/aim';
import { ProjectileKind, Team } from '../combat/projectiles';
import { config } from '../config';
import { STAFF_BY_ID } from '../meta/staffs';
import { controlsLocked } from '../state';
import type { GameSystem } from '../types';

/**
 * Holding left click casts bolts toward the crosshair at a fixed rate while
 * focus lasts. With too little focus a click plays a dry click and nothing fires
 * until the button is released and focus refills.
 */
export const castSystem: GameSystem = (ctx) => {
  const { input, dt, state } = ctx;
  for (const player of ctx.world.with('player', 'caster', 'action', 'body', 'look')) {
    const { caster, action } = player;
    caster.cooldown = Math.max(0, caster.cooldown - dt);
    caster.sinceCast += dt;
    if (controlsLocked(state) || action.kind !== 'none') continue;
    if (!input.isDown('Mouse0') || caster.cooldown > 0) continue;

    const staff = STAFF_BY_ID[player.loadout?.staff ?? 'glint'] ?? STAFF_BY_ID.glint!;
    const { focusCost: cost, speed, radius, interval, count, spread, pierce } = staff;
    const damage = staff.damage + (player.loadout?.boltBonus ?? 0);
    const { life } = config.bolt;
    if (caster.focus < cost) {
      if (input.wasPressed('Mouse0')) ctx.audio.play('empty', { volume: 0.5 });
      // Holding fire on empty counts as casting, so focus only refills after letting
      // go. Otherwise regen would keep firing at nearly the full rate.
      caster.sinceCast = 0;
      continue;
    }
    const from = muzzlePoint(player.body.translation(), player.look.yaw);
    const to = aimPoint(ctx, player);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    for (let i = 0; i < count; i++) {
      // Fan the bolts out around the vertical axis, evenly across the spread.
      const turn = count > 1 ? (i / (count - 1) - 0.5) * spread : 0;
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      const ux = dx / len;
      const uz = dz / len;
      state.projectiles.spawn({
        kind: ProjectileKind.Bolt,
        team: Team.Player,
        ...from,
        vx: (ux * c + uz * s) * speed,
        vy: (dy / len) * speed,
        vz: (uz * c - ux * s) * speed,
        radius,
        damage,
        life,
        pierce,
      });
    }
    caster.focus -= cost;
    caster.cooldown = interval;
    caster.sinceCast = 0;
    state.stats.casts++;
    state.feedback.kick += config.feedback.castKick;
    ctx.audio.play('cast', { volume: 0.45, rate: ctx.rng.range(0.95, 1.05) });
  }
};

/** Focus refills after a short pause in casting. */
export const focusSystem: GameSystem = ({ world, dt }) => {
  const { regenPerSecond, regenDelay } = config.focus;
  for (const { caster } of world.with('player', 'caster')) {
    if (caster.sinceCast >= regenDelay) {
      caster.focus = Math.min(caster.maxFocus, caster.focus + regenPerSecond * dt);
    }
  }
};
