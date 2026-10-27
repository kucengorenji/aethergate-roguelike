import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Dummies wobble on a spring after knockback, collapse at zero health and
 * stand up again at full health after a delay.
 */
export const dummySystem: GameSystem = ({ world, dt }) => {
  const { spring, damping, respawnSeconds } = config.dummy;
  for (const { dummy, health, body, model } of world.with('dummy', 'health', 'body', 'model')) {
    if (health.current <= 0) {
      if (dummy.downTime <= 0) {
        dummy.downTime = respawnSeconds;
      } else {
        dummy.downTime -= dt;
        if (dummy.downTime <= 0) {
          dummy.downTime = 0;
          health.current = health.max;
        }
      }
    }
    const down = health.current <= 0;
    // Topple backward while down, spring upright when back.
    const target = down ? -1.45 : 0;
    model.rotation.x += (target - model.rotation.x) * Math.min(1, dt * (down ? 9 : 6));

    const { offset, velocity } = dummy;
    velocity.x += (-spring * offset.x - damping * velocity.x) * dt;
    velocity.z += (-spring * offset.z - damping * velocity.z) * dt;
    offset.x += velocity.x * dt;
    offset.z += velocity.z * dt;
    body.setNextKinematicTranslation({
      x: dummy.home.x + offset.x,
      y: dummy.home.y,
      z: dummy.home.z + offset.z,
    });
  }
};
