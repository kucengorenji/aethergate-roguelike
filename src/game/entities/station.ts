import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx } from '../types';

export type StationKind = 'grace' | 'altar' | 'rack';

export const STATION_LABEL: Record<StationKind, string> = {
  grace: 'Begin a run',
  altar: 'Upgrades',
  rack: 'Staffs',
};

const stone = new THREE.MeshStandardMaterial({ color: config.colors.pillar, roughness: 0.85 });
const wood = new THREE.MeshStandardMaterial({ color: 0x5c4630, roughness: 0.9 });
const glow = (color: number) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });
const flame = glow(0xffc857);
const crystal = glow(config.colors.bolt);
const staffGems = [glow(config.colors.bolt), glow(0xffe6a0), glow(0xff9a5a)];

/**
 * The hall's three stations: the grace site that starts a run, the altar of
 * upgrades and the staff rack. They are room entities with a solid base.
 */
export function spawnStation(ctx: Ctx, kind: StationKind, x: number, z: number): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    px: number,
    py: number,
    pz: number,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  let half: [number, number, number];
  switch (kind) {
    case 'grace':
      add(new THREE.CylinderGeometry(0.9, 1.1, 0.4, 10), stone, 0, 0.2, 0);
      add(new THREE.OctahedronGeometry(0.35), flame, 0, 1.1, 0).scale.set(1, 1.8, 1);
      add(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 5), wood, 0, 0.6, 0);
      half = [0.9, 0.3, 0.9];
      break;
    case 'altar':
      add(new THREE.BoxGeometry(1.6, 1, 0.9), stone, 0, 0.5, 0);
      add(new THREE.BoxGeometry(1.9, 0.12, 1.1), stone, 0, 1.06, 0);
      add(new THREE.OctahedronGeometry(0.22), crystal, 0, 1.45, 0).scale.set(0.8, 1.7, 0.8);
      half = [0.8, 0.55, 0.45];
      break;
    case 'rack':
      add(new THREE.BoxGeometry(1.8, 0.12, 0.4), wood, 0, 0.3, 0);
      add(new THREE.BoxGeometry(1.8, 0.12, 0.4), wood, 0, 1.5, 0);
      for (let i = 0; i < 3; i++) {
        const sx = -0.55 + i * 0.55;
        add(new THREE.CylinderGeometry(0.03, 0.035, 1.6, 6), wood, sx, 0.95, 0);
        add(new THREE.OctahedronGeometry(0.08), staffGems[i]!, sx, 1.8, 0);
      }
      half = [0.9, 0.9, 0.2];
      break;
  }
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(x, half[1], z),
  );
  ctx.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(...half), body);
  ctx.world.add({ object3d: group, room: { body }, station: { kind } });
}
