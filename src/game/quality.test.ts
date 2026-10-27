import { describe, expect, it } from 'vitest';
import { effectsProfile, qualityProfile } from './quality';

describe('qualityProfile', () => {
  it('renders Low at 75% without shadows', () => {
    expect(qualityProfile('low', 1)).toEqual({ pixelRatio: 0.75, shadowMapSize: 0 });
    expect(qualityProfile('low', 2)).toEqual({ pixelRatio: 0.75, shadowMapSize: 0 });
  });

  it('renders Medium at full resolution with a 1024 shadow map', () => {
    expect(qualityProfile('medium', 2)).toEqual({ pixelRatio: 1, shadowMapSize: 1024 });
  });

  it('renders High at the screen ratio, at most 2x, with a 2048 shadow map', () => {
    expect(qualityProfile('high', 1)).toEqual({ pixelRatio: 1, shadowMapSize: 2048 });
    expect(qualityProfile('high', 1.5).pixelRatio).toBe(1.5);
    expect(qualityProfile('high', 3).pixelRatio).toBe(2);
  });

  it('never goes below full resolution on a zoomed-out page except on Low', () => {
    expect(qualityProfile('medium', 0.8).pixelRatio).toBe(1);
    expect(qualityProfile('high', 0.8).pixelRatio).toBe(1);
  });
});

describe('effectsProfile', () => {
  it('turns bloom off on Low only', () => {
    expect(effectsProfile('low').bloom).toBe(false);
    expect(effectsProfile('medium').bloom).toBe(true);
    expect(effectsProfile('high').bloom).toBe(true);
  });

  it('scales particles and ash up with quality', () => {
    const [low, medium, high] = (['low', 'medium', 'high'] as const).map(effectsProfile);
    expect(low!.particles).toBeLessThan(medium!.particles);
    expect(medium!.particles).toBeLessThan(high!.particles);
    expect(low!.ash).toBeLessThan(medium!.ash);
    expect(medium!.ash).toBeLessThan(high!.ash);
  });
});
