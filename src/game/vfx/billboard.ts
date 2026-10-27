import * as THREE from 'three/webgpu';

/**
 * Camera-facing quads written straight into instance matrices (column-major,
 * 16 floats each), so drawing thousands of particles allocates nothing. The
 * quads are unit planes in local x and y.
 */

export interface CameraBasis {
  /** Camera right, up and back (toward the viewer) in world space, and its position. */
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
  bx: number;
  by: number;
  bz: number;
  px: number;
  py: number;
  pz: number;
}

export const newCameraBasis = (): CameraBasis => ({
  rx: 1,
  ry: 0,
  rz: 0,
  ux: 0,
  uy: 1,
  uz: 0,
  bx: 0,
  by: 0,
  bz: 1,
  px: 0,
  py: 0,
  pz: 0,
});

const rotation = new THREE.Matrix4();

/**
 * Reads the camera's axes from its quaternion and position, which the camera
 * system has set this frame (its world matrix only updates when rendering).
 */
export function cameraBasis(camera: THREE.Camera, out: CameraBasis): CameraBasis {
  const e = rotation.makeRotationFromQuaternion(camera.quaternion).elements;
  out.rx = e[0]!;
  out.ry = e[1]!;
  out.rz = e[2]!;
  out.ux = e[4]!;
  out.uy = e[5]!;
  out.uz = e[6]!;
  out.bx = e[8]!;
  out.by = e[9]!;
  out.bz = e[10]!;
  out.px = camera.position.x;
  out.py = camera.position.y;
  out.pz = camera.position.z;
  return out;
}

function write(
  m: Float32Array,
  n: number,
  xx: number,
  xy: number,
  xz: number,
  yx: number,
  yy: number,
  yz: number,
  zx: number,
  zy: number,
  zz: number,
  tx: number,
  ty: number,
  tz: number,
): void {
  const o = n * 16;
  m[o] = xx;
  m[o + 1] = xy;
  m[o + 2] = xz;
  m[o + 3] = 0;
  m[o + 4] = yx;
  m[o + 5] = yy;
  m[o + 6] = yz;
  m[o + 7] = 0;
  m[o + 8] = zx;
  m[o + 9] = zy;
  m[o + 10] = zz;
  m[o + 11] = 0;
  m[o + 12] = tx;
  m[o + 13] = ty;
  m[o + 14] = tz;
  m[o + 15] = 1;
}

/** A round sprite of `size` m facing the camera, centered on (x, y, z). */
export function billboard(
  m: Float32Array,
  n: number,
  c: CameraBasis,
  x: number,
  y: number,
  z: number,
  size: number,
): void {
  write(
    m,
    n,
    c.rx * size,
    c.ry * size,
    c.rz * size,
    c.ux * size,
    c.uy * size,
    c.uz * size,
    c.bx,
    c.by,
    c.bz,
    x,
    y,
    z,
  );
}

/**
 * A quad placed at (ax, ay, az) whose local y spans (dx, dy, dz): a centered
 * plane reaches half of it to each side, a plane from y 0 to 1 starts at the
 * point. It is `width` m wide and turns around its axis to face the camera.
 * Returns false (nothing written) for a zero-length axis.
 */
export function streak(
  m: Float32Array,
  n: number,
  c: CameraBasis,
  ax: number,
  ay: number,
  az: number,
  dx: number,
  dy: number,
  dz: number,
  width: number,
): boolean {
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return false;
  // Sideways = along x toward-camera: perpendicular to the streak and the view.
  const vx = c.px - ax;
  const vy = c.py - ay;
  const vz = c.pz - az;
  let sx = dy * vz - dz * vy;
  let sy = dz * vx - dx * vz;
  let sz = dx * vy - dy * vx;
  let sl = Math.hypot(sx, sy, sz);
  if (sl < 1e-6) {
    // Looking straight down the streak: any side will do.
    sx = c.rx;
    sy = c.ry;
    sz = c.rz;
    sl = 1;
  }
  const k = width / sl;
  sx *= k;
  sy *= k;
  sz *= k;
  write(m, n, sx, sy, sz, dx, dy, dz, c.bx, c.by, c.bz, ax, ay, az);
  return true;
}
