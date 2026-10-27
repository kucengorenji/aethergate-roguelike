import { describe, expect, it } from 'vitest';
import { clampPitch, wrapAngle, yawBasis } from './look';

describe('look math', () => {
  it('faces -z at yaw 0 with right along +x', () => {
    const b = yawBasis(0);
    expect(b.fx).toBeCloseTo(0);
    expect(b.fz).toBeCloseTo(-1);
    expect(b.rx).toBeCloseTo(1);
    expect(b.rz).toBeCloseTo(0);
  });

  it('turning right by 90 degrees faces +x', () => {
    const b = yawBasis(-Math.PI / 2);
    expect(b.fx).toBeCloseTo(1);
    expect(b.fz).toBeCloseTo(0);
  });

  it('wraps angles into (-PI, PI]', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(0.5 + 4 * Math.PI)).toBeCloseTo(0.5);
  });

  it('clamps pitch', () => {
    expect(clampPitch(5, -0.7, 0.9)).toBe(0.9);
    expect(clampPitch(-5, -0.7, 0.9)).toBe(-0.7);
  });
});
