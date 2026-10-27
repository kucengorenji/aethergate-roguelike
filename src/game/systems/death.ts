import type { GameSystem } from '../types';

/** The run ends when the player's health reaches zero. */
export const deathSystem: GameSystem = (ctx) => {
  if (ctx.state.phase !== 'playing') return;
  for (const { health, animator } of ctx.world.with('player', 'health')) {
    if (health.current > 0) continue;
    ctx.state.phase = 'dead';
    animator?.play('idle', 0.3);
    ctx.audio.play('hurt', { volume: 0.9, rate: 0.6 });
  }
};
