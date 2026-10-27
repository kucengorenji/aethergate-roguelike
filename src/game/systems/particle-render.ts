import * as THREE from 'three/webgpu';
import type { Ctx, GameSystem } from '../types';
import { billboard, cameraBasis, newCameraBasis, streak } from '../vfx/billboard';
import { instanceAttribute, spriteMaterial, upload } from '../vfx/materials';
import { particleAt, type ParticleState } from '../vfx/particles';

const basis = newCameraBasis();
const at: ParticleState = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };

/**
 * Draws every live particle as one instanced draw (frame system, after the
 * camera): round sprites face the camera, streaks stretch along their velocity.
 * Positions come from the particles' closed-form motion at the time between the
 * last two steps, so nothing here changes simulation state.
 */
export function createParticleRenderSystem(ctx: Ctx): GameSystem {
  const capacity = ctx.state.vfx.particles.capacity;
  const colors = instanceAttribute(capacity, 4);
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    spriteMaterial(colors),
    capacity,
  );
  mesh.count = 0;
  // Particles spread over the whole arena; culling the set as one box is wrong.
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 3;
  ctx.scene.add(mesh);
  const matrices = mesh.instanceMatrix.array as Float32Array;
  const rgba = colors.array as Float32Array;

  return ({ state, camera, alpha }) => {
    const vfx = state.vfx;
    const pool = vfx.particles;
    const now = vfx.clock - vfx.stepDt * (1 - alpha);
    cameraBasis(camera, basis);
    let n = 0;
    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.alive[i]) continue;
      const life = pool.life[i]!;
      const age = now - pool.born[i]!;
      if (age < 0 || age >= life) continue;
      particleAt(pool, i, age, at);
      const t = age / life;
      const size = pool.size[i * 2]! + (pool.size[i * 2 + 1]! - pool.size[i * 2]!) * t;
      // Glows start at full strength (the hitstop frame shows the flash); smoke and
      // ash fade in a little so they do not pop. Everything fades out with age.
      const covers = pool.color[i * 4 + 3]! > 0;
      const env = Math.pow(1 - t, 1.2) * (covers ? Math.min(1, 0.3 + t * 8) : 1);
      const k = pool.stretch[i]!;
      if (k > 0) {
        const speed = Math.hypot(at.vx, at.vy, at.vz);
        const len = (size + speed * k) / Math.max(speed, 1e-6);
        if (
          !streak(matrices, n, basis, at.x, at.y, at.z, at.vx * len, at.vy * len, at.vz * len, size)
        ) {
          billboard(matrices, n, basis, at.x, at.y, at.z, size);
        }
      } else {
        billboard(matrices, n, basis, at.x, at.y, at.z, size);
      }
      const c = i * 4;
      const a = pool.color[c + 3]! * env;
      // Premultiplied: covering particles scale by their alpha, glowing ones by the envelope.
      const scale = a > 0 ? a : env;
      rgba[n * 4] = pool.color[c]! * scale;
      rgba[n * 4 + 1] = pool.color[c + 1]! * scale;
      rgba[n * 4 + 2] = pool.color[c + 2]! * scale;
      rgba[n * 4 + 3] = a;
      n++;
    }
    mesh.count = n;
    upload(mesh.instanceMatrix, n * 16);
    upload(colors, n * 4);
  };
}
