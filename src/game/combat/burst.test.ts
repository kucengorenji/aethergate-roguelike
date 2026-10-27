import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { burstReaches, cometFuse } from './burst';

const capsule = { x: 0, y: 0.85, z: 0, radius: 0.35, halfHeight: 0.5 };

describe('burstReaches', () => {
  it('reaches a target whose edge is inside the radius', () => {
    expect(burstReaches(3.2, 0.2, 0, 3, capsule)).toBe(true);
    expect(burstReaches(3.5, 0.2, 0, 3, capsule)).toBe(false);
  });

  it('measures height to the capsule, not its center', () => {
    expect(burstReaches(0, 4.2, 0, 3, capsule)).toBe(true);
    expect(burstReaches(0, 5, 0, 3, capsule)).toBe(false);
  });
});

describe('cometFuse', () => {
  it('bursts at the aim point', () => {
    expect(cometFuse(11) * config.comet.speed).toBeCloseTo(11);
  });

  it('caps the range and never fuses at zero', () => {
    expect(cometFuse(500) * config.comet.speed).toBeCloseTo(config.comet.maxRange);
    expect(cometFuse(0)).toBeGreaterThan(0);
  });
});
