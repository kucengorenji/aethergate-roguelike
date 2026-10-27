import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import type { ArenaBox, ArenaLayout } from '../arenas/types';
import { config } from '../config';
import type { Ctx } from '../types';

const box = new THREE.BoxGeometry(1, 1, 1);
const materials = {
  wall: new THREE.MeshStandardMaterial({ color: config.colors.wall, roughness: 0.92 }),
  pillar: new THREE.MeshStandardMaterial({ color: config.colors.pillar, roughness: 0.85 }),
  cover: new THREE.MeshStandardMaterial({ color: config.colors.cover, roughness: 0.9 }),
  trim: new THREE.MeshStandardMaterial({ color: config.colors.trim, roughness: 0.9 }),
};

/** Half size of the largest arena, so one shadow map covers every room. */
const MAX_HALF_SIZE = 24;

/** Builds what every room shares, once: sky, fog, lights and the distant tree. */
export function spawnEnvironment(ctx: Ctx): void {
  const { scene } = ctx;
  scene.background = new THREE.Color(config.colors.skyHorizon);
  scene.fog = new THREE.Fog(config.colors.fog, 25, 110);
  scene.add(new THREE.HemisphereLight(0xfff0d6, 0x9a8466, 1.9));
  spawnSky(scene);

  // Low golden-hour sun from behind the entrance's left shoulder, so faces toward
  // the player are lit and cover throws long readable shadows across the room.
  const sun = new THREE.DirectionalLight(config.colors.sun, 3.2);
  sun.position.set(-20, 14, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const s = MAX_HALF_SIZE + 4;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 80 });
  scene.add(sun);

  spawnDistantTree(scene);
}

/** Builds a room from layout data: floor, perimeter walls and cover, all tagged `room`. */
export function spawnArena(ctx: Ctx, layout: ArenaLayout): void {
  const { halfSize, wallHeight } = layout;
  const floor = new THREE.MeshStandardMaterial({
    map: flagstoneTexture((halfSize * 2) / 4),
    roughness: 0.95,
  });
  addBox(
    ctx,
    { x: 0, y: -0.5, z: 0, size: [halfSize * 2, 0.5, halfSize * 2], kind: 'trim' },
    floor,
  );
  const t = 0.6;
  const span = halfSize * 2 + t * 2;
  for (const [x, z, w, d] of [
    [0, -halfSize - t / 2, span, t],
    [0, halfSize + t / 2, span, t],
    [-halfSize - t / 2, 0, t, span],
    [halfSize + t / 2, 0, t, span],
  ] as const) {
    addBox(ctx, { x, y: 0, z, size: [w, wallHeight, d], kind: 'wall' });
  }
  for (const b of layout.boxes) addBox(ctx, b);
}

/** Removes every entity of the current room, with its static body and own materials. */
export function despawnRoom(ctx: Ctx): void {
  for (const entity of [...ctx.world.with('room')]) {
    const { room } = entity;
    if (room.body) ctx.physics.world.removeRigidBody(room.body);
    for (const m of room.dispose ?? []) {
      if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose();
      m.dispose();
    }
    ctx.world.remove(entity);
  }
}

function addBox(ctx: Ctx, b: ArenaBox, floorMaterial?: THREE.MeshStandardMaterial): void {
  const [w, h, d] = b.size;
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotY ?? 0);
  const center = { x: b.x, y: b.y + h / 2, z: b.z };
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z).setRotation(rot),
  );
  ctx.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), body);

  const mesh = new THREE.Mesh(box, floorMaterial ?? materials[b.kind]);
  mesh.scale.set(w, h, d);
  mesh.position.set(center.x, center.y, center.z);
  mesh.quaternion.copy(rot);
  mesh.receiveShadow = true;
  mesh.castShadow = !floorMaterial;
  // The static body lives in the room component, not `body`, so the engine does
  // not interpolate level geometry every step; despawnRoom removes it.
  ctx.world.add({ object3d: mesh, room: { body, dispose: floorMaterial ? [floorMaterial] : [] } });
}

/**
 * 2 m flagstones with slight tone variation, so speed and distance read at a
 * glance. One texture tile is 4 m (2 by 2 stones); `repeat` tiles cover the floor.
 */
function flagstoneTexture(repeat: number): THREE.Texture {
  const size = 256;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const base = new THREE.Color(config.colors.floor);
  const tones = [1, 0.94, 1.05, 0.97];
  tones.forEach((tone, i) => {
    g.fillStyle = `#${base.clone().multiplyScalar(tone).getHexString()}`;
    g.fillRect((i % 2) * half, Math.floor(i / 2) * half, half, half);
  });
  g.strokeStyle = `#${base.clone().multiplyScalar(0.8).getHexString()}`;
  g.lineWidth = 4;
  g.strokeRect(0, 0, size, size);
  g.beginPath();
  g.moveTo(half, 0);
  g.lineTo(half, size);
  g.moveTo(0, half);
  g.lineTo(size, half);
  g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(repeat, repeat);
  return texture;
}

/** Gradient sky dome from a warm horizon to a dusty zenith, outside the fog. */
function spawnSky(scene: THREE.Scene): void {
  const geometry = new THREE.SphereGeometry(400, 24, 12);
  const horizon = new THREE.Color(config.colors.skyHorizon);
  const zenith = new THREE.Color(config.colors.skyZenith);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const t = Math.max(0, position.getY(i) / 400);
    c.lerpColors(horizon, zenith, Math.pow(t, 0.6)).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }),
  );
  sky.renderOrder = -2;
  scene.add(sky);
}

/**
 * The great tree of light on the horizon, the world's landmark. A flat bright
 * silhouette outside the fog, so it reads as glowing through the haze.
 */
function spawnDistantTree(scene: THREE.Scene): void {
  const material = new THREE.MeshBasicMaterial({ color: config.colors.tree, fog: false });
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3, 7, 110, 7), material);
  trunk.position.y = 55;
  tree.add(trunk);
  const canopy = new THREE.IcosahedronGeometry(1, 1);
  for (const [x, y, z, r] of [
    [0, 125, 0, 34],
    [-34, 108, 6, 22],
    [32, 104, -4, 24],
    [-14, 150, -6, 22],
    [18, 146, 4, 20],
    [-52, 96, 0, 13],
    [50, 92, 2, 14],
  ] as const) {
    const blob = new THREE.Mesh(canopy, material);
    blob.position.set(x, y, z);
    blob.scale.set(r * 1.25, r * 0.8, r);
    tree.add(blob);
  }
  tree.position.set(60, -20, -330);
  scene.add(tree);
}
