import { describe, expect, it } from 'vitest';
import { ParticlePool, particleAt, type ParticleState } from './particles';

function spawn(
  pool: ParticlePool,
  { born = 0, life = 1, v = [0, 0, 0], drag = 0, gravity = 0 } = {},
): number {
  const i = pool.take();
  pool.born[i] = born;
  pool.life[i] = life;
  pool.origin.set([1, 2, 3], i * 3);
  pool.velocity.set(v, i * 3);
  pool.drag[i] = drag;
  pool.gravity[i] = gravity;
  return i;
}

const at = (): ParticleState => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });

describe('ParticlePool', () => {
  it('hands out slots until full, then drops spawns', () => {
    const pool = new ParticlePool(2);
    expect(pool.take()).toBeGreaterThanOrEqual(0);
    expect(pool.take()).toBeGreaterThanOrEqual(0);
    expect(pool.take()).toBe(-1);
    expect(pool.count).toBe(2);
  });

  it('frees particles whose life has ended', () => {
    const pool = new ParticlePool(4);
    spawn(pool, { born: 0, life: 0.5 });
    spawn(pool, { born: 0, life: 2 });
    pool.expire(0.4);
    expect(pool.count).toBe(2);
    pool.expire(0.5);
    expect(pool.count).toBe(1);
    pool.clear();
    expect(pool.count).toBe(0);
  });
});

describe('particleAt', () => {
  it('falls ballistically without drag', () => {
    const pool = new ParticlePool(1);
    const i = spawn(pool, { v: [2, 3, -1], gravity: -10 });
    const s = at();
    particleAt(pool, i, 0.5, s);
    expect(s.x).toBeCloseTo(1 + 2 * 0.5);
    expect(s.y).toBeCloseTo(2 + 3 * 0.5 - 0.5 * 10 * 0.25);
    expect(s.z).toBeCloseTo(3 - 0.5);
    expect(s.vy).toBeCloseTo(3 - 5);
  });

  it('matches a fine numerical integration with drag and gravity', () => {
    const pool = new ParticlePool(1);
    const i = spawn(pool, { v: [4, 6, -2], drag: 3, gravity: -9 });
    const s = at();
    particleAt(pool, i, 0.8, s);
    let [x, y, z] = [1, 2, 3];
    let [vx, vy, vz] = [4, 6, -2];
    const h = 1e-5;
    for (let t = 0; t < 0.8 - h / 2; t += h) {
      vx += -3 * vx * h;
      vy += (-9 - 3 * vy) * h;
      vz += -3 * vz * h;
      x += vx * h;
      y += vy * h;
      z += vz * h;
    }
    expect(s.x).toBeCloseTo(x, 3);
    expect(s.y).toBeCloseTo(y, 3);
    expect(s.z).toBeCloseTo(z, 3);
    expect(s.vy).toBeCloseTo(vy, 3);
  });

  it('settles at the terminal velocity gravity over drag', () => {
    const pool = new ParticlePool(1);
    const i = spawn(pool, { v: [0, 0, 0], drag: 2, gravity: 1 });
    const s = at();
    particleAt(pool, i, 20, s);
    expect(s.vy).toBeCloseTo(0.5);
  });
});
