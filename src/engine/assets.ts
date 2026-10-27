import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * Loads models produced by `pnpm assets` (meshopt-compressed glTF with WebP
 * textures). Files in public/ are served from the site root, so pass paths like
 * 'assets/models/crate.glb'. Results are cached per URL.
 */
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF>>();

export function loadModel(url: string): Promise<GLTF> {
  let promise = cache.get(url);
  if (!promise) {
    promise = loader.loadAsync(import.meta.env.BASE_URL + url);
    cache.set(url, promise);
  }
  return promise;
}
