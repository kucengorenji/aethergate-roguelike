import { describe, expect, it } from 'vitest';
import { ProjectileKind, ProjectilePool, Team } from './projectiles';

const shot = {
  kind: ProjectileKind.Bolt,
  team: Team.Player,
  x: 1,
  y: 2,
  z: 3,
  vx: 0,
  vy: 0,
  vz: -40,
  radius: 0.1,
  damage: 10,
  life: 1,
};

describe('ProjectilePool', () => {
  it('spawns into free slots and reuses released ones', () => {
    const pool = new ProjectilePool(2);
    const a = pool.spawn(shot);
    const b = pool.spawn(shot);
    expect([a, b].sort()).toEqual([0, 1]);
    expect(pool.count).toBe(2);
    expect(pool.spawn(shot)).toBe(-1);
    pool.release(a);
    expect(pool.count).toBe(1);
    expect(pool.spawn(shot)).toBe(a);
  });

  it('starts with the previous position equal to the spawn point', () => {
    const pool = new ProjectilePool(1);
    const i = pool.spawn(shot);
    expect([...pool.prev.subarray(i * 3, i * 3 + 3)]).toEqual([1, 2, 3]);
    expect(pool.damage[i]).toBe(10);
  });

  it('ignores double release and clears everything', () => {
    const pool = new ProjectilePool(3);
    const i = pool.spawn(shot);
    pool.spawn(shot);
    pool.release(i);
    pool.release(i);
    expect(pool.count).toBe(1);
    pool.clear();
    expect(pool.count).toBe(0);
    expect(pool.alive.every((a) => a === 0)).toBe(true);
  });
});
