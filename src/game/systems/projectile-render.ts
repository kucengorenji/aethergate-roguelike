import * as THREE from 'three/webgpu';
import { OrbLook, ProjectileKind, type ProjectilePool } from '../combat/projectiles';
import { config } from '../config';
import { STAFFS } from '../meta/staffs';
import type { Ctx, GameSystem } from '../types';
import type { Rgb } from '../vfx/emit';
import { elementColor, linear, primaryElement } from '../vfx/palette';

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const v = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();
const boltColor = new THREE.Color();
const cometColor = new THREE.Color();
const AXIS = new THREE.Vector3(0, 0, 1);
const rgb: Rgb = { r: 0, g: 0, b: 0 };
const tint: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Draws the glowing cores of all projectiles with one instanced mesh per kind
 * (frame system), blended between steps like bodies are. Colors are HDR so the
 * cores bloom: bolts by staff and primary blessing, caster orbs green, the
 * comet by its Skill blessing. Trails, impacts and arcs are effects (spec 0014).
 */
export function createProjectileRenderSystem(ctx: Ctx): GameSystem {
  const capacity = ctx.state.projectiles.capacity;
  const bolts = instanced(new THREE.IcosahedronGeometry(1, 0), capacity);
  const orbs = instanced(new THREE.IcosahedronGeometry(1, 1), capacity);
  const comets = instanced(new THREE.IcosahedronGeometry(1, 1), 16);
  for (const mesh of [bolts, orbs, comets]) ctx.scene.add(mesh);

  return ({ state, alpha, world }) => {
    const c = config.vfx.colors;
    const glow = config.vfx.glow.core;
    const player = world.with('player', 'boons', 'skill').first;
    const primary = primaryElement(player?.boons.held);
    // Blessed bolts lean toward their demigod's color but keep some glintstone blue.
    linear(c.bolt, rgb);
    if (primary) {
      linear(elementColor(primary, c.bolt), tint);
      rgb.r = rgb.r * 0.3 + tint.r * 0.7;
      rgb.g = rgb.g * 0.3 + tint.g * 0.7;
      rgb.b = rgb.b * 0.3 + tint.b * 0.7;
    }
    boltColor.setRGB(rgb.r * glow, rgb.g * glow, rgb.b * glow);
    linear(elementColor(player?.skill.element ?? null, c.comet), rgb);
    cometColor.setRGB(rgb.r * glow, rgb.g * glow, rgb.b * glow);

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
        // Stretched along the flight direction so fast bolts read as streaks;
        // the Lance's are long needles.
        const vr = r * config.bolt.visualScale;
        const lance = STAFFS[pool.look[i]!]?.id === 'lance';
        scale.set(vr * (lance ? 0.8 : 1), vr * (lance ? 0.8 : 1), vr * (lance ? 5 : 3.5));
        bolts.setMatrixAt(nb, m.compose(p, q, scale));
        bolts.setColorAt(nb++, boltColor);
      } else if (pool.kind[i] === ProjectileKind.Comet) {
        scale.set(r * 1.4, r * 1.4, r * 2.6);
        comets.setMatrixAt(nc, m.compose(p, q, scale));
        comets.setColorAt(nc++, cometColor);
      } else {
        scale.setScalar(r);
        orbs.setMatrixAt(no, m.compose(p, q.identity(), scale));
        linear(pool.look[i] === OrbLook.Thorn ? c.thorn : c.totem, rgb);
        orbs.setColorAt(
          no++,
          color.setRGB(rgb.r * glow * 0.7, rgb.g * glow * 0.7, rgb.b * glow * 0.7),
        );
      }
    }
    finish(bolts, nb);
    finish(orbs, no);
    finish(comets, nc);
  };
}

function instanced(geometry: THREE.BufferGeometry, count: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), count);
  mesh.count = 0;
  // Instances move every frame and spread over the arena; culling the whole set is wrong.
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Created up front so the material compiles once with per-instance colors.
  mesh.setColorAt(0, color.setRGB(1, 1, 1));
  mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

function finish(mesh: THREE.InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
