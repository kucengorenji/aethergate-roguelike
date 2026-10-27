import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { ashFlake, type Flake } from './ash';

const flake = (): Flake => ({ x: 0, y: 0, z: 0, size: 0, ember: false, fade: 0 });

describe('ashFlake', () => {
  const { box, height } = config.vfx.ash;

  it('keeps every flake in the box around the player, between the floor and the top', () => {
    const f = flake();
    for (const [cx, cz, t] of [
      [0, 0, 0],
      [13, -40, 7.5],
      [-200, 55, 3600],
    ] as const) {
      for (let i = 0; i < 300; i++) {
        ashFlake(i, t, cx, cz, f);
        expect(Math.abs(f.x - cx)).toBeLessThanOrEqual(box / 2);
        expect(Math.abs(f.z - cz)).toBeLessThanOrEqual(box / 2);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeLessThan(height);
        expect(f.fade).toBeGreaterThanOrEqual(0);
        expect(f.fade).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is a pure function of the flake, the time and the center', () => {
    const a = ashFlake(17, 4.25, 3, 5, flake());
    const b = ashFlake(17, 4.25, 3, 5, flake());
    expect(a).toEqual(b);
    const later = ashFlake(17, 6.25, 3, 5, flake());
    expect(Math.hypot(later.x - a.x, later.y - a.y, later.z - a.z)).toBeGreaterThan(0.1);
  });

  it('makes roughly the configured share of flakes glowing embers', () => {
    const f = flake();
    let embers = 0;
    for (let i = 0; i < 2000; i++) if (ashFlake(i, 0, 0, 0, f).ember) embers++;
    expect(embers / 2000).toBeCloseTo(config.vfx.ash.embers, 1);
  });
});
