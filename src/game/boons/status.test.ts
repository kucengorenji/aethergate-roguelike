import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { addChill, addRot, addWeight, noStatus, tickStatus, timeFactor } from './status';

describe('chill', () => {
  it('slows per stack and freezes at the cap', () => {
    const s = noStatus();
    expect(addChill(s, 1)).toBe(false);
    expect(timeFactor(s)).toBeCloseTo(1 - config.status.chill.slowPerStack);
    expect(addChill(s, 2)).toBe(true);
    expect(timeFactor(s)).toBe(0);
    expect(s.chill).toBe(0);
  });

  it('wears off and thaws', () => {
    const s = noStatus();
    addChill(s, 3);
    tickStatus(s, config.status.chill.freezeSeconds + 0.01, false);
    expect(timeFactor(s)).toBe(1);
    addChill(s, 1);
    tickStatus(s, config.status.chill.duration + 0.01, false);
    expect(s.chill).toBe(0);
  });
});

describe('weight', () => {
  it('crushes on the third stack', () => {
    const s = noStatus();
    expect(addWeight(s, 1)).toBe(false);
    expect(addWeight(s, 1)).toBe(false);
    expect(addWeight(s, 1)).toBe(true);
    expect(s.weight).toBe(0);
    expect(addWeight(s, 3)).toBe(true);
  });
});

describe('rot', () => {
  const { perStackPerSecond, duration, maxStacks, festerMaxStacks, festerBonus } =
    config.status.rot;
  const total = (fester: boolean, seconds: number, stacks: number) => {
    const s = noStatus();
    addRot(s, stacks, fester);
    let dealt = 0;
    for (let t = 0; t < seconds; t += 1 / 60) dealt += tickStatus(s, 1 / 60, fester);
    return { dealt, s };
  };

  it('deals damage per stack per second until it expires', () => {
    const { dealt, s } = total(false, duration + 1, 2);
    expect(dealt).toBeCloseTo(2 * perStackPerSecond * duration, 0);
    expect(s.rot).toBe(0);
  });

  it('caps stacks, and Fester raises cap and damage', () => {
    expect(total(false, 1, 20).s.rot).toBe(maxStacks);
    expect(total(true, 1, 20).s.rot).toBe(festerMaxStacks);
    const plain = total(false, 2, 1).dealt;
    expect(total(true, 2, 1).dealt).toBeCloseTo(plain * (1 + festerBonus), 5);
  });
});
