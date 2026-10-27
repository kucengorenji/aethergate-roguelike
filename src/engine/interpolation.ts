import type { World } from 'miniplex';
import * as THREE from 'three/webgpu';
import type { CoreComponents } from './ecs';

interface Pair {
  prevPos: THREE.Vector3;
  currPos: THREE.Vector3;
  prevRot: THREE.Quaternion;
  currRot: THREE.Quaternion;
}

/**
 * Blends physics bodies between the last two fixed steps when rendering, so
 * motion stays smooth on displays faster than the 60 Hz simulation. Game logic
 * must therefore read positions from `body`, never from `object3d`, which only
 * holds the rendered (blended) transform.
 */
export class Interpolator<E extends CoreComponents> {
  private readonly pairs = new Map<E, Pair>();

  constructor(private readonly world: World<E>) {}

  /** Records the state after a fixed step. The previous "current" becomes "previous". */
  capture(): void {
    for (const entity of this.world.with('body')) {
      const { body } = entity as Required<CoreComponents>;
      const t = body.translation();
      const r = body.rotation();
      let pair = this.pairs.get(entity);
      if (!pair) {
        pair = {
          prevPos: new THREE.Vector3(t.x, t.y, t.z),
          currPos: new THREE.Vector3(),
          prevRot: new THREE.Quaternion(r.x, r.y, r.z, r.w),
          currRot: new THREE.Quaternion(),
        };
        this.pairs.set(entity, pair);
      } else {
        pair.prevPos.copy(pair.currPos);
        pair.prevRot.copy(pair.currRot);
      }
      pair.currPos.set(t.x, t.y, t.z);
      pair.currRot.set(r.x, r.y, r.z, r.w);
    }
  }

  /** Writes blended transforms to `object3d`. `alpha` 1 shows the latest step exactly. */
  apply(alpha: number): void {
    for (const entity of this.world.with('body', 'object3d')) {
      const pair = this.pairs.get(entity);
      if (!pair) continue;
      const { object3d } = entity as Required<CoreComponents>;
      object3d.position.lerpVectors(pair.prevPos, pair.currPos, alpha);
      object3d.quaternion.slerpQuaternions(pair.prevRot, pair.currRot, alpha);
    }
  }

  /** Makes the next render show the body where it is now, without blending (teleports). */
  snap(entity: E): void {
    this.pairs.delete(entity);
  }

  forget(entity: E): void {
    this.pairs.delete(entity);
  }
}
