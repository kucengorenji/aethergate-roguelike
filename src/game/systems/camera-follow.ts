import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Smoothly follows the player. Fixed-step for determinism; the exponential
 * factor keeps the feel identical if the step rate changes.
 */
export const cameraFollowSystem: GameSystem = (ctx) => {
  const player = ctx.world.with('player', 'object3d').first;
  if (!player) return;
  const target = player.object3d.position;
  const { offsetY, offsetZ, stiffness } = config.camera;
  const k = 1 - Math.exp(-stiffness * ctx.dt);
  const cam = ctx.camera.position;
  cam.x += (target.x - cam.x) * k;
  cam.y += (target.y + offsetY - cam.y) * k;
  cam.z += (target.z + offsetZ - cam.z) * k;
  ctx.camera.lookAt(cam.x, target.y, cam.z - offsetZ);
};
