import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';

/** Height of the glowing gem above the totem's base. */
export const TOTEM_GEM_Y = 2.25;

/**
 * A stone obelisk that fires slow orbs at the player for dodge practice. It is
 * level geometry (bolts stop on it) and cannot be destroyed.
 */
export function spawnTotem(ctx: Ctx, x: number, y: number, z: number): Entity {
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(x, y + 1, z),
  );
  ctx.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 1, 0.3), body);

  const group = new THREE.Group();
  group.position.set(x, y, z);
  const stone = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 2, 0.6),
    new THREE.MeshStandardMaterial({ color: config.colors.totem, roughness: 0.9 }),
  );
  stone.position.y = 1;
  stone.castShadow = true;
  stone.receiveShadow = true;
  group.add(stone);
  const gem = new THREE.MeshStandardMaterial({
    color: config.colors.orb,
    emissive: config.colors.orb,
    emissiveIntensity: 0.2,
    roughness: 0.3,
  });
  const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), gem);
  gemMesh.position.y = TOTEM_GEM_Y;
  group.add(gemMesh);

  return ctx.world.add({
    object3d: group,
    totem: {
      timer: config.totem.interval,
      charge: 0,
      gem,
      muzzle: { x, y: y + TOTEM_GEM_Y, z },
    },
  });
}
