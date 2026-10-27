import type * as THREE from 'three/webgpu';
import { config } from './config';
import type { Quality } from './save/data';

export interface RenderProfile {
  pixelRatio: number;
  /** Shadow map width and height in texels; 0 means no shadows. */
  shadowMapSize: number;
}

/** The render settings for a quality level on a screen with `devicePixelRatio`. */
export function qualityProfile(quality: Quality, devicePixelRatio: number): RenderProfile {
  const preset = config.quality[quality];
  return {
    pixelRatio: Math.min(preset.pixelRatio, Math.max(devicePixelRatio, 1)),
    shadowMapSize: preset.shadowMapSize,
  };
}

/**
 * Applies a render profile to the renderer and to every light in `scene` that was
 * set up to cast shadows. Shadows are switched per light because `castShadow` is
 * part of three's light hash, so materials rebuild; `renderer.shadowMap.enabled`
 * would leave shaders sampling a shadow map that is no longer drawn.
 */
export function applyQuality(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  profile: RenderProfile,
): void {
  if (renderer.getPixelRatio() !== profile.pixelRatio) renderer.setPixelRatio(profile.pixelRatio);
  scene.traverse((object) => {
    // Only lights with a shadow (directional, spot, point) have `shadow`.
    if (!('shadow' in object)) return;
    const light = object as THREE.DirectionalLight;
    // Remember which lights the scene meant to cast shadows before switching them off.
    const casts = (light.userData.castsShadow ??= light.castShadow) as boolean;
    if (!casts) return;
    light.castShadow = profile.shadowMapSize > 0;
    if (light.castShadow) light.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
  });
}
