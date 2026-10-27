import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { aimAnglesAt, cameraRig } from './camera-rig';

describe('cameraRig', () => {
  it('puts the eye behind the right shoulder at yaw 0', () => {
    const { eye, forward } = cameraRig({ x: 0, y: 1, z: 0 }, 0, 0);
    expect(forward.z).toBeCloseTo(-1);
    expect(eye.x).toBeCloseTo(config.camera.shoulder);
    expect(eye.z).toBeCloseTo(config.camera.distance);
    expect(eye.y).toBeCloseTo(1 + config.camera.height);
  });

  it('finds look angles whose crosshair ray passes through the target', () => {
    const center = { x: 0, y: 0.9, z: 14 };
    const target = { x: 2, y: 1.2, z: 6 };
    const { yaw, pitch } = aimAnglesAt(center, target);
    const { eye, forward } = cameraRig(center, yaw, pitch);
    // Distance from the target to the ray eye + k * forward.
    const tx = target.x - eye.x;
    const ty = target.y - eye.y;
    const tz = target.z - eye.z;
    const k = tx * forward.x + ty * forward.y + tz * forward.z;
    const miss = Math.hypot(tx - k * forward.x, ty - k * forward.y, tz - k * forward.z);
    expect(miss).toBeLessThan(0.01);
  });
});
