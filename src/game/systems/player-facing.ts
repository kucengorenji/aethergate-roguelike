import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Turns the model to the look direction every rendered frame (frame system),
 * including mouse movement not yet consumed, so it stays locked to the camera.
 */
export const playerFacingSystem: GameSystem = ({ world, input }) => {
  for (const { model, look } of world.with('player', 'model', 'look')) {
    model.rotation.y = look.yaw - input.pendingLook.x * config.look.sensitivity;
  }
};
