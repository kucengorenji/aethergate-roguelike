import { World } from 'miniplex';
import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import type { CoreComponents } from './ecs';
import { Interpolator } from './interpolation';
import type { RAPIER } from './physics';

function fakeBody(x: number) {
  const pos = { x, y: 0, z: 0 };
  const body = { translation: () => ({ ...pos }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) };
  return { pos, body: body as unknown as RAPIER.RigidBody };
}

describe('Interpolator', () => {
  it('blends between the last two steps', () => {
    const world = new World<CoreComponents>();
    const { pos, body } = fakeBody(0);
    const object3d = new THREE.Object3D();
    world.add({ body, object3d });
    const interp = new Interpolator(world);
    interp.capture();
    pos.x = 2;
    interp.capture();
    interp.apply(0.25);
    expect(object3d.position.x).toBeCloseTo(0.5);
    interp.apply(1);
    expect(object3d.position.x).toBe(2);
  });

  it('does not blend a new or snapped body from a stale position', () => {
    const world = new World<CoreComponents>();
    const { pos, body } = fakeBody(5);
    const object3d = new THREE.Object3D();
    const entity = world.add({ body, object3d });
    const interp = new Interpolator(world);
    interp.capture();
    interp.apply(0);
    expect(object3d.position.x).toBe(5);
    pos.x = 40;
    interp.snap(entity);
    interp.capture();
    interp.apply(0);
    expect(object3d.position.x).toBe(40);
  });
});
