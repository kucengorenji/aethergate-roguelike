import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { Animator } from './animation';

/** A two-bone skinned mesh, the same structure a rigged glTF character has. */
function skinnedRig() {
  const root = new THREE.Bone();
  root.name = 'root';
  const arm = new THREE.Bone();
  arm.name = 'arm';
  arm.position.y = 1;
  root.add(arm);
  const geometry = new THREE.BoxGeometry(0.2, 2, 0.2);
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute(
    'skinIndex',
    new THREE.Uint16BufferAttribute(new Array<number>(count * 4).fill(1), 4),
  );
  geometry.setAttribute(
    'skinWeight',
    new THREE.Float32BufferAttribute(
      Array.from({ length: count * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
      4,
    ),
  );
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.add(root);
  mesh.bind(new THREE.Skeleton([root, arm]));
  const raise = new THREE.QuaternionKeyframeTrack(
    'arm.quaternion',
    [0, 1],
    [
      0,
      0,
      0,
      1,
      ...new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2).toArray(),
    ],
  );
  const rest = new THREE.QuaternionKeyframeTrack(
    'arm.quaternion',
    [0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1],
  );
  return {
    mesh,
    arm,
    clips: [
      new THREE.AnimationClip('raise', 1, [raise]),
      new THREE.AnimationClip('rest', 1, [rest]),
    ],
  };
}

describe('Animator', () => {
  it('drives the bones of a skinned mesh', () => {
    const { mesh, arm, clips } = skinnedRig();
    const animator = new Animator(mesh, clips);
    animator.play('raise', 0);
    animator.update(0.5);
    const angle = 2 * Math.acos(Math.min(1, Math.abs(arm.quaternion.w)));
    expect(angle).toBeCloseTo(Math.PI / 4, 2);
    expect(animator.current).toBe('raise');
  });

  it('cross-fades to a new clip over the fade time', () => {
    const { mesh, clips } = skinnedRig();
    const animator = new Animator(mesh, clips);
    animator.play('raise', 0);
    animator.update(0.1);
    animator.play('rest', 0.2);
    const rest = animator.mixer.existingAction(clips[1]!)!;
    const raise = animator.mixer.existingAction(clips[0]!)!;
    animator.update(0.1);
    expect(rest.getEffectiveWeight()).toBeGreaterThan(0.3);
    expect(raise.getEffectiveWeight()).toBeLessThan(0.7);
    animator.update(0.2);
    expect(rest.getEffectiveWeight()).toBeCloseTo(1);
    expect(raise.getEffectiveWeight()).toBeCloseTo(0);
  });

  it('only changes time scale when the same clip is requested again', () => {
    const { mesh, clips } = skinnedRig();
    const animator = new Animator(mesh, clips);
    animator.play('raise', 0);
    animator.update(0.3);
    const action = animator.mixer.existingAction(clips[0]!)!;
    animator.play('raise', 0.2, -1);
    expect(action.time).toBeCloseTo(0.3);
    expect(action.timeScale).toBe(-1);
  });

  it('rejects unknown clips', () => {
    const { mesh, clips } = skinnedRig();
    expect(() => {
      new Animator(mesh, clips).play('dance');
    }).toThrow(/dance/);
  });

  it('adds a layer on top of the base clip and fades it out', () => {
    const { mesh, arm, clips } = skinnedRig();
    const lift = new THREE.AnimationClip('lift', 1, [
      new THREE.QuaternionKeyframeTrack(
        'arm.quaternion',
        [0],
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4).toArray(),
      ),
    ]);
    const animator = new Animator(mesh, [clips[1]!], [lift]);
    animator.play('rest', 0);
    animator.setLayer('lift', 1, 0.1);
    animator.update(0.2);
    expect(animator.layerWeight('lift')).toBe(1);
    expect(2 * Math.acos(Math.min(1, arm.quaternion.w))).toBeCloseTo(Math.PI / 4, 2);
    animator.setLayer('lift', 0, 0.1);
    animator.update(0.05);
    expect(animator.layerWeight('lift')).toBeCloseTo(0.5);
    animator.update(0.1);
    expect(arm.quaternion.w).toBeCloseTo(1);
  });

  it('holds the last frame of a clip played once', () => {
    const { mesh, arm, clips } = skinnedRig();
    const animator = new Animator(mesh, clips);
    animator.play('raise', 0, 1, true);
    animator.update(3);
    const angle = 2 * Math.acos(Math.min(1, Math.abs(arm.quaternion.w)));
    expect(angle).toBeCloseTo(Math.PI / 2, 2);
  });
});
