import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx } from '../types';

export function spawnLevel(ctx: Ctx): void {
  const { scene, world } = ctx;
  const { halfSize, wallHeight, wallThickness } = config.arena;

  scene.background = new THREE.Color(config.colors.sky);
  scene.fog = new THREE.Fog(config.colors.sky, 30, 70);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a2a35, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(8, 18, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = halfSize + 2;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, far: 50 });
  scene.add(sun);

  world.add(
    staticBox(
      ctx,
      { x: halfSize, y: 0.5, z: halfSize },
      { x: 0, y: -0.5, z: 0 },
      config.colors.ground,
    ),
  );

  const wallY = wallHeight / 2;
  const span = halfSize + wallThickness;
  for (const [x, z, hx, hz] of [
    [0, -span, span, wallThickness],
    [0, span, span, wallThickness],
    [-span, 0, wallThickness, halfSize],
    [span, 0, wallThickness, halfSize],
  ] as const) {
    world.add(staticBox(ctx, { x: hx, y: wallY, z: hz }, { x, y: wallY, z }, config.colors.wall));
  }

  for (let i = 0; i < config.obstacles.count; i++) {
    const size = {
      x: ctx.rng.range(0.6, 1.6),
      y: ctx.rng.range(0.3, 0.9),
      z: ctx.rng.range(0.6, 1.6),
    };
    const pos = randomArenaPoint(ctx, 4);
    world.add(staticBox(ctx, size, { x: pos.x, y: size.y, z: pos.z }, config.colors.obstacle));
  }
}

/** Random point on the arena floor, at least `minDistanceFromCenter` from spawn. */
export function randomArenaPoint(
  ctx: Ctx,
  minDistanceFromCenter: number,
): { x: number; z: number } {
  const limit = config.arena.halfSize - 1.5;
  for (;;) {
    const x = ctx.rng.range(-limit, limit);
    const z = ctx.rng.range(-limit, limit);
    if (Math.hypot(x, z) >= minDistanceFromCenter) return { x, z };
  }
}

function staticBox(
  ctx: Ctx,
  half: THREE.Vector3Like,
  position: THREE.Vector3Like,
  color: number,
): { object3d: THREE.Mesh } {
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z),
  );
  ctx.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z), body);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(half.x * 2, half.y * 2, half.z * 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  mesh.position.set(position.x, position.y, position.z);
  mesh.receiveShadow = true;
  mesh.castShadow = half.y < 1;
  return { object3d: mesh };
}
