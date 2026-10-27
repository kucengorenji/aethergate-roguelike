import { config } from '../config';

/** Status effects on one enemy. Times are seconds left. */
export interface Status {
  chill: number;
  chillTime: number;
  frozen: number;
  weight: number;
  weightTime: number;
  rot: number;
  rotTime: number;
  /** Seconds until the next rot damage tick. */
  rotTick: number;
}

export const noStatus = (): Status => ({
  chill: 0,
  chillTime: 0,
  frozen: 0,
  weight: 0,
  weightTime: 0,
  rot: 0,
  rotTime: 0,
  rotTick: 0,
});

/** Adds Chill; the stack that reaches the cap freezes and clears the stacks. Returns true on freeze. */
export function addChill(s: Status, stacks: number): boolean {
  if (s.frozen > 0) return false;
  const { maxStacks, duration, freezeSeconds } = config.status.chill;
  s.chill = Math.min(maxStacks, s.chill + stacks);
  s.chillTime = duration;
  if (s.chill < maxStacks) return false;
  s.chill = 0;
  s.frozen = freezeSeconds;
  return true;
}

/** Adds Weight; the third stack crushes and clears. Returns true on crush. */
export function addWeight(s: Status, stacks: number): boolean {
  const { maxStacks, duration } = config.status.weight;
  s.weight += stacks;
  s.weightTime = duration;
  if (s.weight < maxStacks) return false;
  s.weight = 0;
  return true;
}

export function addRot(s: Status, stacks: number, fester: boolean): void {
  const { maxStacks, festerMaxStacks, duration, tick } = config.status.rot;
  if (s.rot === 0) s.rotTick = tick;
  s.rot = Math.min(fester ? festerMaxStacks : maxStacks, s.rot + stacks);
  s.rotTime = duration;
}

/**
 * Advances timers by `dt` and returns rot damage dealt this step (0 between ticks).
 * Chill and weight fall off when their timers run out.
 */
export function tickStatus(s: Status, dt: number, fester: boolean): number {
  s.frozen = Math.max(0, s.frozen - dt);
  s.chillTime = Math.max(0, s.chillTime - dt);
  if (s.chillTime === 0) s.chill = 0;
  s.weightTime = Math.max(0, s.weightTime - dt);
  if (s.weightTime === 0) s.weight = 0;
  if (s.rot === 0) return 0;
  const { perStackPerSecond, tick, festerBonus } = config.status.rot;
  s.rotTime -= dt;
  s.rotTick -= dt;
  let damage = 0;
  if (s.rotTick <= 0) {
    damage = s.rot * perStackPerSecond * tick * (fester ? 1 + festerBonus : 1);
    s.rotTick += tick;
  }
  if (s.rotTime <= 0) {
    s.rot = 0;
    s.rotTime = 0;
  }
  return damage;
}

/** Multiplier on an enemy's own time and speed: chill slows, frozen stops. */
export function timeFactor(s: Status | undefined): number {
  if (!s) return 1;
  if (s.frozen > 0) return 0;
  return 1 - s.chill * config.status.chill.slowPerStack;
}
