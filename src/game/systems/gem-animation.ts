import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Spins and bobs gems. Runs on the fixed step (not per frame) so screenshots
 * taken at a given tick are identical on every machine.
 */
export const gemAnimationSystem: GameSystem = (ctx) => {
  const t = ctx.tick * ctx.dt;
  const { spinSpeed, bobAmplitude } = config.gems;
  for (const { gem, object3d } of ctx.world.with('gem', 'object3d')) {
    object3d.rotation.y = gem.phase + t * spinSpeed;
    object3d.position.y = gem.baseY + Math.sin(gem.phase + t * 2) * bobAmplitude;
  }
};
