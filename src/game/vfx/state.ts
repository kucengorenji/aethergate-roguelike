import { Rng } from '@engine/rng';
import { PARTICLE_TAGS, ParticlePool } from './particles';

/** Mixed into the launch seed so effects draw from their own stream. */
const VFX_SALT = 0x9e3779b9;

/** Cosmetic simulation state of the effects (spec 0014); gameplay never reads it. */
export interface VfxState {
  particles: ParticlePool;
  /** The effects' own random stream: gameplay randomness (`ctx.rng`) never sees it. */
  rng: Rng;
  /** Seconds of time-scaled play: particles slow down in hitstop like everything else. */
  clock: number;
  /** How far the clock moved in the last step, to blend between steps when drawing. */
  stepDt: number;
  /** Quality multiplier on particle counts, set each step. */
  density: number;
  /** Per projectile slot: alive last step, its life then, and meters flown since its cast. */
  seen: Uint8Array;
  lastLife: Float32Array;
  flown: Float32Array;
  /** Particles emitted per tag (`PARTICLE_TAGS`) since start, for tests and tuning. */
  emitted: Uint32Array;
}

export function createVfxState(seed: number, projectiles: number, capacity: number): VfxState {
  return {
    particles: new ParticlePool(capacity),
    rng: new Rng((seed ^ VFX_SALT) >>> 0),
    clock: 0,
    stepDt: 0,
    density: 1,
    seen: new Uint8Array(projectiles),
    lastLife: new Float32Array(projectiles),
    flown: new Float32Array(projectiles),
    emitted: new Uint32Array(PARTICLE_TAGS.length),
  };
}
