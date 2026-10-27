import { config } from '../config';
import type { GameSystem } from '../types';

/** Picks up gems within reach of the player and detects the win condition. */
export const collectSystem: GameSystem = (ctx) => {
  const { world, state } = ctx;
  if (state.phase !== 'playing') return;

  const player = world.with('player', 'body').first;
  if (!player) return;
  const p = player.body.translation();
  const reach = config.gems.pickupRadius;

  for (const gem of [...world.with('gem', 'object3d')]) {
    const g = gem.object3d.position;
    if (Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z) <= reach) {
      world.remove(gem);
      state.score++;
    }
  }
  if (state.score >= state.total) state.phase = 'won';
};
