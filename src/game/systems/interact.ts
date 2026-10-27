import { config } from '../config';
import type { StationKind } from '../entities/station';
import { applyReward } from '../run/apply';
import type { Offer } from '../run/rewards';
import { openPanel } from '../save';
import type { Ctx, GameSystem } from '../types';
import { chooseDoor, startRun } from './run';

/**
 * In a run: walking into a reward token takes it, E near an open door goes
 * through it. In the Kindled Hall: E uses the station the player stands at.
 */
export const interactSystem: GameSystem = (ctx) => {
  const { state, input, world } = ctx;
  if (state.phase !== 'playing' || state.panel !== null) return;
  const player = world.with('player', 'body').first;
  if (!player) return;
  const p = player.body.translation();

  if (!state.run.active) {
    if (state.mode !== 'hub' || !input.wasPressed('KeyE')) return;
    const station = nearestStation(ctx, p.x, p.z);
    if (station === 'grace') {
      // Each run gets its own seed from the session RNG, so runs differ but a
      // `?seed=` session replays the same sequence of runs.
      startRun(ctx, ctx.rng.int(1, 2 ** 30));
      ctx.audio.play('door', { volume: 0.6 });
    } else if (station === 'altar') {
      openPanel(ctx, 'shop');
    } else if (station === 'rack') {
      openPanel(ctx, 'staffs');
    }
    return;
  }

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

/** The hall station within reach of (x, z), if any. Shared with the HUD prompt. */
export function nearestStation(ctx: Ctx, x: number, z: number): StationKind | null {
  let best: StationKind | null = null;
  let bestDistance = config.hub.stationRadius;
  for (const { station, object3d } of ctx.world.with('station', 'object3d')) {
    // Stations are static: their object3d position is their real position.
    const d = Math.hypot(object3d.position.x - x, object3d.position.z - z);
    if (d <= bestDistance) {
      bestDistance = d;
      best = station.kind;
    }
  }
  return best;
}
