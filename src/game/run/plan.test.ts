import { describe, expect, it } from 'vitest';
import { COMBAT_LAYOUTS } from '../arenas/layouts';
import { planRun, RUN_SHAPE, waveCost } from './plan';

describe('planRun', () => {
  const plan = planRun(1234);

  it('follows the run shape and ends with the boss', () => {
    expect(plan.rooms.map((r) => r.kind)).toEqual(RUN_SHAPE);
    expect(plan.rooms.at(-1)!.kind).toBe('boss');
  });

  it('never repeats a combat layout back to back', () => {
    const combat = plan.rooms.filter((r) => r.kind === 'combat').map((r) => r.layout);
    for (const id of combat) expect(COMBAT_LAYOUTS).toContain(id);
    for (let i = 1; i < combat.length; i++) expect(combat[i]).not.toBe(combat[i - 1]);
  });

  it('offers two different rewards per door choice, one boss door, nothing after the boss', () => {
    plan.offers.slice(0, 6).forEach((o) => {
      expect(o).toHaveLength(2);
      expect(o[0]).not.toBe(o[1]);
    });
    expect(plan.offers[6]).toEqual(['boss']);
    expect(plan.offers[7]).toEqual([]);
  });

  it('grows the fights with depth', () => {
    const combat = plan.rooms
      .map((r, depth) => ({ r, depth }))
      .filter(({ r }) => r.kind === 'combat');
    const first = combat[0]!;
    const last = combat.at(-1)!;
    expect(first.r.waves).toHaveLength(2);
    expect(last.r.waves).toHaveLength(3);
    expect(waveCost(last.r.waves[0]!)).toBeGreaterThan(waveCost(first.r.waves[0]!));
    expect(first.r.waves.every((w) => !w.knight)).toBe(true);
  });

  it('gives grace rooms no waves', () => {
    for (const r of plan.rooms.filter((r) => r.kind === 'grace')) expect(r.waves).toEqual([]);
  });

  it('is deterministic per seed and varies across seeds', () => {
    expect(planRun(1234)).toEqual(plan);
    const others = [1, 2, 3, 4, 5].map((s) => JSON.stringify(planRun(s)));
    expect(new Set(others).size).toBe(5);
  });
});
