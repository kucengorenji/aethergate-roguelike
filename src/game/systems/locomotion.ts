import { config } from '../config';
import type { GameSystem } from '../types';
import { yawBasis } from './look';

/**
 * WASD (or arrows) moves the player relative to where it looks, through the
 * kinematic character controller: collisions, step-up and ground snapping.
 */
export const locomotionSystem: GameSystem = ({ world, input, dt }) => {
  const { walkSpeed, backSpeedFactor, acceleration, gravity, maxFallSpeed } = config.player;
  for (const { body, look, locomotion, characterController } of world.with(
    'player',
    'body',
    'look',
    'locomotion',
    'characterController',
  )) {
    const strafe = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    const forward = input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
    const { fx, fz, rx, rz } = yawBasis(look.yaw);
    let tx = fx * forward + rx * strafe;
    let tz = fz * forward + rz * strafe;
    const len = Math.hypot(tx, tz);
    if (len > 0) {
      const speed = walkSpeed * (forward < 0 ? backSpeedFactor : 1);
      tx = (tx / len) * speed;
      tz = (tz / len) * speed;
    }

    const v = locomotion.velocity;
    const dx = tx - v.x;
    const dz = tz - v.z;
    const dv = Math.hypot(dx, dz);
    const maxDv = acceleration * dt;
    const k = dv > maxDv ? maxDv / dv : 1;
    v.x += dx * k;
    v.z += dz * k;
    // No downward speed while grounded: snap-to-ground keeps the character on the
    // floor, and any downward component makes Rapier skip autostep onto ledges.
    v.y = locomotion.grounded ? 0 : Math.max(-maxFallSpeed, v.y - gravity * dt);

    const { controller, collider } = characterController;
    controller.computeColliderMovement(collider, { x: v.x * dt, y: v.y * dt, z: v.z * dt });
    const m = controller.computedMovement();
    const p = body.translation();
    body.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z });

    locomotion.grounded = controller.computedGrounded();
    if (locomotion.grounded && v.y < 0) v.y = 0;
    locomotion.speed = Math.hypot(m.x, m.z) / dt;
    // Blocked by a wall: forget the velocity into it so letting go does not slide.
    if (locomotion.speed < Math.hypot(v.x, v.z) * 0.5) {
      v.x = m.x / dt;
      v.z = m.z / dt;
    }
    const along = m.x * fx + m.z * fz;
    locomotion.direction =
      locomotion.speed < config.animation.idleBelowSpeed ? 0 : along < -0.001 ? -1 : 1;
  }
};
