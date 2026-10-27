import { grayboxArena } from '../arenas/graybox';
import { config } from '../config';
import { resetPlayer } from '../entities/player';
import type { GameSystem } from '../types';

/** R resets the player to spawn; falling out of the world does too. */
export const restartSystem: GameSystem = (ctx) => {
  const reset = ctx.input.wasPressed('KeyR');
  for (const player of ctx.world.with('player', 'body')) {
    if (reset || player.body.translation().y < config.player.respawnBelowY) {
      resetPlayer(ctx, player, grayboxArena);
      ctx.state.elapsed = 0;
    }
  }
};
