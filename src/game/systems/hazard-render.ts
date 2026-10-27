import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx, GameSystem } from '../types';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

/**
 * Meteor markers (rings that fill in as impact nears) and the phase 3 burning
 * ring (frame system), each one instanced draw.
 */
export function createHazardRenderSystem(ctx: Ctx): GameSystem {
  const ring = new THREE.RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2);
  const disc = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
  const material = (color: number, opacity: number) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const outlines = new THREE.InstancedMesh(ring, material(config.colors.marker, 0.85), 32);
  const fills = new THREE.InstancedMesh(disc, material(config.colors.marker, 0.28), 32);
  const burn = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.04, 96).rotateX(-Math.PI / 2),
    material(0xff4a1a, 0.9),
  );
  for (const mesh of [outlines, fills, burn]) {
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    ctx.scene.add(mesh);
  }
  burn.visible = false;

  return ({ state }) => {
    let n = 0;
    const delay = config.enemies.starfallen.meteorDelay;
    for (const h of state.hazards) {
      if (n >= 32) break;
      p.set(h.x, 0.03, h.z);
      s.setScalar(h.radius);
      outlines.setMatrixAt(n, m.compose(p, q, s));
      // The fill grows toward the edge as the meteor gets closer.
      s.setScalar(Math.max(0.001, h.radius * (1 - h.time / delay)));
      fills.setMatrixAt(n, m.compose(p, q, s));
      n++;
    }
    outlines.count = fills.count = n;
    outlines.instanceMatrix.needsUpdate = fills.instanceMatrix.needsUpdate = true;

    burn.visible = state.burnRing !== null;
    if (state.burnRing !== null) {
      burn.position.set(0, 0.04, 0);
      burn.scale.setScalar(state.burnRing);
    }
  };
}
