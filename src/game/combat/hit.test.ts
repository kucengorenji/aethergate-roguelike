import { describe, expect, it } from 'vitest';
import { sweepSphereCapsule } from './hit';

// Capsule at the origin, inner segment y in [0.4, 1.4], radius 0.4.
const cap = [0, 0.9, 0, 0.5, 0.4] as const;

describe('sweepSphereCapsule', () => {
  it('hits when a fast segment passes straight through', () => {
    const s = sweepSphereCapsule(0, 1, 5, 0, 1, -5, 0.1, ...cap);
    expect(s).not.toBeNull();
    expect(s!).toBeCloseTo(0.5, 1);
  });

  it('misses beside the capsule', () => {
    expect(sweepSphereCapsule(1, 1, 5, 1, 1, -5, 0.1, ...cap)).toBeNull();
  });

  it('counts the projectile radius', () => {
    expect(sweepSphereCapsule(0.7, 1, 5, 0.7, 1, -5, 0.35, ...cap)).not.toBeNull();
  });

  it('misses above the top cap and hits the rounded top', () => {
    expect(sweepSphereCapsule(0, 2.0, 5, 0, 2.0, -5, 0.05, ...cap)).toBeNull();
    expect(sweepSphereCapsule(0, 1.7, 5, 0, 1.7, -5, 0.05, ...cap)).not.toBeNull();
  });

  it('misses when the segment stops short', () => {
    expect(sweepSphereCapsule(0, 1, 5, 0, 1, 1, 0.1, ...cap)).toBeNull();
  });

  it('handles a vertical drop onto the capsule', () => {
    expect(sweepSphereCapsule(0, 3, 0, 0, 1.5, 0, 0.1, ...cap)).not.toBeNull();
  });
});
