import { config } from '../config';

/** Where meteors come from: high up, from the far right of the arena (unit vector). */
const FROM = (() => {
  const x = 0.45;
  const y = 1;
  const z = -0.35;
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
})();

/**
 * Where a meteor is `time` seconds before it lands on (x, z): falling in a
 * straight line during the last `meteorFall` seconds, not yet visible before.
 * Writes the position and the unit direction it falls in; returns false while
 * the meteor has not appeared.
 */
export function meteorAt(
  x: number,
  z: number,
  time: number,
  out: { x: number; y: number; z: number; dx: number; dy: number; dz: number },
): boolean {
  const { meteorFall, meteorHeight } = config.vfx.telegraphs;
  if (time > meteorFall || time < 0) return false;
  const along = (time / meteorFall) * (meteorHeight / FROM.y);
  out.x = x + FROM.x * along;
  out.y = FROM.y * along;
  out.z = z + FROM.z * along;
  out.dx = -FROM.x;
  out.dy = -FROM.y;
  out.dz = -FROM.z;
  return true;
}
