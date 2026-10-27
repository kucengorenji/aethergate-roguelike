import type { Rng } from '@engine/rng';
import type { ParticlePool } from './particles';

/** How a burst of particles behaves; see `config.vfx.bursts`. Missing fields take the defaults below. */
export interface Recipe {
  count?: number;
  life: readonly [number, number];
  speed?: readonly [number, number];
  size: readonly [number, number];
  spread?: number;
  drag?: number;
  gravity?: number;
  stretch?: number;
  alpha?: number;
  glow?: number;
}

/** Linear RGB. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** What emission writes to and draws from: the VFX state satisfies it. */
export interface Emitter {
  particles: ParticlePool;
  /** The effects' own random stream, never `ctx.rng`. */
  rng: Rng;
  clock: number;
  /** Quality multiplier on particle counts. */
  density: number;
  emitted: Uint32Array;
}

const dir = { x: 0, y: 0, z: 0 };
const offset = { x: 0, y: 0, z: 0 };
const NO_SPEED = [0, 0] as const;

/** Particles a recipe spawns at this density; the fractional part is rolled. */
export function rollCount(e: Emitter, count: number): number {
  const n = count * e.density;
  const whole = Math.floor(n);
  return whole + (e.rng.next() < n - whole ? 1 : 0);
}

/**
 * Spawns one particle with velocity (vx, vy, vz); life and size are drawn from
 * the recipe, and `scale` grows size and speed for bigger sources. Dropped
 * silently when the pool is full.
 */
export function emitOne(
  e: Emitter,
  tag: number,
  recipe: Recipe,
  color: Rgb,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  scale = 1,
): void {
  const pool = e.particles;
  const i = pool.take();
  if (i < 0) return;
  const { rng } = e;
  const o = i * 3;
  pool.tag[i] = tag;
  pool.born[i] = e.clock;
  pool.life[i] = rng.range(recipe.life[0], recipe.life[1]);
  pool.origin[o] = x;
  pool.origin[o + 1] = y;
  pool.origin[o + 2] = z;
  pool.velocity[o] = vx;
  pool.velocity[o + 1] = vy;
  pool.velocity[o + 2] = vz;
  pool.drag[i] = recipe.drag ?? 0;
  pool.gravity[i] = recipe.gravity ?? 0;
  // A little size variety keeps bursts from looking stamped.
  const size = scale * rng.range(0.75, 1.25);
  pool.size[i * 2] = recipe.size[0] * size;
  pool.size[i * 2 + 1] = recipe.size[1] * size;
  const alpha = recipe.alpha ?? 0;
  const glow = alpha > 0 ? 1 : (recipe.glow ?? 1);
  pool.color[i * 4] = color.r * glow;
  pool.color[i * 4 + 1] = color.g * glow;
  pool.color[i * 4 + 2] = color.b * glow;
  pool.color[i * 4 + 3] = alpha;
  pool.stretch[i] = recipe.stretch ?? 0;
  e.emitted[tag] = (e.emitted[tag] ?? 0) + 1;
}

/**
 * Sprays particles from (x, y, z) into a cone around (dx, dy, dz), which need
 * not be normalized. `jitter` scatters the start points in a ball; `count` (the
 * recipe's by default) is scaled by the density. Returns how many were rolled.
 */
export function burst(
  e: Emitter,
  tag: number,
  recipe: Recipe,
  color: Rgb,
  x: number,
  y: number,
  z: number,
  dx: number,
  dy: number,
  dz: number,
  scale = 1,
  jitter = 0,
  count = recipe.count ?? 1,
): number {
  const n = rollCount(e, count);
  const [lo, hi] = recipe.speed ?? NO_SPEED;
  const spread = recipe.spread ?? Math.PI;
  for (let k = 0; k < n; k++) {
    coneDirection(e.rng, dx, dy, dz, spread, dir);
    const speed = e.rng.range(lo, hi) * scale;
    let r = 0;
    if (jitter > 0) {
      coneDirection(e.rng, 0, 1, 0, Math.PI, offset);
      r = jitter * Math.cbrt(e.rng.next());
    }
    emitOne(
      e,
      tag,
      recipe,
      color,
      x + offset.x * r,
      y + offset.y * r,
      z + offset.z * r,
      dir.x * speed,
      dir.y * speed,
      dir.z * speed,
      scale,
    );
  }
  return n;
}

/**
 * A random unit vector within `spread` radians of (ax, ay, az), uniform over the
 * spherical cap. A zero axis points up.
 */
export function coneDirection(
  rng: Rng,
  ax: number,
  ay: number,
  az: number,
  spread: number,
  out: { x: number; y: number; z: number },
): void {
  let len = Math.hypot(ax, ay, az);
  if (len < 1e-9) {
    ax = 0;
    ay = 1;
    az = 0;
    len = 1;
  }
  ax /= len;
  ay /= len;
  az /= len;
  const cosT = 1 - rng.next() * (1 - Math.cos(Math.min(spread, Math.PI)));
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  const phi = rng.next() * Math.PI * 2;
  // Two unit vectors perpendicular to the axis.
  let ux: number;
  let uy: number;
  let uz: number;
  if (Math.abs(ay) < 0.9) {
    // u = axis x up
    ux = -az;
    uy = 0;
    uz = ax;
  } else {
    // u = axis x right
    ux = 0;
    uy = az;
    uz = -ay;
  }
  const ul = Math.hypot(ux, uy, uz);
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const vx = ay * uz - az * uy;
  const vy = az * ux - ax * uz;
  const vz = ax * uy - ay * ux;
  const c = Math.cos(phi) * sinT;
  const s = Math.sin(phi) * sinT;
  out.x = ax * cosT + ux * c + vx * s;
  out.y = ay * cosT + uy * c + vy * s;
  out.z = az * cosT + uz * c + vz * s;
}
