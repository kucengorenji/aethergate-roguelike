import type { Physics, RAPIER } from '@engine/physics';
import { config } from '../config';
import { WORLD_RAYS } from './groups';
import { yawBasis } from '../systems/look';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The over-the-shoulder camera before wall push-in, as a pure function of the
 * player center and look angles. Shared by the camera (what the player sees)
 * and casting (where the crosshair points), so they always agree.
 */
export function cameraRig(
  center: Vec3,
  yaw: number,
  pitch: number,
): { head: Vec3; eye: Vec3; forward: Vec3 } {
  const { distance, shoulder, height } = config.camera;
  const { fx, fz, rx, rz } = yawBasis(yaw);
  const cp = Math.cos(pitch);
  const forward = { x: fx * cp, y: Math.sin(pitch), z: fz * cp };
  const head = { x: center.x, y: center.y + height, z: center.z };
  const eye = {
    x: head.x + rx * shoulder - forward.x * distance,
    y: head.y - forward.y * distance,
    z: head.z + rz * shoulder - forward.z * distance,
  };
  return { head, eye, forward };
}

/**
 * Look angles that put `target` under the crosshair for a player at `center`.
 * The eye moves with the angles, so this iterates; it converges in a few passes.
 */
export function aimAnglesAt(center: Vec3, target: Vec3): { yaw: number; pitch: number } {
  let yaw = 0;
  let pitch = 0;
  for (let i = 0; i < 8; i++) {
    const { eye } = cameraRig(center, yaw, pitch);
    const dx = target.x - eye.x;
    const dy = target.y - eye.y;
    const dz = target.z - eye.z;
    yaw = Math.atan2(-dx, -dz);
    pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }
  return { yaw, pitch };
}

/**
 * Pulls the eye in front of any level geometry between the head and the eye,
 * the same way the camera does. Returns the distance kept from the head.
 */
export function resolveEye(
  physics: Physics,
  rig: { head: Vec3; eye: Vec3 },
  exclude: RAPIER.RigidBody | undefined,
  out: Vec3,
): Vec3 {
  const dx = rig.eye.x - rig.head.x;
  const dy = rig.eye.y - rig.head.y;
  const dz = rig.eye.z - rig.head.z;
  const full = Math.hypot(dx, dy, dz);
  const dir = { x: dx / full, y: dy / full, z: dz / full };
  const { wallMargin } = config.camera;
  const hit = physics.castRay(rig.head, dir, full + wallMargin, exclude, WORLD_RAYS);
  const reach = hit === null ? full : Math.max(0.1, hit - wallMargin);
  out.x = rig.head.x + dir.x * reach;
  out.y = rig.head.y + dir.y * reach;
  out.z = rig.head.z + dir.z * reach;
  return out;
}
