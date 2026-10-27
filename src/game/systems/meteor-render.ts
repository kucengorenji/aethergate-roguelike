import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx, GameSystem } from '../types';
import { meteorAt } from '../vfx/meteor';

const CAPACITY = 32;
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const at = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 };

/**
 * Falling meteors (frame system): a glowing, tumbling rock per hazard during
 * its last moments, landing on its decal when the hazard strikes. Their fiery
 * tails are ribbons (`trail-render`).
 */
export function createMeteorRenderSystem(ctx: Ctx): GameSystem {
  const material = new THREE.MeshStandardMaterial({
    color: config.vfx.colors.meteor,
    emissive: config.vfx.colors.fire,
    emissiveIntensity: 2.5,
    roughness: 0.9,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, CAPACITY);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ctx.scene.add(mesh);

  return ({ state, alpha }) => {
    let n = 0;
    const pending = state.vfx.stepDt * (1 - alpha);
    for (const h of state.hazards) {
      if (n >= CAPACITY || !meteorAt(h.x, h.z, h.time + pending, at)) continue;
      const tumble = (h.time + pending) * 9;
      q.setFromEuler(e.set(tumble, tumble * 0.7, n));
      s.setScalar(0.55 * (h.radius / 1.8));
      mesh.setMatrixAt(n, m.compose(p.set(at.x, at.y, at.z), q, s));
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = n > 0;
  };
}
