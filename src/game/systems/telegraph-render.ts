import * as THREE from 'three/webgpu';
import { config } from '../config';
import { enemyGlowColor } from '../entities/enemy';
import type { GameState } from '../state';
import type { Ctx, GameSystem } from '../types';
import type { Rgb } from '../vfx/emit';
import { decalMaterial, instanceAttribute, upload } from '../vfx/materials';
import { elementColor, linear } from '../vfx/palette';
import {
  burnDecal,
  DecalList,
  DecalShape,
  enemyDecals,
  impactDecal,
  meteorDecal,
} from '../vfx/telegraphs';
import type { Entity } from '../components';

const CAPACITY = 96;
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const rgb: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Collects every ground decal of the current state: enemy telegraphs, spawn and
 * death rings and Weight rings, meteor markers, the burning edge and shockwaves.
 * Pure: `inspect()` calls it too, so tests see exactly what is drawn.
 */
export function collectDecals(
  state: GameState,
  enemies: Iterable<Entity>,
  skill: Parameters<typeof elementColor>[0],
  out: DecalList,
): DecalList {
  out.clear();
  for (const { enemy, object3d, status } of enemies) {
    if (!enemy || !object3d) continue;
    const { x, z } = object3d.position;
    enemyDecals(enemy, x, z, status?.weight ?? 0, enemyGlowColor(enemy.kind), out);
  }
  for (const h of state.hazards) meteorDecal(h, out);
  if (state.burnRing !== null) burnDecal(state.burnRing, out);
  const comet = elementColor(skill, config.vfx.colors.comet);
  for (const im of state.impacts) impactDecal(im, comet, out);
  return out;
}

/**
 * Draws the ground decals (frame system): one instanced quad per decal, shaped
 * and filled by the decal shader. Replaces the graybox rings, strips and cones.
 */
export function createTelegraphRenderSystem(ctx: Ctx): GameSystem {
  const shapes = instanceAttribute(CAPACITY, 4);
  const colors = instanceAttribute(CAPACITY, 4);
  const { material, uniforms } = decalMaterial(shapes, colors);
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
    material,
    CAPACITY,
  );
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 1;
  ctx.scene.add(mesh);
  const shape = shapes.array as Float32Array;
  const rgba = colors.array as Float32Array;
  const list = new DecalList();
  const enemies = ctx.world.with('enemy', 'object3d');

  return ({ state, world, alpha }) => {
    const t = config.vfx.telegraphs;
    uniforms.rimAlpha.value = t.rimAlpha;
    uniforms.fillAlpha.value = t.fillAlpha;
    uniforms.glow.value = config.vfx.glow.rim;
    uniforms.time.value = state.vfx.clock - state.vfx.stepDt * (1 - alpha);
    const skill = world.with('player', 'skill').first?.skill.element ?? null;
    collectDecals(state, enemies, skill, list);
    const n = Math.min(list.count, CAPACITY);
    for (let i = 0; i < n; i++) {
      const d = list.items[i]!;
      // Each decal a hair above the last, so overlapping ones never fight for depth.
      p.set(d.x, 0.03 + i * 0.0005, d.z);
      q.setFromAxisAngle(UP, d.yaw);
      s.set(d.sx, 1, d.sz);
      mesh.setMatrixAt(i, m.compose(p, q, s));
      shape[i * 4] = d.shape;
      shape[i * 4 + 1] = d.progress;
      shape[i * 4 + 2] = d.shape === DecalShape.Strip ? d.sz / d.sx : d.param;
      shape[i * 4 + 3] = t.rim / d.sx;
      linear(d.color, rgb);
      rgba[i * 4] = rgb.r;
      rgba[i * 4 + 1] = rgb.g;
      rgba[i * 4 + 2] = rgb.b;
      rgba[i * 4 + 3] = d.alpha;
    }
    mesh.count = n;
    upload(mesh.instanceMatrix, n * 16);
    upload(shapes, n * 4);
    upload(colors, n * 4);
  };
}
