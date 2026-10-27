import type { GameSystem } from '../types';

/**
 * Presents doors and reward tokens (frame system): emblems turn and bob, open
 * portals glow and pulse. Driven by the step count so screenshots are stable.
 */
export const roomPropsSystem: GameSystem = ({ world, tick }) => {
  const t = tick / 60;
  for (const { door } of world.with('door')) {
    door.emblem.rotation.y = t * 1.2 + door.index;
    door.emblem.visible = door.open;
    (door.portal.material as { opacity: number }).opacity = door.open
      ? 0.55 + Math.sin(t * 3 + door.index) * 0.12
      : 0.12;
  }
  for (const { pickup, object3d } of world.with('pickup', 'object3d')) {
    const emblem = object3d.children[0];
    if (emblem) {
      emblem.rotation.y = t * 1.6;
      emblem.position.y = 1.1 + Math.sin(t * 2.2) * 0.12;
    }
    object3d.position.set(pickup.x, 0, pickup.z);
  }
};
