import * as THREE from 'three/webgpu';
import { OFFER_INFO, type Offer } from '../run/rewards';

const shapes: Record<Offer, THREE.BufferGeometry> = {
  boon: new THREE.OctahedronGeometry(0.32),
  shards: new THREE.OctahedronGeometry(0.22).scale(0.8, 1.8, 0.8),
  heal: new THREE.IcosahedronGeometry(0.28, 1),
  flask: new THREE.CylinderGeometry(0.12, 0.24, 0.5, 8),
  boss: new THREE.IcosahedronGeometry(0.34, 0),
};

const materials = Object.fromEntries(
  (Object.keys(OFFER_INFO) as Offer[]).map((offer) => [
    offer,
    new THREE.MeshStandardMaterial({
      color: OFFER_INFO[offer].color,
      emissive: OFFER_INFO[offer].color,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    }),
  ]),
) as Record<Offer, THREE.MeshStandardMaterial>;

/** A small glowing shape that tells rewards apart at a glance (doors and tokens). */
export function emblemFor(offer: Offer): THREE.Mesh {
  const mesh = new THREE.Mesh(shapes[offer], materials[offer]);
  mesh.castShadow = true;
  return mesh;
}
