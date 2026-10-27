import type { CoreComponents } from '@engine/ecs';
import type { RAPIER } from '@engine/physics';
import type * as THREE from 'three/webgpu';
import type { Held } from './boons/data';
import type { Status } from './boons/status';
import type { Offer, Reward } from './run/rewards';

export type ActionKind = 'none' | 'dodge' | 'bash' | 'drink';
export type EnemyKind = 'soldier' | 'caster' | 'knight' | 'hound';
/** Demigod elements that boons (spec 0007) add to attacks. */
export type Element = 'frost' | 'gravity' | 'rot' | 'storm';
export type EnemyState = 'rising' | 'chase' | 'windup' | 'attack' | 'recover' | 'stagger' | 'dying';

/** All components in the game. Add new optional fields here as the game grows. */
export interface Entity extends CoreComponents {
  player?: true;
  /** Belongs to the current room: removed with it. Static level bodies live here, not in `body`. */
  room?: { body?: RAPIER.RigidBody; dispose?: THREE.Material[] };
  /** A door on the far wall that leads to the next room. */
  door?: { index: number; offer: Offer; open: boolean; portal: THREE.Mesh; emblem: THREE.Object3D };
  /** A reward token waiting to be picked up. */
  pickup?: { reward: Reward; x: number; z: number };
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
  /** Blessings held, and landed bolts counted for Thunderhead. */
  boons?: { held: Held; bolts: number };
  /** Status effects from blessings (enemies and the training dummy). */
  status?: Status;
  /** The Ash skill on right click. */
  skill?: { kind: 'comet'; element: Element | null; cooldown: number; maxCooldown: number };
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
  enemy?: {
    kind: EnemyKind;
    state: EnemyState;
    /** Seconds in the current state. */
    time: number;
    /** Yaw the enemy faces (0 faces -z). */
    facing: number;
    /** Attack direction locked at the start of a wind-up (unit, horizontal). */
    aimX: number;
    aimZ: number;
    /** Seconds until a ranged enemy may start another wind-up. */
    cooldown: number;
    /** Which way it strafes or flanks: 1 or -1. */
    side: 1 | -1;
    /** Whether the current attack already dealt its hit. */
    hit: boolean;
    /** Desired velocity from the AI this step (m/s). */
    wantX: number;
    wantZ: number;
    /** Knockback velocity that decays (m/s). */
    pushX: number;
    pushZ: number;
    /** Seconds spent blocked by cover, and seconds left of walking around it. */
    stuck: number;
    detour: number;
    /** Seconds the guard stays broken (knights). */
    guardBroken: number;
    collider: RAPIER.Collider;
    /** Telegraph glow (eyes, gem) and the ground marker for area attacks. */
    glow: THREE.MeshStandardMaterial;
    marker: THREE.Mesh;
  };
}
