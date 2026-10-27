import { describe, expect, it } from 'vitest';
import { ARENAS } from './layouts';
import { rewardPoint, type ArenaBox } from './types';

/** Distance from a point to a box's footprint (rotated rectangle), 0 inside. */
function distanceToBox(x: number, z: number, b: ArenaBox): number {
  const c = Math.cos(-(b.rotY ?? 0));
  const s = Math.sin(-(b.rotY ?? 0));
  const dx = x - b.x;
  const dz = z - b.z;
  const lx = Math.abs(dx * c + dz * s) - b.size[0] / 2;
  const lz = Math.abs(-dx * s + dz * c) - b.size[2] / 2;
  return Math.hypot(Math.max(lx, 0), Math.max(lz, 0));
}

const open = (layout: (typeof ARENAS)[string], x: number, z: number, clearance: number) =>
  layout.boxes.every((b) => b.size[1] <= 0.35 || distanceToBox(x, z, b) >= clearance) &&
  Math.abs(x) <= layout.halfSize - clearance &&
  Math.abs(z) <= layout.halfSize - clearance;

describe.each(Object.values(ARENAS))('arena $id', (layout) => {
  it('has a free entrance with room behind it for the camera', () => {
    expect(open(layout, layout.spawn.x, layout.spawn.z, 1)).toBe(true);
    expect(layout.halfSize - layout.spawn.z).toBeGreaterThanOrEqual(5);
  });

  it('has room in front of every door', () => {
    expect(layout.doors.length).toBeGreaterThan(0);
    for (const d of layout.doors) expect(open(layout, d.x, d.z + 1.5, 1.2)).toBe(true);
  });

  it('puts the reward token on open floor', () => {
    const r = rewardPoint(layout);
    expect(open(layout, r.x, r.z, 0.8)).toBe(true);
  });

  it('spawns enemies on open floor away from the entrance', () => {
    for (const p of layout.enemySpawns) {
      expect(open(layout, p.x, p.z, 0.8)).toBe(true);
      expect(Math.hypot(p.x - layout.spawn.x, p.z - layout.spawn.z)).toBeGreaterThan(6);
    }
  });
});
