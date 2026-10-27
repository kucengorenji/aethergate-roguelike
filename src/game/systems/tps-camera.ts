import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { GameSystem } from '../types';
import { clampPitch, yawBasis } from './look';

const head = new THREE.Vector3();
const desired = new THREE.Vector3();
const dir = new THREE.Vector3();
const forward = new THREE.Vector3();
const target = new THREE.Vector3();

/**
 * Over-the-shoulder camera (frame system). It follows the interpolated player
 * and adds mouse movement not yet consumed by a fixed step, so looking around
 * has no extra latency. Before walls it pushes in toward the player's head.
 */
export const tpsCameraSystem: GameSystem = ({ world, input, camera, physics }) => {
  const player = world.with('player', 'object3d', 'look', 'body').first;
  if (!player) return;
  const { distance, shoulder, height, wallMargin } = config.camera;
  const { sensitivity, minPitch, maxPitch } = config.look;
  const yaw = player.look.yaw - input.pendingLook.x * sensitivity;
  const pitch = clampPitch(
    player.look.pitch - input.pendingLook.y * sensitivity,
    minPitch,
    maxPitch,
  );
  const { fx, fz, rx, rz } = yawBasis(yaw);
  const cp = Math.cos(pitch);
  forward.set(fx * cp, Math.sin(pitch), fz * cp);

  head.copy(player.object3d.position);
  head.y += height;
  desired
    .set(head.x + rx * shoulder, head.y, head.z + rz * shoulder)
    .addScaledVector(forward, -distance);

  dir.subVectors(desired, head);
  const full = dir.length();
  dir.divideScalar(full);
  const hit = physics.castRay(head, dir, full + wallMargin, player.body);
  const reach = hit === null ? full : Math.max(0.1, hit - wallMargin);
  camera.position.copy(head).addScaledVector(dir, reach);

  target.copy(camera.position).addScaledVector(forward, 10);
  camera.lookAt(target);
};
