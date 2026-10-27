import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { stateDuration, think, type View } from './brains';

const base: View = {
  kind: 'soldier',
  state: 'chase',
  time: 0,
  cooldown: 0,
  side: 1,
  dist: 10,
  dirX: 0,
  dirZ: -1,
  playerAlive: true,
};

describe('think', () => {
  it('soldiers walk at the player, then wind up in reach', () => {
    const far = think(base);
    expect(far.state).toBe('chase');
    expect(far.wantZ).toBeCloseTo(-config.enemies.soldier.speed);
    expect(think({ ...base, dist: 1.5 }).state).toBe('windup');
  });

  it('runs wind-up, attack, recover, chase in order on their timers', () => {
    const k = config.enemies.soldier;
    expect(think({ ...base, state: 'windup', time: k.windup - 0.01 }).state).toBe('windup');
    expect(think({ ...base, state: 'windup', time: k.windup }).state).toBe('attack');
    expect(think({ ...base, state: 'attack', time: k.attack }).state).toBe('recover');
    expect(think({ ...base, state: 'recover', time: k.recover }).state).toBe('chase');
    expect(think({ ...base, state: 'stagger', time: config.enemy.staggerSeconds }).state).toBe(
      'chase',
    );
  });

  it('does not move while rising, winding up or staggered', () => {
    for (const state of ['rising', 'windup', 'stagger'] as const) {
      const d = think({ ...base, state, time: 0 });
      expect([d.wantX, d.wantZ]).toEqual([0, 0]);
    }
  });

  it('casters back off when the player is close and circle at range', () => {
    const close = think({ ...base, kind: 'caster', cooldown: 1, dist: 4 });
    expect(close.wantZ).toBeGreaterThan(0); // away from a player at -z
    const mid = think({ ...base, kind: 'caster', cooldown: 1, dist: 10 });
    expect(Math.abs(mid.wantZ)).toBeLessThan(0.01);
    expect(Math.abs(mid.wantX)).toBeCloseTo(config.enemies.caster.speed);
  });

  it('casters wind up when their cooldown is over and the player is in range', () => {
    expect(think({ ...base, kind: 'caster', cooldown: 0, dist: 10 }).state).toBe('windup');
    expect(think({ ...base, kind: 'caster', cooldown: 0, dist: 30 }).state).toBe('chase');
  });

  it('hounds aim beside the player while far', () => {
    const d = think({ ...base, kind: 'hound', dist: 20 });
    expect(d.state).toBe('chase');
    expect(Math.abs(d.wantX)).toBeGreaterThan(0.5);
    expect(Math.hypot(d.wantX, d.wantZ)).toBeCloseTo(config.enemies.hound.speed);
  });

  it('stands still when the player is dead', () => {
    const d = think({ ...base, playerAlive: false, dist: 1 });
    expect(d.state).toBe('chase');
    expect([d.wantX, d.wantZ]).toEqual([0, 0]);
  });
});

describe('telegraphs', () => {
  it('every enemy winds up for at least 0.4 s', () => {
    for (const kind of ['soldier', 'caster', 'knight', 'hound'] as const) {
      expect(stateDuration(kind, 'windup')).toBeGreaterThanOrEqual(0.4);
    }
  });
});
