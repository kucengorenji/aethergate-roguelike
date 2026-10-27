import { grayboxArena } from '../arenas/graybox';
import { config } from '../config';
import { resetPlayer } from '../entities/player';
import type { Ctx, GameSystem } from '../types';
import { resetEncounter } from './waves';

/** R restarts the encounter at any time; falling out of the world resets the player. */
export const restartSystem: GameSystem = (ctx) => {
  if (ctx.input.wasPressed('KeyR')) {
    restartEncounter(ctx);
    return;
  }
  for (const player of ctx.world.with('player', 'body')) {
    if (player.body.translation().y < config.player.respawnBelowY) {
      resetPlayer(ctx, player, grayboxArena);
    }
  }
};

/** Full health, focus and flasks, no projectiles or enemies, waves from the start. */
export function restartEncounter(ctx: Ctx): void {
  const { state } = ctx;
  resetEncounter(ctx);
  for (const player of ctx.world.with('player')) resetPlayer(ctx, player, grayboxArena);
  for (const { dummy, health, model } of ctx.world.with('dummy', 'health')) {
    health.current = health.max;
    Object.assign(dummy, { offset: { x: 0, z: 0 }, velocity: { x: 0, z: 0 }, downTime: 0 });
    if (model) model.rotation.x = 0;
  }
  for (const { totem } of ctx.world.with('totem')) {
    totem.timer = config.totem.interval;
    totem.charge = 0;
  }
  state.projectiles.clear();
  state.impacts.length = 0;
  state.damageNumbers.length = 0;
  Object.assign(state.feedback, { hitstop: 0, kick: 0, shake: 0, hurt: 0 });
  state.phase = 'playing';
  state.elapsed = 0;
  ctx.timeScale = 1;
}
