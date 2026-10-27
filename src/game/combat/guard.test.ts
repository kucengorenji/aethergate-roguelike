import { describe, expect, it } from 'vitest';
import { inFrontArc } from './guard';

describe('inFrontArc', () => {
  it('blocks hits from the front and lets side and back hits through', () => {
    // Facing -z (yaw 0) at the origin.
    expect(inFrontArc(0, 0, 0, 0, -5, 120)).toBe(true);
    expect(inFrontArc(0, 0, 0, 3, -3, 120)).toBe(true);
    expect(inFrontArc(0, 0, 0, 5, 0, 120)).toBe(false);
    expect(inFrontArc(0, 0, 0, 0, 5, 120)).toBe(false);
  });

  it('follows the facing', () => {
    expect(inFrontArc(-Math.PI / 2, 0, 0, 5, 0, 120)).toBe(true);
  });
});
