import { config } from '../config';
import { placePlayer, resetPlayer } from '../entities/player';
import type { Ctx, GameSystem } from '../types';
import { returnToHub } from './hub';
import { startRun } from './run';
import { resetEncounter } from './waves';

/**
 * After death or victory: E returns to the Kindled Hall (the full game), or R
 * starts the next run (`run` mode). Other modes restart the chamber on R at any
 * time. Falling out of the world puts the player back at the entrance.
 */
export const restartSystem: GameSystem = (ctx) => {
  const { state } = ctx;
  const ended = state.phase === 'dead' || (state.run.active && state.run.status === 'complete');
  if (state.mode === 'hub') {
    if (ended && ctx.input.wasPressed('KeyE')) {
      returnToHub(ctx, state.phase === 'dead' ? 'death' : 'victory');
    }
  } else if (ctx.input.wasPressed('KeyR')) {
    if (state.mode !== 'run') {
      restartEncounter(ctx);
      return;
    }
    if (state.phase === 'dead' || state.run.status === 'complete') {
      startRun(ctx, (state.run.plan?.seed ?? 0) + 1);
      return;
    }
  }
  for (const player of ctx.world.with('player', 'body')) {
    if (player.body.translation().y < config.player.respawnBelowY) {
      placePlayer(ctx, player, state.layout);
    }
  }
};

/** Full health, focus and flasks, no projectiles or enemies, waves from the start. */
export function restartEncounter(ctx: Ctx): void {
  const { state } = ctx;
  resetEncounter(ctx);
  for (const player of ctx.world.with('player')) resetPlayer(ctx, player, state.layout);
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
  state.choice = null;
  state.arcs.length = 0;
  state.pendingBursts.length = 0;
  state.hazards.length = 0;
  state.burnRing = null;
  state.phase = 'playing';
  state.elapsed = 0;
  ctx.timeScale = 1;
}
