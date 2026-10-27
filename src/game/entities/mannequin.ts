import * as THREE from 'three/webgpu';
import { config } from '../config';

/**
 * A procedural robed figure with named joints, plus idle and run clips that
 * animate those joints. It stands in for the real rigged character (M6) and
 * exercises the same Animator path a glTF model will use.
 *
 * The root's origin is at the feet, facing -z. Total height is about 1.8 m.
 */
export function createMannequin(): { root: THREE.Group; clips: THREE.AnimationClip[] } {
  const root = new THREE.Group();
  root.name = 'mannequin';

  const hips = joint('hips', root, 0, HIP_Y, 0);
  const spine = joint('spine', hips, 0, 0.05, 0);
  part(spine, geometries.torso, materials.robe, 0, 0.3, 0);
  part(spine, geometries.mantle, materials.hood, 0, 0.55, 0.02);
  const neck = joint('neck', spine, 0, 0.62, 0);
  part(neck, geometries.head, materials.skin, 0, 0.13, -0.01);
  part(neck, geometries.hood, materials.hood, 0, 0.16, 0.03);
  for (const side of [-1, 1] as const) {
    const arm = joint(side < 0 ? 'armL' : 'armR', spine, side * 0.26, 0.52, 0);
    part(arm, geometries.arm, materials.robe, 0, -0.27, 0);
    part(arm, geometries.hand, materials.skin, 0, -0.56, 0);
    const leg = joint(side < 0 ? 'legL' : 'legR', hips, side * 0.11, 0, 0);
    part(leg, geometries.leg, materials.hood, 0, -0.46, 0);
  }
  part(hips, geometries.skirt, materials.robe, 0, -0.28, 0);
  // Gold sash so facing is readable from behind.
  part(spine, geometries.sash, materials.accent, 0, 0.04, 0);

  return { root, clips: [idleClip(), runClip()] };
}

const HIP_Y = 0.95;

const geometries = {
  torso: new THREE.BoxGeometry(0.42, 0.58, 0.26),
  mantle: new THREE.BoxGeometry(0.56, 0.14, 0.32),
  head: new THREE.IcosahedronGeometry(0.13, 1),
  hood: new THREE.ConeGeometry(0.19, 0.34, 8),
  arm: new THREE.BoxGeometry(0.11, 0.54, 0.11),
  hand: new THREE.BoxGeometry(0.09, 0.1, 0.09),
  leg: new THREE.BoxGeometry(0.13, 0.9, 0.14),
  skirt: new THREE.CylinderGeometry(0.2, 0.36, 0.72, 8, 1, true),
  sash: new THREE.BoxGeometry(0.44, 0.06, 0.28),
};
const materials = {
  robe: new THREE.MeshStandardMaterial({
    color: config.colors.robe,
    roughness: 0.9,
    side: THREE.DoubleSide,
  }),
  hood: new THREE.MeshStandardMaterial({ color: config.colors.hood, roughness: 0.95 }),
  skin: new THREE.MeshStandardMaterial({ color: config.colors.skin, roughness: 0.7 }),
  accent: new THREE.MeshStandardMaterial({
    color: config.colors.accent,
    roughness: 0.4,
    metalness: 0.6,
  }),
};

function joint(
  name: string,
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): void {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
}

const euler = new THREE.Euler();
const quat = new THREE.Quaternion();

/** Rotation track around one axis for joint `name`. */
function rot(
  name: string,
  axis: 'x' | 'z',
  times: number[],
  angles: number[],
): THREE.KeyframeTrack {
  const values: number[] = [];
  for (const a of angles) {
    euler.set(axis === 'x' ? a : 0, 0, axis === 'z' ? a : 0);
    quat.setFromEuler(euler);
    values.push(quat.x, quat.y, quat.z, quat.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
}

function hipHeight(times: number[], offsets: number[]): THREE.KeyframeTrack {
  return new THREE.VectorKeyframeTrack(
    'hips.position',
    times,
    offsets.flatMap((dy) => [0, HIP_Y + dy, 0]),
  );
}

function idleClip(): THREE.AnimationClip {
  const t = [0, 1, 2];
  return new THREE.AnimationClip('idle', 2, [
    hipHeight(t, [0, -0.012, 0]),
    rot('spine', 'x', t, [0.02, -0.02, 0.02]),
    rot('neck', 'x', t, [0, 0.04, 0]),
    rot('armL', 'z', t, [-0.08, -0.12, -0.08]),
    rot('armR', 'z', t, [0.08, 0.12, 0.08]),
  ]);
}

/** One full stride: left leg back, then left leg forward. Positive x rotation swings a limb forward (-z). */
function runClip(): THREE.AnimationClip {
  const d = 0.7;
  const t = [0, d / 4, d / 2, (3 * d) / 4, d];
  const swing = 0.75;
  const arm = 0.55;
  return new THREE.AnimationClip('run', d, [
    hipHeight(t, [-0.05, 0.02, -0.05, 0.02, -0.05]),
    rot('spine', 'x', t, [-0.16, -0.12, -0.16, -0.12, -0.16]),
    rot('legL', 'x', t, [-swing, 0, swing, 0, -swing]),
    rot('legR', 'x', t, [swing, 0, -swing, 0, swing]),
    rot('armL', 'x', t, [arm, 0, -arm, 0, arm]),
    rot('armR', 'x', t, [-arm, 0, arm, 0, -arm]),
  ]);
}
