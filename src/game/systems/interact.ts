import { config } from '../config';
import { applyReward } from '../run/apply';
import type { Offer } from '../run/rewards';
import type { Ctx, GameSystem } from '../types';
import { chooseDoor } from './run';

/** Walking into a reward token takes it; E near an open door goes through it. */
export const interactSystem: GameSystem = (ctx) => {
  const { state, input, world } = ctx;
  if (state.mode !== 'run' || state.phase !== 'playing') return;
  const player = world.with('player', 'body').first;
  if (!player) return;
  const p = player.body.translation();

  for (const entity of [...world.with('pickup')]) {
    const { pickup } = entity;
    if (Math.hypot(pickup.x - p.x, pickup.z - p.z) > config.run.pickupRadius) continue;
    applyReward(ctx, pickup.reward);
    for (const m of entity.room?.dispose ?? []) m.dispose();
    world.remove(entity);
  }

  if (state.run.status === 'choosing' && input.wasPressed('KeyE')) {
    const door = nearestOpenDoor(ctx, p.x, p.z);
    if (door) chooseDoor(ctx, door.index);
  }
};

/** The open door the player stands in front of, if any. Shared with the HUD prompt. */
export function nearestOpenDoor(
  ctx: Ctx,
  x: number,
  z: number,
): { index: number; offer: Offer } | null {
  let best: { index: number; offer: Offer } | null = null;
  let bestDistance = config.run.doorRadius;
  for (const { door, object3d } of ctx.world.with('door', 'object3d')) {
    if (!door.open) continue;
    // Doors are static, so their object3d position is their real position.
    const d = Math.hypot(object3d.position.x - x, object3d.position.z + 0.9 - z);
    if (d <= bestDistance) {
      bestDistance = d;
      best = door;
    }
  }
  return best;
}
