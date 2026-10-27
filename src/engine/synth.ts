import { Rng } from './rng';

/** Raw mono samples, generated in code. Placeholder sounds until real assets exist. */
export interface SynthSound {
  sampleRate: number;
  samples: Float32Array;
}

const RATE = 44100;

/**
 * Filtered noise with an exponential decay: footsteps, impacts, whooshes.
 * `smoothing` in (0, 1) is a one-pole low-pass, higher is duller.
 */
export function noiseBurst(options: {
  duration: number;
  decay: number;
  smoothing?: number;
  gain?: number;
  seed?: number;
}): SynthSound {
  const { duration, decay, smoothing = 0.6, gain = 0.8, seed = 1 } = options;
  const rng = new Rng(seed);
  const samples = new Float32Array(Math.round(duration * RATE));
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / RATE;
    last = last * smoothing + (rng.next() * 2 - 1) * (1 - smoothing);
    samples[i] = last * Math.exp(-t * decay) * gain * fadeOut(i, samples.length);
  }
  return normalize({ sampleRate: RATE, samples }, gain);
}

/** A sine sweep from `from` to `to` Hz: chimes, magic, UI. */
export function sweep(options: {
  duration: number;
  from: number;
  to: number;
  decay: number;
  gain?: number;
}): SynthSound {
  const { duration, from, to, decay, gain = 0.6 } = options;
  const samples = new Float32Array(Math.round(duration * RATE));
  let phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / RATE;
    const freq = from + (to - from) * (t / duration);
    phase += (2 * Math.PI * freq) / RATE;
    samples[i] = Math.sin(phase) * Math.exp(-t * decay) * gain * fadeOut(i, samples.length);
  }
  return { sampleRate: RATE, samples };
}

/** Short linear fade at the end so sounds never stop with a click. */
function fadeOut(i: number, length: number): number {
  const fade = Math.min(length, 256);
  return Math.min(1, (length - i) / fade);
}

function normalize(sound: SynthSound, peak: number): SynthSound {
  let max = 0;
  for (const s of sound.samples) max = Math.max(max, Math.abs(s));
  if (max > 0) for (let i = 0; i < sound.samples.length; i++) sound.samples[i]! *= peak / max;
  return sound;
}
