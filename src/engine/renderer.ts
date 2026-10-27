import * as THREE from 'three/webgpu';

export type RendererBackend = 'webgpu' | 'webgl2';

/**
 * WebGPU renderer with automatic WebGL 2 fallback. `?renderer=webgl` forces the
 * fallback, which is useful to reproduce bugs seen on older browsers.
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  forceWebGL: boolean,
): Promise<{ renderer: THREE.WebGPURenderer; backend: RendererBackend }> {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const backend: RendererBackend =
    (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true
      ? 'webgpu'
      : 'webgl2';
  return { renderer, backend };
}
