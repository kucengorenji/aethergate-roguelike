import { RAPIER } from '@engine/physics';
import * as THREE from 'three/webgpu';
import type { ArenaLayout } from '../arenas/types';
import { config } from '../config';
import { OFFER_INFO, type Offer } from '../run/rewards';
import type { Ctx } from '../types';
import { emblemFor } from './emblem';

const stone = new THREE.MeshStandardMaterial({ color: config.colors.pillar, roughness: 0.85 });
const pillarGeometry = new THREE.BoxGeometry(0.6, 3.2, 0.6);
const lintelGeometry = new THREE.BoxGeometry(3.4, 0.5, 0.8);
const portalGeometry = new THREE.PlaneGeometry(2, 2.9);

/**
 * Stone arches on the far wall, one per offer. They stay dim until the room's
 * reward is taken; then the portal glows in the color of what lies behind it.
 */
export function spawnDoors(ctx: Ctx, layout: ArenaLayout, offers: readonly Offer[]): void {
  const slots = offers.length === 1 ? [middle(layout)] : layout.doors;
  offers.forEach((offer, index) => {
    const slot = slots[index];
    if (!slot) return;
    const group = new THREE.Group();
    group.position.set(slot.x, 0, slot.z);
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeometry, stone);
      p.position.set(side * 1.3, 1.6, 0);
      p.castShadow = true;
      group.add(p);
    }
    const lintel = new THREE.Mesh(lintelGeometry, stone);
    lintel.position.y = 3.45;
    lintel.castShadow = true;
    group.add(lintel);

    const color = OFFER_INFO[offer].color;
    const portalMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.position.set(0, 1.45, 0.05);
    group.add(portal);
    const emblem = emblemFor(offer);
    emblem.position.set(0, 1.6, 0.3);
    group.add(emblem);

    // Only the pillars block movement; the portal is walked up to, not through.
    const body = ctx.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(slot.x, 1.6, slot.z),
    );
    for (const side of [-1, 1]) {
      ctx.physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.3, 1.6, 0.3).setTranslation(side * 1.3, 0, 0),
        body,
      );
    }
    ctx.world.add({
      object3d: group,
      room: { body, dispose: [portalMaterial] },
      door: { index, offer, open: false, portal, emblem },
    });
  });
}

function middle(layout: ArenaLayout): { x: number; z: number } {
  const z = layout.doors[0]?.z ?? -layout.halfSize + 1.4;
  return { x: 0, z };
}
