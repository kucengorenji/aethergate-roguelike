import { Rng } from '@engine/rng';
import { describe, expect, it } from 'vitest';
import { burst, coneDirection, rollCount, type Emitter, type Recipe } from './emit';
import { ParticlePool, PARTICLE_TAGS, TAG } from './particles';

function emitter(seed = 1, density = 1, capacity = 256): Emitter {
  return {
    particles: new ParticlePool(capacity),
    rng: new Rng(seed),
    clock: 2,
    density,
    emitted: new Uint32Array(PARTICLE_TAGS.length),
  };
}

const sparks: Recipe = {
  count: 6,
  life: [0.2, 0.4],
  speed: [3, 7],
  size: [0.06, 0.01],
  spread: 0.5,
  drag: 4,
  gravity: -9,
  stretch: 0.03,
  glow: 3,
};
const white = { r: 1, g: 1, b: 1 };

describe('rollCount', () => {
  it('spawns the whole count at full density', () => {
    expect(rollCount(emitter(), 6)).toBe(6);
  });

  it('rolls the fraction, so lower quality spawns proportionally fewer on average', () => {
    const e = emitter(7, 0.4);
    let total = 0;
    for (let i = 0; i < 2000; i++) total += rollCount(e, 3);
    expect(total / 2000).toBeCloseTo(1.2, 1);
  });
});

describe('burst', () => {
  it('fills particles from the recipe, born now, glowing in HDR', () => {
    const e = emitter();
    const n = burst(e, TAG.hit, sparks, white, 1, 2, 3, 0, 1, 0);
    expect(n).toBe(6);
    expect(e.particles.count).toBe(6);
    expect(e.emitted[TAG.hit]).toBe(6);
    const pool = e.particles;
    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.alive[i]) continue;
      expect(pool.born[i]).toBe(2);
      expect(pool.life[i]).toBeGreaterThanOrEqual(0.2);
      expect(pool.life[i]).toBeLessThan(0.4);
      expect(pool.color[i * 4]).toBe(3);
      expect(pool.color[i * 4 + 3]).toBe(0);
      const speed = Math.hypot(
        pool.velocity[i * 3]!,
        pool.velocity[i * 3 + 1]!,
        pool.velocity[i * 3 + 2]!,
      );
      expect(speed).toBeGreaterThanOrEqual(3 - 1e-4);
      expect(speed).toBeLessThan(7);
    }
  });

  it('is the same for the same seed, so effects are deterministic', () => {
    const a = emitter(5);
    const b = emitter(5);
    burst(a, TAG.impact, sparks, white, 0, 0, 0, 1, 0, 0);
    burst(b, TAG.impact, sparks, white, 0, 0, 0, 1, 0, 0);
    expect([...a.particles.velocity]).toEqual([...b.particles.velocity]);
    expect([...a.particles.life]).toEqual([...b.particles.life]);
  });

  it('drops particles quietly once the pool is full', () => {
    const e = emitter(1, 1, 4);
    burst(e, TAG.hit, sparks, white, 0, 0, 0, 0, 1, 0);
    expect(e.particles.count).toBe(4);
    expect(e.emitted[TAG.hit]).toBe(4);
  });
});

describe('coneDirection', () => {
  it('returns unit vectors within the spread of the axis', () => {
    const rng = new Rng(3);
    const out = { x: 0, y: 0, z: 0 };
    for (const [ax, ay, az] of [
      [0, 1, 0],
      [1, 0, 0],
      [0.3, -0.2, 0.9],
      [0, -1, 0],
    ] as const) {
      const len = Math.hypot(ax, ay, az);
      for (let i = 0; i < 200; i++) {
        coneDirection(rng, ax, ay, az, 0.4, out);
        expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(1, 6);
        const cos = (out.x * ax + out.y * ay + out.z * az) / len;
        expect(cos).toBeGreaterThanOrEqual(Math.cos(0.4) - 1e-6);
      }
    }
  });
});
