import type { CoreComponents } from '@engine/ecs';
import type { RAPIER } from '@engine/physics';
import type * as THREE from 'three/webgpu';

export type ActionKind = 'none' | 'dodge' | 'bash' | 'drink';

/** All components in the game. Add new optional fields here as the game grows. */
export interface Entity extends CoreComponents {
  player?: true;
  /** Where the entity aims. Yaw 0 faces -z; positive pitch looks up. Radians. */
  look?: { yaw: number; pitch: number };
  /** Kinematic movement state, driven by the character controller. */
  locomotion?: {
    velocity: { x: number; y: number; z: number };
    grounded: boolean;
    /** Horizontal speed actually achieved last step (m/s). */
    speed: number;
    /** +1 moving forward relative to look, -1 backward, 0 standing. */
    direction: -1 | 0 | 1;
  };
  characterController?: {
    controller: RAPIER.KinematicCharacterController;
    collider: RAPIER.Collider;
  };
  /** The visible model inside `object3d`, turned to face the look direction. */
  model?: THREE.Object3D;
  footsteps?: { distance: number };

  health?: {
    current: number;
    max: number;
    /** Seconds of invulnerability left (dodge i-frames). */
    invulnerable: number;
  };
  /** Vertical capsule around the body center that projectiles and melee can hit. */
  hurtbox?: { radius: number; halfHeight: number };
  /** Spell casting: focus is the mana bar. */
  caster?: { focus: number; maxFocus: number; cooldown: number; sinceCast: number };
  /** The one exclusive action in progress. Casting is only allowed during 'none'. */
  action?: {
    kind: ActionKind;
    /** Seconds since the action started. */
    time: number;
    /** Dodge direction (unit, horizontal). */
    dirX: number;
    dirZ: number;
    /** Whether the bash already dealt its hit, or the flask already healed. */
    applied: boolean;
    dodgeCooldown: number;
  };
  flask?: { charges: number; max: number };
  /** Seconds left of the white hit flash; materials listed are tinted. */
  flash?: { time: number; materials: THREE.MeshStandardMaterial[] };
  dummy?: {
    home: { x: number; y: number; z: number };
    /** Spring offset from home and its velocity, for knockback wobble. */
    offset: { x: number; z: number };
    velocity: { x: number; z: number };
    /** Seconds until it stands up again, while collapsed. */
    downTime: number;
  };
  totem?: {
    /** Seconds until the next shot. */
    timer: number;
    /** 0..1 charge-up glow before a shot. */
    charge: number;
    gem: THREE.MeshStandardMaterial;
    /** Where orbs leave from. */
    muzzle: { x: number; y: number; z: number };
  };
}
