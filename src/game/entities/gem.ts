import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx } from '../types';
import { randomArenaPoint } from './level';

const geometry = new THREE.OctahedronGeometry(0.35);
const material = new THREE.MeshStandardMaterial({
  color: config.colors.gem,
  emissive: config.colors.gem,
  emissiveIntensity: 0.35,
  roughness: 0.2,
  metalness: 0.1,
});

/** Gems have no physics body: pickup is a distance check in collectSystem. */
export function spawnGems(ctx: Ctx): void {
  for (let i = 0; i < config.gems.count; i++) {
    const { x, z } = randomArenaPoint(ctx, 3);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, config.gems.height, z);
    mesh.castShadow = true;
    ctx.world.add({
      gem: { baseY: config.gems.height, phase: ctx.rng.range(0, Math.PI * 2) },
      object3d: mesh,
    });
  }
  ctx.state.total = config.gems.count;
}
