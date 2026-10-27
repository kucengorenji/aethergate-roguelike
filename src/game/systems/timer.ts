import type { GameSystem } from '../types';

export const timerSystem: GameSystem = (ctx) => {
  if (ctx.state.phase === 'playing') ctx.state.elapsed += ctx.dt;
};
