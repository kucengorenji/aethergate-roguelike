import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { Ctx } from '../types';

export const PLAYER_SPAWN = { x: 0, y: 1, z: 0 } as const;

export function spawnPlayer(ctx: Ctx): void {
  const { radius } = config.player;
  const body = ctx.physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(PLAYER_SPAWN.x, PLAYER_SPAWN.y, PLAYER_SPAWN.z)
      .setLinearDamping(0.4)
      .setAngularDamping(0.8)
      .setCcdEnabled(true),
  );
  ctx.physics.world.createCollider(
    RAPIER.ColliderDesc.ball(radius).setFriction(1.2).setRestitution(0.2).setDensity(1),
    body,
  );

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.4 }),
  );
  mesh.castShadow = true;
  ctx.world.add({ player: true, body, object3d: mesh });
}

export function resetPlayer(body: RAPIER.RigidBody): void {
  body.setTranslation(PLAYER_SPAWN, true);
  body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

/** Stripes make rolling readable on an otherwise featureless sphere. */
function stripeTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const g = canvas.getContext('2d')!;
  g.fillStyle = `#${config.colors.player.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = `#${config.colors.playerStripe.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 13, 64, 6);
  g.fillRect(28, 0, 8, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
