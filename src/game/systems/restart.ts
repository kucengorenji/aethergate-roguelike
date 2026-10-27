import { spawnGems } from '../entities/gem';
import { resetPlayer } from '../entities/player';
import type { Ctx, GameSystem } from '../types';

/** R restarts the round at any time; Enter also restarts after winning. */
export const restartSystem: GameSystem = (ctx) => {
  const { input, state } = ctx;
  if (input.wasPressed('KeyR') || (state.phase === 'won' && input.wasPressed('Enter'))) {
    restartRound(ctx);
  }
};

export function restartRound(ctx: Ctx): void {
  for (const gem of [...ctx.world.with('gem')]) ctx.world.remove(gem);
  for (const { body } of ctx.world.with('player', 'body')) resetPlayer(body);
  Object.assign(ctx.state, { phase: 'playing', score: 0, elapsed: 0 });
  spawnGems(ctx);
}
