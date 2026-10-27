import * as THREE from 'three/webgpu';
import { cameraRig, resolveEye } from '../combat/camera-rig';
import { config } from '../config';
import type { GameSystem } from '../types';
import { clampPitch } from './look';

const eye = { x: 0, y: 0, z: 0 };
const target = new THREE.Vector3();

/**
 * Over-the-shoulder camera (frame system). It follows the interpolated player
 * and adds mouse movement not yet consumed by a fixed step, so looking around
 * has no extra latency. Before walls it pushes in toward the player's head.
 * Cast kick and hurt shake are added on top.
 */
export const tpsCameraSystem: GameSystem = ({ world, input, camera, physics, state, tick }) => {
  const player = world.with('player', 'object3d', 'look', 'body').first;
  if (!player) return;
  const { sensitivity, minPitch, maxPitch } = config.look;
  const { kick, shake } = state.feedback;
  const yaw =
    player.look.yaw - input.pendingLook.x * sensitivity + Math.sin(tick * 2.3) * shake * 0.08;
  const pitch =
    clampPitch(player.look.pitch - input.pendingLook.y * sensitivity, minPitch, maxPitch) +
    kick +
    Math.cos(tick * 3.1) * shake * 0.08;
  const rig = cameraRig(player.object3d.position, yaw, pitch);
  resolveEye(physics, rig, player.body, eye);
  camera.position.set(eye.x, eye.y, eye.z);
  const f = rig.forward;
  target.set(eye.x + f.x * 10, eye.y + f.y * 10, eye.z + f.z * 10);
  camera.lookAt(target);
};
