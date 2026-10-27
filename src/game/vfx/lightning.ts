import { hash } from './ash';

/** Inner points per bolt, sideways jag in m, and how often the shape flickers. */
export const LIGHTNING = { segments: 7, jag: 0.35, flickerSeconds: 0.05 };

/**
 * Points of a jagged lightning bolt from a to b: the ends stay put, inner points
 * are pushed sideways (most in the middle) and re-rolled every flicker. Pure:
 * the same arc at the same age always has the same shape. Writes
 * `segments + 1` points as x, y, z triples and returns the point count.
 */
export function lightningPoints(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  age: number,
  out: Float32Array,
): number {
  const { segments, jag, flickerSeconds } = LIGHTNING;
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  // Two directions across the bolt: horizontal and up-ish.
  let px = -dz;
  let pz = dx;
  const pl = Math.hypot(px, pz) || 1;
  px /= pl;
  pz /= pl;
  const seed = (Math.floor(age / flickerSeconds) * 7919) ^ Math.round((ax + bz) * 97);
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const swing = s === 0 || s === segments ? 0 : jag * Math.sin(Math.PI * t);
    const side = (hash(seed + s, 1) * 2 - 1) * swing;
    const up = (hash(seed + s, 2) * 2 - 1) * swing;
    out[s * 3] = ax + dx * t + px * side;
    out[s * 3 + 1] = ay + dy * t + up;
    out[s * 3 + 2] = az + dz * t + pz * side;
  }
  return segments + 1;
}
