import { config } from '../config';
import type { GameSystem } from '../types';

/** Chooses idle or run from locomotion, running the clip backward when backing up. */
export const playerAnimationSystem: GameSystem = ({ world }) => {
  const { runClipSpeed, fadeSeconds } = config.animation;
  for (const { animator, locomotion } of world.with('player', 'animator', 'locomotion')) {
    if (locomotion.direction === 0) {
      animator.play('idle', fadeSeconds);
    } else {
      animator.play('run', fadeSeconds, (locomotion.direction * locomotion.speed) / runClipSpeed);
    }
  }
};
