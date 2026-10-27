import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';
import { yawBasis } from '../systems/look';
import { cameraRig, resolveEye, type Vec3 } from './camera-rig';
import { WORLD_RAYS } from './groups';
import { sweepSphereCapsule } from './hit';

const eye = { x: 0, y: 0, z: 0 };

/**
 * The world point under the crosshair: the first level geometry or living
 * target along the camera ray, starting at the player so things between the
 * camera and the player are ignored.
 */
export function aimPoint(ctx: Ctx, player: Entity): Vec3 {
  const { body, look } = player;
  if (!body || !look) throw new Error('aimPoint: player needs body and look');
  const center = body.translation();
  const rig = cameraRig(center, look.yaw, look.pitch);
  resolveEye(ctx.physics, rig, body, eye);
  const f = rig.forward;
  const skip = Math.max(
    0,
    (rig.head.x - eye.x) * f.x + (rig.head.y - eye.y) * f.y + (rig.head.z - eye.z) * f.z,
  );
  const start = { x: eye.x + f.x * skip, y: eye.y + f.y * skip, z: eye.z + f.z * skip };
  const max = config.aim.maxDistance;
  let best = ctx.physics.castRay(start, f, max, body, WORLD_RAYS) ?? max;
  for (const target of ctx.world.with('hurtbox', 'health', 'body')) {
    if (target === player || target.health.current <= 0) continue;
    const c = target.body.translation();
    const s = sweepSphereCapsule(
      start.x,
      start.y,
      start.z,
      start.x + f.x * best,
      start.y + f.y * best,
      start.z + f.z * best,
      0,
      c.x,
      c.y,
      c.z,
      target.hurtbox.halfHeight,
      target.hurtbox.radius,
    );
    if (s !== null) best *= s;
  }
  return { x: start.x + f.x * best, y: start.y + f.y * best, z: start.z + f.z * best };
}

/** The staff tip in world space for a player at `center` looking at `yaw`. */
export function muzzlePoint(center: Vec3, yaw: number): Vec3 {
  const { right, up, forward } = config.muzzle;
  const { fx, fz, rx, rz } = yawBasis(yaw);
  return {
    x: center.x + rx * right + fx * forward,
    y: center.y + up,
    z: center.z + rz * right + fz * forward,
  };
}
