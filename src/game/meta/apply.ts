import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';
import { loadout } from './upgrades';

/**
 * Gives the player what the save has earned for a new run: max health, focus,
 * flasks, comet cooldown, roll invulnerability, bolt damage and the staff.
 */
export function applyLoadout(ctx: Ctx, player: Entity): void {
  const l = loadout(ctx.state.save, {
    health: config.health.player,
    focus: config.focus.max,
    flasks: config.flask.charges,
    cometCooldown: config.comet.cooldown,
  });
  if (player.health) Object.assign(player.health, { max: l.maxHealth, current: l.maxHealth });
  if (player.caster) Object.assign(player.caster, { maxFocus: l.maxFocus, focus: l.maxFocus });
  if (player.flask) Object.assign(player.flask, { max: l.flasks, charges: l.flasks });
  if (player.skill) player.skill.maxCooldown = l.cometCooldown;
  player.loadout = { staff: l.staff, boltBonus: l.boltBonus, iframeBonus: l.iframeBonus };
}
