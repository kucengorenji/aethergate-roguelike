import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { bossAttackTime, bossWindup, chooseMove, phaseFor, ringRadius } from './bosses';

describe('boss phases', () => {
  it('splits the Captain at half health and the Starfallen Knight in thirds', () => {
    expect(phaseFor('captain', 0.51)).toBe(1);
    expect(phaseFor('captain', 0.5)).toBe(2);
    expect([0.9, 0.6, 0.2].map((f) => phaseFor('starfallen', f))).toEqual([1, 2, 3]);
  });
});

describe('chooseMove', () => {
  const { reach, chargeFrom } = config.enemies.captain;

  it('the Captain slams in reach and charges from range on alternate patterns', () => {
    expect(chooseMove('captain', reach - 0.1, 1, 1)).toBe('slam');
    expect(chooseMove('captain', chargeFrom + 1, 1, 0)).toBe('charge');
    expect(chooseMove('captain', chargeFrom + 1, 1, 1)).toBeNull();
  });

  it('the Starfallen Knight cycles moves per phase and adds meteors from phase 2', () => {
    const near = config.enemies.starfallen.reach - 0.5;
    expect([0, 1, 2].map((p) => chooseMove('starfallen', near, 1, p))).toEqual([
      'sweep',
      'well',
      'sweep',
    ]);
    expect([0, 1, 2, 3].map((p) => chooseMove('starfallen', near, 2, p))).toContain('meteors');
    expect([0, 1, 2].every((p) => chooseMove('starfallen', near, 1, p) !== 'meteors')).toBe(true);
  });

  it('closes in before a sweep but casts ranged moves from anywhere', () => {
    expect(chooseMove('starfallen', 15, 1, 0)).toBeNull();
    expect(chooseMove('starfallen', 15, 1, 1)).toBe('well');
  });
});

describe('timings', () => {
  it('telegraphs every move for at least 0.4 s, shorter in later phases', () => {
    for (const move of ['slam', 'charge'] as const) {
      expect(bossWindup('captain', move, 2)).toBeLessThan(bossWindup('captain', move, 1));
      expect(bossWindup('captain', move, 2)).toBeGreaterThanOrEqual(0.4);
    }
    for (const move of ['sweep', 'well', 'meteors'] as const) {
      expect(bossWindup('starfallen', move, 3)).toBeLessThan(bossWindup('starfallen', move, 1));
      expect(bossWindup('starfallen', move, 3)).toBeGreaterThanOrEqual(0.4);
    }
    expect(bossAttackTime('starfallen', 'well')).toBe(config.enemies.starfallen.wellTime);
  });

  it('closes the burning ring from start to end radius', () => {
    const { ringStart, ringEnd, ringSeconds } = config.enemies.starfallen;
    expect(ringRadius(0)).toBe(ringStart);
    expect(ringRadius(ringSeconds / 2)).toBeCloseTo((ringStart + ringEnd) / 2);
    expect(ringRadius(ringSeconds * 3)).toBe(ringEnd);
  });
});
