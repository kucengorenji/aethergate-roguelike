import { config } from '../config';

export interface Flake {
  x: number;
  y: number;
  z: number;
  size: number;
  /** A glowing ember instead of ash. */
  ember: boolean;
  /** 1 well inside the box, falling to 0 at its edges, the floor and the top. */
  fade: number;
}

/** A fixed pseudo-random number in [0, 1) for flake `i` and property `salt`. */
export function hash(i: number, salt: number): number {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function wrap(v: number, size: number): number {
  return v - size * Math.floor(v / size + 0.5);
}

function smooth(edge0: number, edge1: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Ash flake `i` at time `t` seconds: each flake drifts with the wind, sways and
 * falls (embers rise), and wraps around a box centered on (cx, cz), so the air
 * around the player is always full without simulating anything. A pure function
 * of its inputs, so screenshots stay deterministic.
 */
export function ashFlake(i: number, t: number, cx: number, cz: number, out: Flake): Flake {
  const a = config.vfx.ash;
  const pace = 0.7 + 0.6 * hash(i, 6);
  const phase = hash(i, 5) * Math.PI * 2;
  const ember = hash(i, 4) < a.embers;
  const fall = ember ? -0.6 * a.fall : a.fall;
  const ux = hash(i, 1) * a.box + a.wind[0] * t * pace + Math.sin(t * 0.9 * pace + phase) * a.sway;
  const uz = hash(i, 3) * a.box + a.wind[1] * t * pace + Math.cos(t * 0.7 * pace + phase) * a.sway;
  const uy = hash(i, 2) * a.height - fall * t * pace + Math.sin(t * 1.3 + phase) * 0.1;
  const dx = wrap(ux - cx, a.box);
  const dz = wrap(uz - cz, a.box);
  const y = uy - a.height * Math.floor(uy / a.height);
  const half = a.box / 2;
  out.x = cx + dx;
  out.y = y;
  out.z = cz + dz;
  out.ember = ember;
  out.size = (a.size[0] + (a.size[1] - a.size[0]) * hash(i, 7)) * (ember ? 0.6 : 1);
  out.fade =
    (1 - smooth(half * 0.65, half, Math.max(Math.abs(dx), Math.abs(dz)))) *
    smooth(0, 0.6, y) *
    (1 - smooth(a.height - 1.5, a.height, y));
  return out;
}
