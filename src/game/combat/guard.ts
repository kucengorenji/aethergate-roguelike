/**
 * Whether a hit coming from (sx, sz) lands inside the front arc of an entity at
 * (ex, ez) facing `facing` (yaw 0 faces -z). `arcDegrees` is the full arc width.
 */
export function inFrontArc(
  facing: number,
  ex: number,
  ez: number,
  sx: number,
  sz: number,
  arcDegrees: number,
): boolean {
  const dx = sx - ex;
  const dz = sz - ez;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return true;
  const fx = -Math.sin(facing);
  const fz = -Math.cos(facing);
  return (dx * fx + dz * fz) / len >= Math.cos(((arcDegrees / 2) * Math.PI) / 180);
}
