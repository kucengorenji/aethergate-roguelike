import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { meteorAt } from './meteor';

describe('meteorAt', () => {
  const at = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 };
  const { meteorFall, meteorHeight } = config.vfx.telegraphs;

  it('is not in the sky until its last moments', () => {
    expect(meteorAt(1, 2, meteorFall + 0.01, at)).toBe(false);
  });

  it('starts high and lands exactly on its marker', () => {
    expect(meteorAt(1, 2, meteorFall, at)).toBe(true);
    expect(at.y).toBeCloseTo(meteorHeight);
    expect(meteorAt(1, 2, 0, at)).toBe(true);
    expect([at.x, at.y, at.z]).toEqual([1, 0, 2]);
    expect(at.dy).toBeLessThan(0);
  });
});
