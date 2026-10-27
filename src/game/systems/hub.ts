import { ARENAS, HALL_LAYOUT } from '../arenas/layouts';
import { despawnRoom, spawnArena } from '../entities/level';
import { resetPlayer } from '../entities/player';
import { spawnStation } from '../entities/station';
import { applyLoadout } from '../meta/apply';
import { bankRun, type RunEnd } from '../meta/bank';
import { saveGame } from '../save';
import type { Ctx } from '../types';
import { setEncounter } from './waves';

/** Loads the Kindled Hall: its room, its three stations, and the player at full strength. */
export function enterHub(ctx: Ctx): void {
  const { state } = ctx;
  const layout = ARENAS[HALL_LAYOUT]!;
  despawnRoom(ctx);
  setEncounter(ctx, [], 0);
  state.projectiles.clear();
  state.hazards.length = 0;
  state.burnRing = null;
  state.impacts.length = 0;
  state.damageNumbers.length = 0;
  state.pendingBursts.length = 0;
  state.arcs.length = 0;
  state.choice = null;
  state.layout = layout;
  spawnArena(ctx, layout);
  for (const s of layout.stations ?? []) spawnStation(ctx, s.kind, s.x, s.z);
  Object.assign(state.run, { active: false, plan: null, index: 0, status: 'fighting', timer: 0 });
  state.phase = 'playing';
  Object.assign(state.feedback, { hitstop: 0, kick: 0, shake: 0, hurt: 0 });
  ctx.timeScale = 1;
  for (const player of ctx.world.with('player')) {
    resetPlayer(ctx, player, layout);
    applyLoadout(ctx, player);
  }
}

/**
 * Ends the current run, banks its shards and stats, saves, and goes back to the
 * hall. Used after death, after victory and when abandoning from the pause menu.
 */
export function returnToHub(ctx: Ctx, end: RunEnd): void {
  const { run } = ctx.state;
  const shards = run.shards;
  bankRun(ctx.state.save, shards, end, run.time);
  void saveGame(ctx);
  enterHub(ctx);
  ctx.state.message = {
    text: shards > 0 ? `${shards} Lumen shards banked` : 'Back in the Kindled Hall',
    age: 0,
  };
}
