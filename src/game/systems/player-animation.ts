import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Chooses the base clip (idle, run backward or forward, dodge roll) and fades
 * the aiming arm in while casting.
 */
export const playerAnimationSystem: GameSystem = ({ world, input }) => {
  const { runClipSpeed, fadeSeconds } = config.animation;
  for (const { animator, locomotion, action, caster } of world.with(
    'player',
    'animator',
    'locomotion',
    'action',
    'caster',
  )) {
    if (action.kind === 'dodge') {
      animator.play('dodge', 0.05, 1, true);
    } else if (locomotion.direction === 0) {
      animator.play('idle', fadeSeconds);
    } else {
      animator.play('run', fadeSeconds, (locomotion.direction * locomotion.speed) / runClipSpeed);
    }
    const aiming = action.kind === 'none' && (input.isDown('Mouse0') || caster.sinceCast < 0.35);
    animator.setLayer('aim', aiming ? 1 : 0, aiming ? 0.08 : 0.25);
  }
};
