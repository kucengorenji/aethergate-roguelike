/**
 * Swept hit test between a moving sphere (segment a->b with radius `r`) and a
 * vertical capsule (center c, half height h of the inner segment, radius cr).
 * Returns the fraction along a->b of the closest approach when they touch,
 * or null. Exact enough for fast projectiles at 60 Hz.
 */
export function sweepSphereCapsule(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  r: number,
  cx: number,
  cy: number,
  cz: number,
  h: number,
  cr: number,
): number | null {
  // Closest points between segment P(s) = a + s*d (s in [0,1]) and the capsule's
  // vertical segment Q(t) = (cx, cy + t, cz) with t in [-h, h].
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const wx = ax - cx;
  const wz = az - cz;
  const horiz = dx * dx + dz * dz;
  let s: number;
  if (horiz < 1e-12) {
    s = 0;
  } else {
    // Minimize horizontal distance first; vertical is handled by clamping t.
    s = Math.min(1, Math.max(0, -(wx * dx + wz * dz) / horiz));
  }
  // Refine: a few passes alternating the two clamped parameters converge for this shape.
  let t = 0;
  for (let i = 0; i < 3; i++) {
    const py = ay + s * dy;
    t = Math.min(h, Math.max(-h, py - cy));
    const qy = cy + t;
    const len2 = horiz + dy * dy;
    if (len2 < 1e-12) break;
    s = Math.min(1, Math.max(0, -(wx * dx + (ay - qy) * dy + wz * dz) / len2));
  }
  const px = ax + s * dx - cx;
  const py = ay + s * dy - (cy + t);
  const pz = az + s * dz - cz;
  const reach = r + cr;
  return px * px + py * py + pz * pz <= reach * reach ? s : null;
}
