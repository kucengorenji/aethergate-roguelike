import { loadModel } from '@engine/assets';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three/webgpu';
import { config } from '../config';
import { createMannequin } from './mannequin';
import { playerMaterials } from './player-materials';

/** `sorcerer` is the rigged glTF character, `mannequin` the procedural fallback (?model=mannequin). */
export type PlayerModelKind = 'sorcerer' | 'mannequin';

export interface PlayerModel {
  /** Origin at the feet, facing -z. */
  root: THREE.Object3D;
  /** Base clips `idle`, `run`, `dodge`. */
  clips: THREE.AnimationClip[];
  /** Additive upper-body layers `aim`, `bash`, `drink`. */
  layers: THREE.AnimationClip[];
}

const SORCERER_URL = 'assets/models/player.glb';

/**
 * Builds the player's model and clips in the shape `Animator` expects. The
 * sorcerer comes from `pnpm assets:player` (assets-src/player/build_player.py).
 */
export async function loadPlayerModel(kind: PlayerModelKind): Promise<PlayerModel> {
  if (kind === 'mannequin') return createMannequin();
  const gltf = await loadModel(SORCERER_URL);
  const root = clone(gltf.scene);
  root.name = 'sorcerer';
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const name = (object.material as THREE.Material).name;
    if (!(name in playerMaterials)) throw new Error(`player.glb: unknown material "${name}"`);
    object.material = playerMaterials[name as keyof typeof playerMaterials];
    object.castShadow = true;
  });

  const source = new Map(gltf.animations.map((clip) => [clip.name, clip]));
  const clip = (name: string): THREE.AnimationClip => {
    const found = source.get(name);
    if (!found) throw new Error(`player.glb: no clip named "${name}"`);
    return found.clone();
  };
  const idle = clip('idle');
  // Action timings live in config.ts, so the authored clips stretch to them.
  const layer = (name: string, duration?: number) =>
    THREE.AnimationUtils.makeClipAdditive(
      duration ? fit(clip(name), duration) : clip(name),
      0,
      idle,
    );
  return {
    root,
    clips: [idle, clip('run'), fit(clip('dodge'), config.dodge.duration)],
    layers: [
      layer('aim'),
      layer('bash', config.bash.duration),
      layer('drink', config.flask.duration),
    ],
  };
}

function fit(clip: THREE.AnimationClip, duration: number): THREE.AnimationClip {
  const scale = duration / clip.duration;
  for (const track of clip.tracks) track.scale(scale);
  clip.duration = duration;
  return clip;
}
