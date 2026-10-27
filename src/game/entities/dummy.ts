import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import { ACTOR_GROUPS } from '../combat/groups';
import type { Entity } from '../components';
import { noStatus } from '../boons/status';
import { config } from '../config';
import type { Ctx } from '../types';

const geometries = {
  post: new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6),
  torso: new THREE.CylinderGeometry(0.28, 0.32, 0.8, 8),
  head: new THREE.IcosahedronGeometry(0.19, 1),
  arms: new THREE.BoxGeometry(1.1, 0.12, 0.12),
  base: new THREE.CylinderGeometry(0.45, 0.5, 0.12, 10),
};
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 0.9 });

/** Height of the dummy's capsule center above the floor. */
const CENTER_Y = config.dummy.halfHeight + config.dummy.radius;

/** A straw training dummy on a springy post: it wobbles when hit and collapses at zero health. */
export function spawnDummy(ctx: Ctx, x: number, z: number): Entity {
  const { radius, halfHeight, health } = config.dummy;
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, CENTER_Y, z),
  );
  ctx.physics.world.createCollider(
    RAPIER.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(ACTOR_GROUPS),
    body,
  );

  // Each dummy owns its straw material so the hit flash only tints this one.
  const straw = new THREE.MeshStandardMaterial({ color: config.colors.dummy, roughness: 0.95 });
  const model = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    model.add(mesh);
  };
  add(geometries.base, woodMaterial, 0.06);
  add(geometries.post, woodMaterial, 0.95);
  add(geometries.torso, straw, 1.2);
  add(geometries.arms, woodMaterial, 1.42);
  add(geometries.head, straw, 1.8);
  model.position.y = -CENTER_Y;
  const object3d = new THREE.Group();
  object3d.add(model);

  return ctx.world.add({
    body,
    object3d,
    model,
    health: { current: health, max: health, invulnerable: 0 },
    hurtbox: { radius, halfHeight },
    flash: { time: 0, materials: [straw] },
    status: noStatus(),
    dummy: {
      home: { x, y: CENTER_Y, z },
      offset: { x: 0, z: 0 },
      velocity: { x: 0, z: 0 },
      downTime: 0,
    },
  });
}
