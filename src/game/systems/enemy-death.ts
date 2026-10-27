import { config } from '../config';
import { despawnEnemy } from '../entities/enemy';
import type { GameSystem } from '../types';

/** Removes enemies once their collapse has played out. */
export const enemyDeathSystem: GameSystem = (ctx) => {
  for (const entity of [...ctx.world.with('enemy')]) {
    if (entity.enemy.state === 'dying' && entity.enemy.time >= config.enemy.dyingSeconds) {
      despawnEnemy(ctx, entity);
    }
  }
};
