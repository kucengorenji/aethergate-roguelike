import { ARENAS } from '../arenas/layouts';
import { rewardPoint } from '../arenas/types';
import { config } from '../config';
import { spawnDoors } from '../entities/door';
import { despawnRoom, spawnArena } from '../entities/level';
import { placePlayer, resetPlayer } from '../entities/player';
import { spawnPickup } from '../entities/pickup';
import { FIRST_REWARD, planRun } from '../run/plan';
import type { Reward } from '../run/rewards';
import type { Ctx, GameSystem } from '../types';
import { setEncounter } from './waves';

/**
 * The run's room flow: fight (or not, in grace rooms), take the reward, choose
 * a door, fade to the next room. The boss room ends the run.
 */
export const runSystem: GameSystem = (ctx) => {
  const { state, dt } = ctx;
  const run = state.run;
  if (state.mode !== 'run' || !run.plan || state.phase !== 'playing') return;
  run.timer += dt;
  if (run.status !== 'complete') run.time += dt;
  const room = run.plan.rooms[run.index]!;

  switch (run.status) {
    case 'fighting': {
      const enc = state.encounter.status;
      if (enc !== 'cleared' && enc !== 'off') break;
      if (room.kind === 'boss') {
        setStatus(run, 'complete');
        ctx.audio.play('cleared', { volume: 0.7 });
      } else if (run.reward) {
        const at = rewardPoint(state.layout);
        spawnPickup(ctx, run.reward, at.x, at.z);
        setStatus(run, 'reward');
      } else {
        openDoors(ctx);
      }
      break;
    }
    case 'reward':
      // A blessing choice keeps the doors shut until a card is taken.
      if (!ctx.world.with('pickup').first && !state.choice) openDoors(ctx);
      break;
    case 'transition': {
      const fade = config.run.fadeSeconds;
      if (!run.loaded && run.timer >= fade) {
        const offer = run.plan.offers[run.index]![run.chosen];
        enterRoom(ctx, run.index + 1, offer === 'boss' || offer === undefined ? null : offer);
        run.loaded = true;
      }
      if (run.timer >= fade * 2) setStatus(run, 'fighting');
      break;
    }
    case 'choosing':
    case 'complete':
      break;
  }
};

/** Starts a new run from `seed`: full health, no rewards, the first room. */
export function startRun(ctx: Ctx, seed: number): void {
  const { state } = ctx;
  state.run.plan = planRun(seed);
  Object.assign(state.run, { index: 0, boons: 0, shards: 0, time: 0, loaded: false, chosen: 0 });
  state.phase = 'playing';
  state.elapsed = 0;
  state.message = null;
  Object.assign(state.feedback, { hitstop: 0, kick: 0, shake: 0, hurt: 0 });
  ctx.timeScale = 1;
  enterRoom(ctx, 0, FIRST_REWARD);
  for (const player of ctx.world.with('player')) resetPlayer(ctx, player, state.layout);
  setStatus(state.run, 'fighting');
}

/** Replaces the current room with room `index` of the plan, granting `reward` when cleared. */
export function enterRoom(ctx: Ctx, index: number, reward: Reward | null): void {
  const { state } = ctx;
  const plan = state.run.plan!;
  const room = plan.rooms[index]!;
  const layout = ARENAS[room.layout]!;
  despawnRoom(ctx);
  state.projectiles.clear();
  state.impacts.length = 0;
  state.damageNumbers.length = 0;
  state.layout = layout;
  spawnArena(ctx, layout);
  spawnDoors(ctx, layout, plan.offers[index] ?? []);
  for (const player of ctx.world.with('player')) placePlayer(ctx, player, layout);
  // The first room waits for the pointer lock like the M3 encounter; later rooms start sooner.
  setEncounter(ctx, room.waves, index === 0 ? config.encounter.startDelay : config.run.startDelay);
  state.run.index = index;
  state.run.reward = reward;
}

function openDoors(ctx: Ctx): void {
  for (const { door } of ctx.world.with('door')) door.open = true;
  setStatus(ctx.state.run, 'choosing');
  ctx.audio.play('doors', { volume: 0.5 });
}

function setStatus(run: Ctx['state']['run'], status: Ctx['state']['run']['status']): void {
  run.status = status;
  run.timer = 0;
}

/** Starts the fade toward the room behind door `index`. */
export function chooseDoor(ctx: Ctx, index: number): void {
  const run = ctx.state.run;
  run.chosen = index;
  run.loaded = false;
  setStatus(run, 'transition');
  ctx.audio.play('door', { volume: 0.6 });
}
