import * as THREE from 'three/webgpu';
import { config } from '../config';

/**
 * The player's palette, shared by the procedural mannequin and the rigged
 * sorcerer. The sorcerer's glTF names its materials after these keys, and the
 * loader swaps them in, so the colors stay in config.ts.
 */
export const playerMaterials = {
  robe: new THREE.MeshStandardMaterial({
    color: config.colors.robe,
    roughness: 0.9,
    side: THREE.DoubleSide,
  }),
  hood: new THREE.MeshStandardMaterial({ color: config.colors.hood, roughness: 0.95 }),
  skin: new THREE.MeshStandardMaterial({ color: config.colors.skin, roughness: 0.7 }),
  accent: new THREE.MeshStandardMaterial({
    color: config.colors.accent,
    roughness: 0.4,
    metalness: 0.6,
  }),
  staff: new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.8 }),
  staffGem: new THREE.MeshStandardMaterial({
    color: config.colors.bolt,
    emissive: config.colors.bolt,
    emissiveIntensity: 1.2,
  }),
};
