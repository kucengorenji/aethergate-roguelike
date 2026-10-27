import { openPanel } from '../save';
import { controlsLocked } from '../state';
import type { GameSystem } from '../types';

/**
 * Losing the pointer lock during play (Esc, alt-tab) opens the pause menu and
 * suspends the game. Dead, choosing a blessing or in a menu, the player has no
 * control to lose, so nothing pauses.
 */
export const pauseSystem: GameSystem = (ctx) => {
  if (ctx.input.lockLost && !controlsLocked(ctx.state)) openPanel(ctx, 'pause', true);
};
