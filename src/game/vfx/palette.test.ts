import { describe, expect, it } from 'vitest';
import { linear, primaryElement } from './palette';

describe('palette', () => {
  it('converts sRGB hex to linear light', () => {
    const c = { r: 0, g: 0, b: 0 };
    expect(linear(0xffffff, c)).toEqual({ r: 1, g: 1, b: 1 });
    expect(linear(0x000000, c)).toEqual({ r: 0, g: 0, b: 0 });
    linear(0x808080, c);
    expect(c.r).toBeCloseTo(0.2158, 3);
  });

  it('takes the bolt element from the blessing in the Primary slot', () => {
    expect(primaryElement(undefined)).toBeNull();
    expect(primaryElement({ duos: [] })).toBeNull();
    expect(primaryElement({ primary: 'moonlit-bolts', duos: [] })).toBe('frost');
    expect(primaryElement({ primary: 'arc-bolts', skill: 'rime-comet', duos: [] })).toBe('storm');
  });
});
