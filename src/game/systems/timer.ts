import type { GameSystem } from '../types';

export const timerSystem: GameSystem = (ctx) => {
  ctx.state.elapsed += ctx.dt;
};
