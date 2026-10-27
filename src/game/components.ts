import type { RAPIER } from '@engine/physics';
import type * as THREE from 'three/webgpu';
import type { CoreComponents } from '@engine/ecs';

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
}
