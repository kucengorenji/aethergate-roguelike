import { config } from '../config';
import { resetPlayer } from '../entities/player';
import type { GameSystem } from '../types';

/** WASD/arrows roll the ball, Space jumps when grounded, falling out respawns. */
export const playerControlSystem: GameSystem = (ctx) => {
  const { input, physics, state, dt } = ctx;
  const { radius, rollForce, maxSpeed, jumpImpulse, respawnBelowY } = config.player;

  for (const { body } of ctx.world.with('player', 'body')) {
    if (body.translation().y < respawnBelowY) {
      resetPlayer(body);
      continue;
    }
    if (state.phase !== 'playing') continue;

    const x = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    const z = input.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
    const v = body.linvel();
    if (x !== 0 || z !== 0) {
      const len = Math.hypot(x, z);
      const mass = body.mass();
      // Only push while under the speed cap in the requested direction.
      const along = (v.x * x + v.z * z) / len;
      if (along < maxSpeed) {
        body.applyImpulse(
          { x: (x / len) * rollForce * mass * dt, y: 0, z: (z / len) * rollForce * mass * dt },
          true,
        );
      }
    }

    if (input.wasPressed('Space')) {
      const groundDistance = physics.castRay(
        body.translation(),
        { x: 0, y: -1, z: 0 },
        radius + 0.08,
        body,
      );
      if (groundDistance !== null) {
        body.applyImpulse({ x: 0, y: jumpImpulse * body.mass(), z: 0 }, true);
      }
    }
  }
};
