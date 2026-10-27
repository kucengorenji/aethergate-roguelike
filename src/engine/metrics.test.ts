import { describe, expect, it } from 'vitest';
import { RollingStats } from './metrics';

describe('RollingStats', () => {
  it('summarizes samples', () => {
    const s = new RollingStats();
    for (let i = 1; i <= 100; i++) s.push(i);
    expect(s.summary()).toEqual({ count: 100, avg: 50.5, p95: 96, max: 100 });
  });

  it('drops the oldest samples beyond capacity', () => {
    const s = new RollingStats(2);
    s.push(100);
    s.push(1);
    s.push(3);
    expect(s.summary().max).toBe(3);
  });

  it('handles an empty window', () => {
    expect(new RollingStats().summary().count).toBe(0);
  });
});
