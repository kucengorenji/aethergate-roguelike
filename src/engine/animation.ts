import * as THREE from 'three/webgpu';

/**
 * Named animation clips on one model, with cross-fades. The engine updates every
 * `animator` component on the fixed step, so a screenshot at a given tick shows
 * the same pose on every machine. Game systems only choose what to play.
 */
export class Animator {
  readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private currentName: string | null = null;

  constructor(root: THREE.Object3D, clips: readonly THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }

  /** Name of the clip playing (or fading in), or null. */
  get current(): string | null {
    return this.currentName;
  }

  /** Cross-fades to `name`. Calling it again with the same name only updates the time scale. */
  play(name: string, fadeSeconds = 0.15, timeScale = 1): void {
    const next = this.actions.get(name);
    if (!next) throw new Error(`Animator: no clip named "${name}"`);
    next.timeScale = timeScale;
    if (name === this.currentName) return;
    next.reset().play();
    const previous = this.currentName ? this.actions.get(this.currentName) : undefined;
    if (previous) next.crossFadeFrom(previous, fadeSeconds, false);
    this.currentName = name;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}
