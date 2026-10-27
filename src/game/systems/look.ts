import { config } from '../config';
import type { GameSystem } from '../types';

/** Turns mouse movement into yaw and pitch. Mouse right turns right, mouse down looks down. */
export const lookSystem: GameSystem = ({ input, world }) => {
  const { sensitivity, minPitch, maxPitch } = config.look;
  for (const { look } of world.with('player', 'look')) {
    look.yaw = wrapAngle(look.yaw - input.look.x * sensitivity);
    look.pitch = clampPitch(look.pitch - input.look.y * sensitivity, minPitch, maxPitch);
  }
};

export function clampPitch(pitch: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, pitch));
}

/** Keeps an angle in (-PI, PI] so it never grows without bound. */
export function wrapAngle(a: number): number {
  const twoPi = Math.PI * 2;
  const wrapped = a - twoPi * Math.floor((a + Math.PI) / twoPi);
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** Horizontal forward and right unit vectors for a yaw (yaw 0 faces -z). */
export function yawBasis(yaw: number): { fx: number; fz: number; rx: number; rz: number } {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  return { fx: -s, fz: -c, rx: c, rz: -s };
}
