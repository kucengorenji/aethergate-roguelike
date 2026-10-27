import type { SynthSound } from './synth';

export interface PlayOptions {
  /** 0..1, multiplied with the master volume. */
  volume?: number;
  /** Playback rate; 1 is the original pitch. */
  rate?: number;
}

/**
 * Minimal Web Audio wrapper: one-shot sounds, one looping music track and a
 * master volume. Browsers only allow audio after a user gesture, so the context
 * is created on the first key press or click; sounds played before that are
 * dropped, which is fine for effects.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private readonly sources = new Map<string, SynthSound | string>();
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private volume = 0.8;

  constructor(gestureTarget: EventTarget = window) {
    const unlock = () => {
      this.unlock();
    };
    for (const type of ['pointerdown', 'keydown']) {
      gestureTarget.addEventListener(type, unlock, { once: true, capture: true });
    }
  }

  /** Registers a sound under `name`: generated samples, or a URL under `public/`. */
  register(name: string, source: SynthSound | string): void {
    this.sources.set(name, source);
    this.buffers.delete(name);
  }

  play(name: string, { volume = 1, rate = 1 }: PlayOptions = {}): void {
    const { context, master } = this;
    if (!context || !master || context.state !== 'running') return;
    void this.buffer(name).then((buffer) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(master);
      source.start();
    });
  }

  /** Loops `name` as background music, replacing any current track. */
  playMusic(name: string, volume = 0.5): void {
    const { context, master } = this;
    if (!context || !master) return;
    void this.buffer(name).then((buffer) => {
      this.stopMusic();
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(master);
      source.start();
      this.music = source;
    });
  }

  stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }

  get masterVolume(): number {
    return this.volume;
  }

  set masterVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  private unlock(): void {
    if (this.context) {
      void this.context.resume();
      return;
    }
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
  }

  private buffer(name: string): Promise<AudioBuffer> {
    let promise = this.buffers.get(name);
    if (promise) return promise;
    const source = this.sources.get(name);
    const context = this.context;
    if (source === undefined)
      return Promise.reject(new Error(`AudioEngine: unknown sound "${name}"`));
    if (!context) return Promise.reject(new Error('AudioEngine: not unlocked yet'));
    promise =
      typeof source === 'string'
        ? fetch(import.meta.env.BASE_URL + source)
            .then((r) => r.arrayBuffer())
            .then((data) => context.decodeAudioData(data))
        : Promise.resolve(toBuffer(context, source));
    this.buffers.set(name, promise);
    return promise;
  }
}

function toBuffer(context: AudioContext, sound: SynthSound): AudioBuffer {
  const buffer = context.createBuffer(1, sound.samples.length, sound.sampleRate);
  buffer.copyToChannel(sound.samples as Float32Array<ArrayBuffer>, 0);
  return buffer;
}
