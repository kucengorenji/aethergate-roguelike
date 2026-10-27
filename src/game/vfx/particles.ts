/**
 * Cosmetic particles as a fixed-capacity struct-of-arrays, like projectiles.
 * A particle stores only how it started; where it is at any age is closed-form
 * (`particleAt`), so the fixed step never integrates particles, it only spawns
 * them and frees expired slots, and drawing evaluates them at the blended time.
 */
export class ParticlePool {
  readonly alive: Uint8Array;
  /** What emitted it (`PARTICLE_TAGS`), for tests and tuning. */
  readonly tag: Uint8Array;
  /** Birth time on the VFX clock, seconds. */
  readonly born: Float64Array;
  readonly life: Float32Array;
  readonly origin: Float32Array;
  readonly velocity: Float32Array;
  /** Velocity decay per second toward the gravity-driven terminal velocity. */
  readonly drag: Float32Array;
  /** Vertical acceleration, m/s^2 (negative falls). */
  readonly gravity: Float32Array;
  /** Size at birth and at death, m. */
  readonly size: Float32Array;
  /** Linear RGB (HDR allowed) and alpha; alpha 0 adds light instead of covering. */
  readonly color: Float32Array;
  /** Streak length per m/s of speed; 0 is a round sprite. */
  readonly stretch: Float32Array;
  private readonly free: number[] = [];
  private live = 0;

  constructor(readonly capacity: number) {
    this.alive = new Uint8Array(capacity);
    this.tag = new Uint8Array(capacity);
    this.born = new Float64Array(capacity);
    this.life = new Float32Array(capacity);
    this.origin = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.drag = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.size = new Float32Array(capacity * 2);
    this.color = new Float32Array(capacity * 4);
    this.stretch = new Float32Array(capacity);
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
  }

  get count(): number {
    return this.live;
  }

  /** Takes a slot for the caller to fill, or -1 when the pool is full (the particle is dropped). */
  take(): number {
    const i = this.free.pop();
    if (i === undefined) return -1;
    this.alive[i] = 1;
    this.live++;
    return i;
  }

  release(i: number): void {
    if (!this.alive[i]) return;
    this.alive[i] = 0;
    this.free.push(i);
    this.live--;
  }

  /** Frees every particle whose life ended by `now`. */
  expire(now: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.alive[i] && now - this.born[i]! >= this.life[i]!) this.release(i);
    }
  }

  clear(): void {
    for (let i = 0; i < this.capacity; i++) this.release(i);
  }
}

/** Position and velocity of a particle at some age. */
export interface ParticleState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Where particle `i` is `age` seconds after birth: velocity relaxes toward the
 * terminal velocity g / drag (dv/dt = g - drag * v), or falls ballistically
 * without drag.
 */
export function particleAt(pool: ParticlePool, i: number, age: number, out: ParticleState): void {
  const o = i * 3;
  const k = pool.drag[i]!;
  const g = pool.gravity[i]!;
  const vx = pool.velocity[o]!;
  const vy = pool.velocity[o + 1]!;
  const vz = pool.velocity[o + 2]!;
  if (k < 1e-4) {
    out.x = pool.origin[o]! + vx * age;
    out.y = pool.origin[o + 1]! + vy * age + 0.5 * g * age * age;
    out.z = pool.origin[o + 2]! + vz * age;
    out.vx = vx;
    out.vy = vy + g * age;
    out.vz = vz;
    return;
  }
  const decay = Math.exp(-k * age);
  const reach = (1 - decay) / k;
  const terminal = g / k;
  out.x = pool.origin[o]! + vx * reach;
  out.y = pool.origin[o + 1]! + terminal * age + (vy - terminal) * reach;
  out.z = pool.origin[o + 2]! + vz * reach;
  out.vx = vx * decay;
  out.vy = terminal + (vy - terminal) * decay;
  out.vz = vz * decay;
}

/** Emitter names; a particle's `tag` is its index here. */
export const PARTICLE_TAGS = [
  'muzzle',
  'trail',
  'impact',
  'comet',
  'hit',
  'hurt',
  'block',
  'spawn',
  'death',
  'chill',
  'frozen',
  'weight',
  'rot',
  'arc',
  'meteor',
  'flame',
  'blessing',
] as const;
export type ParticleTag = (typeof PARTICLE_TAGS)[number];
export const TAG = Object.fromEntries(PARTICLE_TAGS.map((t, i) => [t, i])) as Record<
  ParticleTag,
  number
>;
