import * as THREE from 'three/webgpu';
import { config } from '../config';
import { effectsProfile } from '../quality';
import type { Ctx, GameSystem } from '../types';
import { ashFlake, type Flake } from '../vfx/ash';
import { billboard, cameraBasis, newCameraBasis } from '../vfx/billboard';
import type { Rgb } from '../vfx/emit';
import { instanceAttribute, spriteMaterial, upload } from '../vfx/materials';
import { linear } from '../vfx/palette';

/** Most flakes any quality may ask for. */
const CAPACITY = 512;
const basis = newCameraBasis();
const flake: Flake = { x: 0, y: 0, z: 0, size: 0, ember: false, fade: 0 };
const ash: Rgb = { r: 0, g: 0, b: 0 };
const ember: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Ambient ash and a few embers drifting around the player in every room and in
 * the hall (frame system). Each flake's position is a pure function of the
 * effects clock and the player's position, so nothing is simulated and paused
 * screenshots are stable.
 */
export function createAshRenderSystem(ctx: Ctx): GameSystem {
  const colors = instanceAttribute(CAPACITY, 4);
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    spriteMaterial(colors),
    CAPACITY,
  );
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.renderOrder = 4;
  ctx.scene.add(mesh);
  const matrices = mesh.instanceMatrix.array as Float32Array;
  const rgba = colors.array as Float32Array;

  return ({ state, world, camera, alpha }) => {
    const center = world.with('player', 'object3d').first?.object3d.position;
    if (!center) return;
    cameraBasis(camera, basis);
    const a = config.vfx.ash;
    linear(config.vfx.colors.ash, ash);
    linear(config.vfx.colors.ember, ember);
    const glow = config.vfx.glow.ember;
    const t = state.vfx.clock - state.vfx.stepDt * (1 - alpha);
    const count = Math.min(CAPACITY, effectsProfile(state.save.settings.quality).ash);
    let n = 0;
    for (let i = 0; i < count; i++) {
      ashFlake(i, t, center.x, center.z, flake);
      // Flakes right at the lens would be big blurry blots: fade them out up close.
      const near = Math.hypot(flake.x - basis.px, flake.y - basis.py, flake.z - basis.pz);
      flake.fade *= Math.min(1, Math.max(0, (near - 1) / 2));
      if (flake.fade <= 0.01) continue;
      // Flakes flutter as they turn in the air.
      const size = flake.size * (0.6 + 0.4 * Math.abs(Math.sin(t * 2.1 + i)));
      billboard(matrices, n, basis, flake.x, flake.y, flake.z, size);
      const o = n * 4;
      if (flake.ember) {
        const k = glow * flake.fade;
        rgba[o] = ember.r * k;
        rgba[o + 1] = ember.g * k;
        rgba[o + 2] = ember.b * k;
        rgba[o + 3] = 0;
      } else {
        const k = a.alpha * flake.fade;
        rgba[o] = ash.r * k;
        rgba[o + 1] = ash.g * k;
        rgba[o + 2] = ash.b * k;
        rgba[o + 3] = k;
      }
      n++;
    }
    mesh.count = n;
    upload(mesh.instanceMatrix, n * 16);
    upload(colors, n * 4);
  };
}
