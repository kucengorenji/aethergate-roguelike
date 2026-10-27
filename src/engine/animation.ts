import * as THREE from 'three/webgpu';

/**
 * Named animation clips on one model, with cross-fades, plus additive layers
 * for upper-body poses (aiming, swinging) on top of the base clip. The engine
 * updates every `animator` component on the fixed step, so a screenshot at a
 * given tick shows the same pose on every machine. Game systems only choose
 * what to play.
 */
export class Animator {
  readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly layers = new Map<string, Layer>();
  private currentName: string | null = null;

  /**
   * `layers` are additive clips whose keyframes hold rotations relative to the
   * rest pose. They start at weight 0.
   */
  constructor(
    root: THREE.Object3D,
    clips: readonly THREE.AnimationClip[],
    layers: readonly THREE.AnimationClip[] = [],
  ) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    for (const clip of layers) {
      clip.blendMode = THREE.AdditiveAnimationBlendMode;
      const action = this.mixer.clipAction(clip);
      action.setEffectiveWeight(0).play();
      this.layers.set(clip.name, { action, target: 0, fade: 0.1 });
    }
  }

  /** Name of the base clip playing (or fading in), or null. */
  get current(): string | null {
    return this.currentName;
  }

  /**
   * Cross-fades the base clip to `name`. Calling it again with the same name
   * only updates the time scale. `once` plays to the end and holds the last frame.
   */
  play(name: string, fadeSeconds = 0.15, timeScale = 1, once = false): void {
    const next = this.actions.get(name);
    if (!next) throw new Error(`Animator: no clip named "${name}"`);
    next.timeScale = timeScale;
    if (name === this.currentName) return;
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.reset().play();
    const previous = this.currentName ? this.actions.get(this.currentName) : undefined;
    if (previous) next.crossFadeFrom(previous, fadeSeconds, false);
    this.currentName = name;
  }

  /** Fades an additive layer toward `weight` over `fadeSeconds`. */
  setLayer(name: string, weight: number, fadeSeconds = 0.1): void {
    const layer = this.layer(name);
    layer.target = weight;
    layer.fade = fadeSeconds;
  }

  /** Restarts an additive layer from its first frame at full weight, once. */
  triggerLayer(name: string): void {
    const layer = this.layer(name);
    layer.action.setLoop(THREE.LoopOnce, 1);
    layer.action.clampWhenFinished = false;
    layer.action.reset().play();
    layer.action.setEffectiveWeight(1);
    layer.target = 1;
  }

  layerWeight(name: string): number {
    return this.layer(name).action.getEffectiveWeight();
  }

  update(dt: number): void {
    for (const layer of this.layers.values()) {
      const w = layer.action.getEffectiveWeight();
      const step = layer.fade > 0 ? dt / layer.fade : 1;
      const next =
        w < layer.target ? Math.min(layer.target, w + step) : Math.max(layer.target, w - step);
      layer.action.setEffectiveWeight(next);
    }
    this.mixer.update(dt);
  }

  private layer(name: string): Layer {
    const layer = this.layers.get(name);
    if (!layer) throw new Error(`Animator: no layer named "${name}"`);
    return layer;
  }
}

interface Layer {
  action: THREE.AnimationAction;
  target: number;
  fade: number;
}
