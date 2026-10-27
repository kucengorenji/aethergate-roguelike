import { has } from '../boons/effects';
import { tickStatus } from '../boons/status';
import { applyDamage } from '../combat/damage';
import type { GameSystem } from '../types';

/** Ticks status effects: rot damage, and chill, weight and freeze wearing off. */
export const statusSystem: GameSystem = (ctx) => {
  const fester = has(ctx, 'fester');
  for (const entity of ctx.world.with('status', 'health')) {
    if (entity.health.current <= 0) continue;
    const damage = tickStatus(entity.status, ctx.dt, fester);
    if (damage > 0) applyDamage(ctx, entity, damage, { quiet: true });
  }
};
