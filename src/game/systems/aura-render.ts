import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx, GameSystem } from '../types';

const CAPACITY = 64;
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** Seconds the ice takes to form and to melt away. */
const FORM = 0.12;
const MELT = 0.25;

/**
 * Faceted ice shells around frozen enemies and the dummy (frame system): one
 * instanced, translucent low-poly crystal per frozen body. The other status
 * auras are particles (`vfxSystem`).
 */
export function createAuraRenderSystem(ctx: Ctx): GameSystem {
  const ice = config.vfx.colors.ice;
  const material = new THREE.MeshStandardMaterial({
    color: ice,
    emissive: ice,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.1,
    flatShading: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, CAPACITY);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ctx.scene.add(mesh);
  const bodies = ctx.world.with('status', 'object3d', 'hurtbox');
  const freeze = config.status.chill.freezeSeconds;

  return () => {
    let n = 0;
    for (const { status, object3d, hurtbox } of bodies) {
      if (status.frozen <= 0 || n >= CAPACITY) continue;
      const grow = Math.min(1, (freeze - status.frozen) / FORM, status.frozen / MELT);
      const r = hurtbox.radius * 1.55 * grow;
      s.set(r, (hurtbox.halfHeight + hurtbox.radius) * 1.2 * grow, r);
      // A fixed tilt per slot keeps the crystal from looking machine-made.
      q.setFromAxisAngle(UP, 0.5 + n * 1.3);
      mesh.setMatrixAt(n, m.compose(object3d.position, q, s));
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = n > 0;
  };
}
