import * as THREE from 'three/webgpu';
import { ProjectileKind, type ProjectilePool } from '../combat/projectiles';
import { config } from '../config';
import type { Ctx, GameSystem } from '../types';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const v = new THREE.Vector3();
const scale = new THREE.Vector3();
const AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Draws all projectiles and impact bursts with one instanced mesh per kind
 * (frame system), blended between steps like bodies are.
 */
export function createProjectileRenderSystem(ctx: Ctx): GameSystem {
  const capacity = ctx.state.projectiles.capacity;
  const bolts = instanced(new THREE.IcosahedronGeometry(1, 0), config.colors.bolt, capacity);
  const orbs = instanced(new THREE.IcosahedronGeometry(1, 1), config.colors.orb, capacity);
  const comets = instanced(new THREE.IcosahedronGeometry(1, 1), config.colors.comet, 16);
  const boltBursts = instanced(new THREE.IcosahedronGeometry(1, 1), config.colors.bolt, 64);
  const orbBursts = instanced(new THREE.IcosahedronGeometry(1, 1), config.colors.orb, 64);
  const cometBursts = instanced(new THREE.IcosahedronGeometry(1, 2), config.colors.comet, 16, 0.45);
  for (const mesh of [bolts, orbs, comets, boltBursts, orbBursts, cometBursts]) ctx.scene.add(mesh);

  return ({ state, alpha }) => {
    const pool: ProjectilePool = state.projectiles;
    let nb = 0;
    let no = 0;
    let nc = 0;
    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.alive[i]) continue;
      const o = i * 3;
      p.set(pool.prev[o]!, pool.prev[o + 1]!, pool.prev[o + 2]);
      v.set(pool.pos[o]!, pool.pos[o + 1]!, pool.pos[o + 2]);
      p.lerp(v, alpha);
      v.set(pool.vel[o]!, pool.vel[o + 1]!, pool.vel[o + 2]).normalize();
      q.setFromUnitVectors(AXIS, v);
      const r = pool.radius[i]!;
      if (pool.kind[i] === ProjectileKind.Bolt) {
        // Stretched along the flight direction so fast bolts read as streaks.
        const vr = r * config.bolt.visualScale;
        scale.set(vr, vr, vr * 3.5);
        bolts.setMatrixAt(nb++, m.compose(p, q, scale));
      } else if (pool.kind[i] === ProjectileKind.Comet) {
        scale.set(r * 1.4, r * 1.4, r * 2.6);
        comets.setMatrixAt(nc++, m.compose(p, q, scale));
      } else {
        scale.setScalar(r);
        orbs.setMatrixAt(no++, m.compose(p, q.identity(), scale));
      }
    }
    let ib = 0;
    let io = 0;
    for (const im of state.impacts) {
      const t = im.age / 0.25;
      const size =
        (im.kind === ProjectileKind.Bolt ? 0.35 : 0.7) * Math.sin(Math.PI * Math.min(1, t));
      p.set(im.x, im.y, im.z);
      scale.setScalar(Math.max(0.001, size));
      const mesh = im.kind === ProjectileKind.Bolt ? boltBursts : orbBursts;
      mesh.setMatrixAt(
        im.kind === ProjectileKind.Bolt ? ib++ : io++,
        m.compose(p, q.identity(), scale),
      );
    }
    finish(bolts, nb);
    finish(orbs, no);
    finish(boltBursts, ib);
    finish(orbBursts, io);
  };
}

function instanced(
  geometry: THREE.BufferGeometry,
  color: number,
  count: number,
  opacity = 1,
): THREE.InstancedMesh {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.count = 0;
  // Instances move every frame and spread over the arena; culling the whole set is wrong.
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

function finish(mesh: THREE.InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
}
