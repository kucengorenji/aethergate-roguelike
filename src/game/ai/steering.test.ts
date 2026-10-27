import { describe, expect, it } from 'vitest';
import { separation, turnToward } from './steering';

describe('separation', () => {
  it('pushes away from a close neighbour and ignores far ones', () => {
    const me = { x: 0, z: 0, radius: 0.4 };
    const push = separation(
      me,
      [me, { x: 0.5, z: 0, radius: 0.4 }, { x: 5, z: 0, radius: 0.4 }],
      0.5,
    );
    expect(push.x).toBeLessThan(0);
    expect(push.z).toBeCloseTo(0);
  });

  it('pushes exactly stacked discs in different directions', () => {
    const at = () => ({ x: 1, z: 1, radius: 0.4 });
    const pushes = [0, 1, 2].map((i) => separation(at(), [at()], 0.5, 6, i));
    expect(Math.hypot(pushes[0]!.x, pushes[0]!.z)).toBeGreaterThan(0);
    expect(pushes[1]).not.toEqual(pushes[0]);
    expect(pushes[2]).not.toEqual(pushes[1]);
  });
});

describe('turnToward', () => {
  it('turns the short way across the wrap', () => {
    expect(turnToward(3, -3, 1)).toBeCloseTo(3 + (2 * Math.PI - 6));
  });

  it('limits the step', () => {
    expect(turnToward(0, 2, 0.5)).toBe(0.5);
  });
});
