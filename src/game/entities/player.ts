import { Animator } from '@engine/animation';
import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import type { ArenaLayout } from '../arenas/types';
import { ACTOR_GROUPS } from '../combat/groups';
import type { Entity } from '../components';
import { config } from '../config';
import type { Ctx } from '../types';
import { createMannequin } from './mannequin';

/** Height of the capsule center above the floor. */
export const PLAYER_CENTER_Y = config.player.halfHeight + config.player.radius;

export function spawnPlayer(ctx: Ctx, layout: ArenaLayout): Entity {
  const { radius, halfHeight, stepHeight } = config.player;
  const { x, z, yaw } = layout.spawn;
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, PLAYER_CENTER_Y, z),
  );
  const collider = ctx.physics.world.createCollider(
    RAPIER.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(ACTOR_GROUPS),
    body,
  );
  const controller = ctx.physics.world.createCharacterController(0.02);
  controller.enableAutostep(stepHeight, 0.2, false);
  controller.enableSnapToGround(0.3);
  controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
  controller.setApplyImpulsesToDynamicBodies(true);

  const { root: model, clips, layers } = createMannequin();
  model.position.y = -PLAYER_CENTER_Y;
  model.rotation.y = yaw;
  const object3d = new THREE.Group();
  object3d.add(model);
  const animator = new Animator(model, clips, layers);
  animator.play('idle', 0);

  return ctx.world.add({
    player: true,
    body,
    object3d,
    model,
    animator,
    characterController: { controller, collider },
    look: { yaw, pitch: 0 },
    locomotion: { velocity: { x: 0, y: 0, z: 0 }, grounded: false, speed: 0, direction: 0 },
    footsteps: { distance: 0 },
    health: { current: config.health.player, max: config.health.player, invulnerable: 0 },
    hurtbox: { radius, halfHeight },
    caster: { focus: config.focus.max, maxFocus: config.focus.max, cooldown: 0, sinceCast: 99 },
    action: { kind: 'none', time: 0, dirX: 0, dirZ: -1, applied: false, dodgeCooldown: 0 },
    flask: { charges: config.flask.charges, max: config.flask.charges },
    skill: { kind: 'comet', element: null, cooldown: 0, maxCooldown: config.comet.cooldown },
    boons: { held: { duos: [] }, bolts: 0 },
  });
}

/** Moves the player to a layout's entrance, standing still and facing into the room. */
export function placePlayer(ctx: Ctx, player: Entity, layout: ArenaLayout): void {
  const { body, look, locomotion } = player;
  if (!body || !look || !locomotion) return;
  const spawn = { x: layout.spawn.x, y: PLAYER_CENTER_Y, z: layout.spawn.z };
  body.setTranslation(spawn, true);
  body.setNextKinematicTranslation(spawn);
  look.yaw = layout.spawn.yaw;
  look.pitch = 0;
  Object.assign(locomotion.velocity, { x: 0, y: 0, z: 0 });
  locomotion.speed = 0;
  locomotion.direction = 0;
  ctx.snap(player);
}

/** Puts the player back at spawn with full health, focus and flasks, no blessings, standing still. */
export function resetPlayer(ctx: Ctx, player: Entity, layout: ArenaLayout): void {
  placePlayer(ctx, player, layout);
  if (player.health) Object.assign(player.health, { current: player.health.max, invulnerable: 0 });
  if (player.caster)
    Object.assign(player.caster, { focus: player.caster.maxFocus, cooldown: 0, sinceCast: 99 });
  if (player.action)
    Object.assign(player.action, { kind: 'none', time: 0, applied: false, dodgeCooldown: 0 });
  if (player.flask) player.flask.charges = player.flask.max;
  if (player.skill) Object.assign(player.skill, { cooldown: 0, element: null });
  if (player.boons) player.boons = { held: { duos: [] }, bolts: 0 };
  ctx.snap(player);
}
