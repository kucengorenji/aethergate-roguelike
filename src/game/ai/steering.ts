export interface Disc {
  x: number;
  z: number;
  radius: number;
}

/**
 * Push away from overlapping or nearly touching neighbours, scaled by how deep
 * the overlap is. Returns a velocity (m/s) to add to the desired movement.
 */
export function separation(
  self: Disc,
  others: readonly Disc[],
  gap: number,
  strength = 6,
  /** Picks the push direction when exactly stacked on a neighbour. */
  selfIndex = 0,
): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (const o of others) {
    if (o === self) continue;
    const dx = self.x - o.x;
    const dz = self.z - o.z;
    const min = self.radius + o.radius + gap;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2);
    const depth = (min - d) / min;
    // Exactly stacked: every disc picks a different direction (golden angle by
    // index), deterministic and never all the same way.
    const a = selfIndex * 2.39996;
    const nx = d > 1e-4 ? dx / d : Math.cos(a);
    const nz = d > 1e-4 ? dz / d : Math.sin(a);
    x += nx * depth * strength;
    z += nz * depth * strength;
  }
  return { x, z };
}

/** Turns `from` toward `to` (radians) by at most `maxStep`, the short way round. */
export function turnToward(from: number, to: number, maxStep: number): number {
  let d = to - from;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return from + Math.max(-maxStep, Math.min(maxStep, d));
}
