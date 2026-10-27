import * as THREE from 'three/webgpu';
import type { Reward } from '../run/rewards';
import { OFFER_INFO } from '../run/rewards';
import type { Ctx } from '../types';
import { emblemFor } from './emblem';

const ringGeometry = new THREE.RingGeometry(0.55, 0.7, 32).rotateX(-Math.PI / 2);

/** The room's reward as a floating token with a glowing ring under it. */
export function spawnPickup(ctx: Ctx, reward: Reward, x: number, z: number): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const emblem = emblemFor(reward);
  emblem.scale.setScalar(1.6);
  emblem.position.y = 1.1;
  group.add(emblem);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: OFFER_INFO[reward].color,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = 0.03;
  group.add(ring);
  ctx.world.add({ object3d: group, room: { dispose: [ringMaterial] }, pickup: { reward, x, z } });
  ctx.audio.play('reward', { volume: 0.5 });
}
