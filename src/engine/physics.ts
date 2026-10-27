// The wasm build is loaded as a real .wasm file (streaming compile) via vite-plugin-wasm.
import * as RAPIER from '@dimforge/rapier3d';
import * as THREE from 'three/webgpu';

export { RAPIER };
export { interactionGroups } from './collision-groups';

/** Thin wrapper over a Rapier world with an optional wireframe debug view. */
export class Physics {
  readonly world: RAPIER.World;
  private debugLines: THREE.LineSegments | null = null;

  constructor(gravity: THREE.Vector3Like = { x: 0, y: -9.81, z: 0 }) {
    this.world = new RAPIER.World(gravity);
  }

  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step();
  }

  /**
   * Casts a ray and returns the distance to the first hit, or null. `groups`
   * limits which colliders count (see `interactionGroups`).
   */
  castRay(
    origin: THREE.Vector3Like,
    dir: THREE.Vector3Like,
    maxDistance: number,
    exclude?: RAPIER.RigidBody,
    groups?: number,
  ): number | null {
    const hit = this.world.castRay(
      new RAPIER.Ray(origin, dir),
      maxDistance,
      true,
      undefined,
      groups,
      undefined,
      exclude,
    );
    return hit ? hit.timeOfImpact : null;
  }

  setDebugVisible(scene: THREE.Scene, visible: boolean): void {
    if (visible && !this.debugLines) {
      const material = new THREE.LineBasicMaterial({ vertexColors: true });
      this.debugLines = new THREE.LineSegments(new THREE.BufferGeometry(), material);
      this.debugLines.frustumCulled = false;
      scene.add(this.debugLines);
    } else if (!visible && this.debugLines) {
      scene.remove(this.debugLines);
      this.debugLines.geometry.dispose();
      (this.debugLines.material as THREE.Material).dispose();
      this.debugLines = null;
    }
  }

  /** Refreshes the debug wireframe. Cheap no-op when debug view is off. */
  updateDebug(): void {
    if (!this.debugLines) return;
    const { vertices, colors } = this.world.debugRender();
    const geometry = this.debugLines.geometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  }
}
