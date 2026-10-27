import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import {
  float,
  length,
  luminance,
  mix,
  pass,
  renderOutput,
  screenUV,
  smoothstep,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

export interface PostSettings {
  bloom: {
    strength: number;
    /** Blur spread, 0 to 1. */
    radius: number;
    /** Scene luminance (linear, before tone mapping) where bloom starts. */
    threshold: number;
    /** Size of the first blur level relative to the screen; smaller is cheaper and softer. */
    resolution: number;
  };
  grade: {
    /** Multiplies the scene before tone mapping. */
    exposure: number;
    /** Multiplies the tone-mapped color per channel: the white balance. */
    gain: readonly [number, number, number];
    /** Added to the darks and faded out toward white: the shadow tint. */
    lift: readonly [number, number, number];
    saturation: number;
    /** Around mid grey: 1 leaves the image as it is. */
    contrast: number;
    /** How much the corners darken, 0 to 1. */
    vignette: number;
  };
}

/**
 * Bloom and a color grade over the scene, built from three's node post-processing
 * so the same chain runs on the WebGPU and the WebGL 2 backends. Bloom works on
 * the HDR scene with a luminance threshold, so only colors pushed above 1 glow;
 * the grade works on the tone-mapped image, where its numbers mean what they say.
 */
export class PostPipeline {
  private readonly pipeline: THREE.RenderPipeline;
  private readonly color;
  private readonly glow;
  private readonly exposure = uniform(1);
  private readonly gain = uniform(new THREE.Vector3(1, 1, 1));
  private readonly lift = uniform(new THREE.Vector3(0, 0, 0));
  private readonly saturation = uniform(1);
  private readonly contrast = uniform(1);
  private readonly vignette = uniform(0);
  private bloomOn: boolean | null = null;

  constructor(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.pipeline = new THREE.RenderPipeline(renderer);
    // The grade needs the tone-mapped image, so the chain does its own output transform.
    this.pipeline.outputColorTransform = false;
    this.color = pass(scene, camera).getTextureNode('output');
    this.glow = bloom(this.color);
  }

  /** Whether bloom is part of the chain right now. */
  get bloom(): boolean {
    return this.bloomOn === true;
  }

  /**
   * Copies settings into the shader uniforms (cheap enough every frame, so debug
   * panel edits apply live). Switching bloom rebuilds the chain once.
   */
  apply(settings: PostSettings, bloomOn: boolean): void {
    const { bloom: b, grade: g } = settings;
    this.glow.strength.value = b.strength;
    this.glow.radius.value = b.radius;
    this.glow.threshold.value = b.threshold;
    if (this.glow.getResolutionScale() !== b.resolution) this.glow.setResolutionScale(b.resolution);
    this.exposure.value = g.exposure;
    this.gain.value.set(...g.gain);
    this.lift.value.set(...g.lift);
    this.saturation.value = g.saturation;
    this.contrast.value = g.contrast;
    this.vignette.value = g.vignette;
    if (bloomOn !== this.bloomOn) {
      this.bloomOn = bloomOn;
      this.build();
    }
  }

  render(): void {
    this.pipeline.render();
  }

  private build(): void {
    const hdr = this.bloomOn ? this.color.add(this.glow) : this.color;
    const display = renderOutput(hdr.mul(this.exposure));
    const balanced = display.rgb.mul(this.gain);
    const lifted = balanced.add(this.lift.mul(float(1).sub(luminance(balanced))));
    const saturated = mix(vec3(luminance(lifted)), lifted, this.saturation);
    const contrasted = saturated.sub(0.5).mul(this.contrast).add(0.5);
    const edge = smoothstep(0.3, 0.85, length(screenUV.sub(0.5)));
    const graded = contrasted.mul(float(1).sub(edge.mul(this.vignette)));
    this.pipeline.outputNode = vec4(graded.clamp(0, 1), 1);
    this.pipeline.needsUpdate = true;
  }
}
