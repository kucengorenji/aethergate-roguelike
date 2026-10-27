import type { World } from 'miniplex';
import type { Animator } from './animation';
import type * as THREE from 'three/webgpu';
import type { RAPIER } from './physics';

/**
 * Components the engine understands. Games extend this with their own
 * components (see src/game/components.ts). Components are plain data; behavior
 * lives in systems.
 */
export interface CoreComponents {
  /** Visual representation. Added to the scene by the engine. */
  object3d?: THREE.Object3D;
  /**
   * Physics body. Its transform is copied to `object3d` when rendering, blended
   * between the last two fixed steps. Game logic reads positions from here.
   */
  body?: RAPIER.RigidBody;
  /** Animation clips on `object3d`, advanced by the engine every fixed step. */
  animator?: Animator;
}

export type { World };
