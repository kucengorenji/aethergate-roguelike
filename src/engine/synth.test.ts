import { describe, expect, it } from 'vitest';
import { noiseBurst, sweep } from './synth';

const peak = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('synth', () => {
  it('produces a noise burst of the right length that peaks at gain and ends silent', () => {
    const { samples, sampleRate } = noiseBurst({ duration: 0.1, decay: 30, gain: 0.5 });
    expect(samples.length).toBe(Math.round(0.1 * sampleRate));
    expect(peak(samples)).toBeCloseTo(0.5, 5);
    expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.01);
  });

  it('is deterministic per seed', () => {
    const a = noiseBurst({ duration: 0.05, decay: 20, seed: 3 }).samples;
    const b = noiseBurst({ duration: 0.05, decay: 20, seed: 3 }).samples;
    const c = noiseBurst({ duration: 0.05, decay: 20, seed: 4 }).samples;
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('keeps a sweep within [-gain, gain]', () => {
    const { samples } = sweep({ duration: 0.2, from: 400, to: 900, decay: 8, gain: 0.6 });
    expect(peak(samples)).toBeLessThanOrEqual(0.6);
    expect(samples.every(Number.isFinite)).toBe(true);
  });
});
