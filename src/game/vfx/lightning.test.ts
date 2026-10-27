import { describe, expect, it } from 'vitest';
import { LIGHTNING, lightningPoints } from './lightning';

describe('lightningPoints', () => {
  const out = new Float32Array((LIGHTNING.segments + 1) * 3);

  it('runs from one end to the other with jagged inner points', () => {
    const n = lightningPoints(0, 1, 0, 4, 1, 0, 0.02, out);
    expect(n).toBe(LIGHTNING.segments + 1);
    expect([out[0], out[1], out[2]]).toEqual([0, 1, 0]);
    const e = (n - 1) * 3;
    expect([out[e], out[e + 1], out[e + 2]]).toEqual([4, 1, 0]);
    let off = 0;
    for (let s = 1; s < n - 1; s++) {
      const side = Math.hypot(out[s * 3 + 1]! - 1, out[s * 3 + 2]!);
      expect(side).toBeLessThanOrEqual(LIGHTNING.jag * Math.SQRT2 + 1e-6);
      off += side;
    }
    expect(off).toBeGreaterThan(0);
  });

  it('keeps its shape within a flicker and changes it on the next', () => {
    const a = [...out.subarray(0, lightningPoints(0, 1, 0, 4, 1, 2, 0.01, out) * 3)];
    const b = [...out.subarray(0, lightningPoints(0, 1, 0, 4, 1, 2, 0.02, out) * 3)];
    const c = [...out.subarray(0, lightningPoints(0, 1, 0, 4, 1, 2, 0.07, out) * 3)];
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });
});
