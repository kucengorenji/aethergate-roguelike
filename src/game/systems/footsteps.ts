import { config } from '../config';
import type { GameSystem } from '../types';

/** Plays a footstep every stride while moving on the ground. */
export const footstepsSystem: GameSystem = ({ world, audio, rng, dt }) => {
  const { strideMeters, volume } = config.footsteps;
  for (const { footsteps, locomotion, action } of world.with('player', 'footsteps', 'locomotion')) {
    if (!locomotion.grounded || locomotion.direction === 0 || action?.kind === 'dodge') {
      footsteps.distance = strideMeters * 0.6;
      continue;
    }
    footsteps.distance += locomotion.speed * dt;
    if (footsteps.distance >= strideMeters) {
      footsteps.distance -= strideMeters;
      audio.play('step', { volume, rate: rng.range(0.85, 1.15) });
    }
  }
};
