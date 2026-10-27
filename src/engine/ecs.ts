import type { World } from 'miniplex';
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
  /** Physics body. Its transform is copied to `object3d` after every physics step. */
  body?: RAPIER.RigidBody;
}

export type { World };
