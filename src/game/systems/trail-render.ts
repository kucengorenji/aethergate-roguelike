import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Rgb } from '../vfx/emit';
import type { Ctx, GameSystem } from '../types';
import { cameraBasis, newCameraBasis, streak } from '../vfx/billboard';
import { LIGHTNING, lightningPoints } from '../vfx/lightning';
import { instanceAttribute, ribbonMaterial, upload } from '../vfx/materials';
import { meteorAt } from '../vfx/meteor';
import { linear, primaryElement } from '../vfx/palette';
import { trailColor, trailLength, trailSpec } from '../vfx/trails';

const basis = newCameraBasis();
const rgb: Rgb = { r: 0, g: 0, b: 0 };
const meteor = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 };
const points = new Float32Array((LIGHTNING.segments + 1) * 3);
/** Seconds an arc is drawn (`feedbackSystem` drops it after this). */
const ARC_SECONDS = 0.18;
const TRAIL = 0;
const BEAM = 1;

/**
 * Glowing ribbons (frame system, after the camera): a trail behind every
 * projectile that never reaches back past where it was cast, the tails of
 * falling meteors, and jagged lightning for arcs. One instanced draw.
 */
export function createTrailRenderSystem(ctx: Ctx): GameSystem {
  const capacity = ctx.state.projectiles.capacity + 32 + 64 * LIGHTNING.segments;
  const colors = instanceAttribute(capacity, 4);
  const styles = instanceAttribute(capacity, 1);
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    ribbonMaterial(colors, styles),
    capacity,
  );
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 2;
  ctx.scene.add(mesh);
  const matrices = mesh.instanceMatrix.array as Float32Array;
  const rgba = colors.array as Float32Array;
  const style = styles.array as Float32Array;
  let n = 0;

  const put = (
    ax: number,
    ay: number,
    az: number,
    dx: number,
    dy: number,
    dz: number,
    width: number,
    glow: number,
    kind: number,
  ): void => {
    if (n >= capacity || !streak(matrices, n, basis, ax, ay, az, dx, dy, dz, width)) return;
    rgba[n * 4] = rgb.r * glow;
    rgba[n * 4 + 1] = rgb.g * glow;
    rgba[n * 4 + 2] = rgb.b * glow;
    rgba[n * 4 + 3] = 0;
    style[n] = kind;
    n++;
  };

  return ({ state, camera, alpha, world }) => {
    const v = config.vfx;
    cameraBasis(camera, basis);
    n = 0;
    const player = world.with('player', 'boons', 'skill').first;
    const primary = primaryElement(player?.boons.held);
    const skill = player?.skill.element ?? null;

    const pool = state.projectiles;
    for (let i = 0; i < pool.capacity; i++) {
      // Shots the effect system has not measured yet (spawned between steps) get no trail.
      if (!pool.alive[i] || !state.vfx.seen[i]) continue;
      const o = i * 3;
      const kind = pool.kind[i]!;
      const spec = trailSpec(kind, pool.look[i]!);
      const px = pool.prev[o]!;
      const py = pool.prev[o + 1]!;
      const pz = pool.prev[o + 2]!;
      const hx = px + (pool.pos[o]! - px) * alpha;
      const hy = py + (pool.pos[o + 1]! - py) * alpha;
      const hz = pz + (pool.pos[o + 2]! - pz) * alpha;
      const pending = Math.hypot(pool.pos[o]! - px, pool.pos[o + 1]! - py, pool.pos[o + 2]! - pz);
      const length = trailLength(spec, state.vfx.flown[i]!, pending * (1 - alpha));
      const vx = pool.vel[o]!;
      const vy = pool.vel[o + 1]!;
      const vz = pool.vel[o + 2]!;
      const speed = Math.hypot(vx, vy, vz);
      if (length <= 0 || speed < 1e-6) continue;
      const k = length / speed;
      linear(trailColor(kind, pool.look[i]!, primary, skill), rgb);
      put(
        hx - vx * k,
        hy - vy * k,
        hz - vz * k,
        vx * k,
        vy * k,
        vz * k,
        spec.width,
        v.glow.trail,
        TRAIL,
      );
    }

    const fall = v.trails.meteor;
    linear(v.colors.fire, rgb);
    for (const h of state.hazards) {
      // Hazards count down each step; draw them where they are between steps.
      if (!meteorAt(h.x, h.z, h.time + state.vfx.stepDt * (1 - alpha), meteor)) continue;
      const scale = h.radius / 1.8;
      const len = Math.min(fall.length * scale, meteor.y / Math.max(-meteor.dy, 1e-3));
      put(
        meteor.x - meteor.dx * len,
        meteor.y - meteor.dy * len,
        meteor.z - meteor.dz * len,
        meteor.dx * len,
        meteor.dy * len,
        meteor.dz * len,
        fall.width * scale,
        v.glow.trail,
        TRAIL,
      );
    }

    linear(v.colors.storm, rgb);
    for (const a of state.arcs) {
      const fade = Math.max(0, 1 - a.age / ARC_SECONDS);
      const count = lightningPoints(a.x1, a.y1, a.z1, a.x2, a.y2, a.z2, a.age, points);
      for (let s = 0; s + 1 < count; s++) {
        const o = s * 3;
        put(
          points[o]!,
          points[o + 1]!,
          points[o + 2]!,
          points[o + 3]! - points[o]!,
          points[o + 4]! - points[o + 1]!,
          points[o + 5]! - points[o + 2]!,
          0.09,
          v.glow.spark * fade,
          BEAM,
        );
      }
    }

    mesh.count = n;
    upload(mesh.instanceMatrix, n * 16);
    upload(colors, n * 4);
    upload(styles, n);
  };
}
