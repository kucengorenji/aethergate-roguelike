import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import { ENEMY_GROUPS } from '../combat/groups';
import type { EnemyKind, Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';

export const ENEMY_KINDS: readonly EnemyKind[] = ['soldier', 'caster', 'knight', 'hound'];

const box = new THREE.BoxGeometry(1, 1, 1);
const ball = new THREE.IcosahedronGeometry(1, 1);
const cone = new THREE.ConeGeometry(1, 1, 8);
const ringGeometry = new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2);
const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x2c2a28,
  roughness: 0.6,
  metalness: 0.5,
});

/** Center height of an enemy's capsule above the floor. */
export function enemyCenterY(kind: EnemyKind): number {
  const k = config.enemies[kind];
  return k.halfHeight + k.radius;
}

/**
 * Spawns an enemy at (x, z), rising out of the ground unless `risen` (tests).
 * Each enemy owns its body and glow materials so flashes and telegraphs stay local.
 */
export function spawnEnemy(ctx: Ctx, kind: EnemyKind, x: number, z: number, risen = false): Entity {
  const k = config.enemies[kind];
  const cy = enemyCenterY(kind);
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, cy, z),
  );
  const collider = ctx.physics.world.createCollider(
    RAPIER.ColliderDesc.capsule(k.halfHeight, k.radius).setCollisionGroups(ENEMY_GROUPS),
    body,
  );

  const skin = new THREE.MeshStandardMaterial({ color: config.colors[kind], roughness: 0.85 });
  const glowColor = kind === 'caster' ? config.colors.casterGlow : config.colors.enemyGlow;
  const glow = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 0.4,
  });
  const model = new THREE.Group();
  model.rotation.order = 'YXZ';
  buildFigure(kind, model, skin, glow);
  model.position.y = -cy;
  const object3d = new THREE.Group();
  object3d.add(model);

  const marker = new THREE.Mesh(
    ringGeometry,
    new THREE.MeshBasicMaterial({
      color: config.colors.marker,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  marker.visible = false;
  marker.renderOrder = 1;
  ctx.scene.add(marker);

  const p = ctx.world.with('player', 'body').first?.body.translation();
  const facing = p ? Math.atan2(-(p.x - x), -(p.z - z)) : 0;
  model.rotation.y = facing;

  return ctx.world.add({
    body,
    object3d,
    model,
    health: {
      current: k.health,
      max: k.health,
      invulnerable: risen ? 0 : config.enemy.riseSeconds,
    },
    hurtbox: { radius: k.radius, halfHeight: k.halfHeight },
    flash: { time: 0, materials: [skin] },
    enemy: {
      kind,
      state: risen ? 'chase' : 'rising',
      time: 0,
      facing,
      aimX: 0,
      aimZ: -1,
      cooldown: kind === 'caster' ? ctx.rng.range(0.5, 1.5) : 0,
      side: ctx.rng.next() < 0.5 ? -1 : 1,
      hit: false,
      wantX: 0,
      wantZ: 0,
      pushX: 0,
      pushZ: 0,
      stuck: 0,
      detour: 0,
      guardBroken: 0,
      collider,
      glow,
      marker,
    },
  });
}

/** Removes an enemy's ground marker along with the entity. */
export function despawnEnemy(ctx: Ctx, entity: Entity): void {
  if (entity.enemy) {
    ctx.scene.remove(entity.enemy.marker);
    (entity.enemy.marker.material as THREE.Material).dispose();
    entity.enemy.glow.dispose();
  }
  entity.flash?.materials.forEach((m) => {
    m.dispose();
  });
  ctx.world.remove(entity);
}

function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number],
  scale: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Graybox silhouettes, each readable at a glance. Models face -z, origin at the feet. */
function buildFigure(
  kind: EnemyKind,
  m: THREE.Group,
  skin: THREE.Material,
  glow: THREE.Material,
): void {
  switch (kind) {
    case 'soldier':
      part(m, box, skin, [0, 1.05, 0], [0.5, 0.75, 0.3]);
      part(m, box, skin, [-0.12, 0.35, 0], [0.14, 0.7, 0.14]);
      part(m, box, skin, [0.12, 0.35, 0], [0.14, 0.7, 0.14]);
      part(m, ball, skin, [0, 1.6, -0.05], [0.16, 0.18, 0.16]);
      part(m, box, glow, [-0.06, 1.62, -0.19], [0.05, 0.03, 0.03]);
      part(m, box, glow, [0.06, 1.62, -0.19], [0.05, 0.03, 0.03]);
      // Notched sword held forward on the right.
      part(m, box, darkMetal, [0.32, 1.0, -0.45], [0.05, 0.08, 0.9]);
      break;
    case 'caster':
      part(m, cone, skin, [0, 0.8, 0], [0.42, 1.6, 0.42]);
      part(m, ball, skin, [0, 1.7, 0], [0.15, 0.17, 0.15]);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        part(m, cone, skin, [Math.cos(a) * 0.17, 1.9, Math.sin(a) * 0.17], [0.04, 0.22, 0.04]);
      }
      part(m, ball, glow, [0, 1.3, -0.45], [0.12, 0.12, 0.12]);
      break;
    case 'knight':
      part(m, box, skin, [0, 1.15, 0], [0.8, 0.9, 0.5]);
      part(m, box, skin, [-0.2, 0.4, 0], [0.24, 0.8, 0.26]);
      part(m, box, skin, [0.2, 0.4, 0], [0.24, 0.8, 0.26]);
      part(m, box, skin, [0, 1.8, 0], [0.34, 0.36, 0.34]);
      part(m, box, glow, [0, 1.82, -0.18], [0.22, 0.04, 0.02]);
      // Tower shield in front.
      part(m, box, darkMetal, [-0.1, 1.0, -0.45], [0.95, 1.3, 0.1]);
      break;
    case 'hound':
      part(m, box, skin, [0, 0.55, 0.05], [0.38, 0.34, 0.95]);
      part(m, box, skin, [0, 0.62, -0.55], [0.26, 0.24, 0.32]);
      for (const [x, z] of [
        [-0.13, -0.3],
        [0.13, -0.3],
        [-0.13, 0.4],
        [0.13, 0.4],
      ] as const) {
        part(m, box, skin, [x, 0.2, z], [0.09, 0.4, 0.09]);
      }
      part(m, box, glow, [-0.07, 0.66, -0.72], [0.05, 0.03, 0.03]);
      part(m, box, glow, [0.07, 0.66, -0.72], [0.05, 0.03, 0.03]);
      break;
  }
}
