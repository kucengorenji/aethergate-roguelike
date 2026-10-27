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
/** Impact kinds beyond the projectile kinds: blessing effects. */
const NOVA = 3;
const GRAVITY = 4;
const ELEMENT_COLORS = {
  frost: 0x9fdcff,
  gravity: 0xb48cff,
  rot: 0x9bc53d,
  storm: 0xffe066,
} as const;

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
  const novas = instanced(new THREE.IcosahedronGeometry(1, 2), 0x9fdcff, 16, 0.4);
  const gravity = instanced(new THREE.IcosahedronGeometry(1, 2), 0xb48cff, 16, 0.4);
  const arcs = instanced(new THREE.BoxGeometry(1, 1, 1), 0xfff2a0, 64);
  for (const mesh of [
    bolts,
    orbs,
    comets,
    boltBursts,
    orbBursts,
    cometBursts,
    novas,
    gravity,
    arcs,
  ]) {
    ctx.scene.add(mesh);
  }
  const cometMaterial = comets.material as THREE.MeshBasicMaterial;
  const counts = new Map<THREE.InstancedMesh, number>();
  const put = (mesh: THREE.InstancedMesh) => {
    const n = counts.get(mesh) ?? 0;
    mesh.setMatrixAt(n, m.compose(p, q, scale));
    counts.set(mesh, n + 1);
  };

  return ({ state, alpha, world }) => {
    const element = world.with('player', 'skill').first?.skill.element ?? null;
    cometMaterial.color.setHex(element ? ELEMENT_COLORS[element] : config.colors.comet);
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
    counts.clear();
    for (const im of state.impacts) {
      const t = Math.min(1, im.age / 0.25);
      p.set(im.x, im.y, im.z);
      q.identity();
      switch (im.kind) {
        case ProjectileKind.Bolt:
          scale.setScalar(Math.max(0.001, 0.35 * Math.sin(Math.PI * t)));
          put(boltBursts);
          break;
        case ProjectileKind.Orb:
          scale.setScalar(Math.max(0.001, 0.7 * Math.sin(Math.PI * t)));
          put(orbBursts);
          break;
        case ProjectileKind.Comet:
          // The burst swells to its damage radius so the player sees what it reached.
          scale.setScalar(Math.max(0.001, config.comet.radius * Math.sqrt(t)));
          put(cometBursts);
          break;
        case NOVA:
          scale.setScalar(Math.max(0.001, config.boons.novaRadius * Math.sqrt(t)));
          put(novas);
          break;
        case GRAVITY:
          scale.setScalar(Math.max(0.001, 1.5 * Math.sqrt(t)));
          put(gravity);
          break;
      }
    }
    for (const a of state.arcs) {
      p.set((a.x1 + a.x2) / 2, (a.y1 + a.y2) / 2, (a.z1 + a.z2) / 2);
      v.set(a.x2 - a.x1, a.y2 - a.y1, a.z2 - a.z1);
      const len = v.length();
      q.setFromUnitVectors(AXIS, v.normalize());
      scale.set(0.06, 0.06, len);
      put(arcs);
    }
    finish(bolts, nb);
    finish(orbs, no);
    finish(comets, nc);
    for (const mesh of [boltBursts, orbBursts, cometBursts, novas, gravity, arcs]) {
      finish(mesh, counts.get(mesh) ?? 0);
    }
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
