/**
 * A handcrafted arena, as data. Boxes are axis-aligned before `rotY` (radians);
 * `size` is the full size in meters and `y` is the bottom. Every layout has its
 * entrance on the +z side and its door slots along the far (-z) wall.
 */
export interface ArenaBox {
  x: number;
  y: number;
  z: number;
  size: [number, number, number];
  rotY?: number;
  kind: 'wall' | 'pillar' | 'cover' | 'trim';
}

export interface ArenaLayout {
  id: string;
  /** Half the floor's side length. */
  halfSize: number;
  wallHeight: number;
  /** Where the player enters, and the yaw it faces. */
  spawn: { x: number; z: number; yaw: number };
  /** Door slots on the far side, left to right. A single door uses the middle one. */
  doors: { x: number; z: number }[];
  /** Where enemies may rise, on open floor. */
  enemySpawns: { x: number; z: number }[];
  /** Where the room's reward token appears; defaults to 5 m in front of the entrance. */
  rewardAt?: { x: number; z: number };
  boxes: ArenaBox[];
}

export function rewardPoint(layout: ArenaLayout): { x: number; z: number } {
  return layout.rewardAt ?? { x: layout.spawn.x, z: layout.spawn.z - 5 };
}

export const pillar = (x: number, z: number, h = 4.5, w = 1.2): ArenaBox => ({
  x,
  y: 0,
  z,
  size: [w, h, w],
  kind: 'pillar',
});

export const lowWall = (x: number, z: number, length: number, rotY = 0): ArenaBox => ({
  x,
  y: 0,
  z,
  size: [length, 1.1, 0.5],
  rotY,
  kind: 'cover',
});

export const rubble = (
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  rotY = 0,
): ArenaBox => ({
  x,
  y: 0,
  z,
  size: [w, h, d],
  rotY,
  kind: 'cover',
});

/** Mirrors boxes across x = 0, for symmetric layouts. */
export function mirrored(boxes: ArenaBox[]): ArenaBox[] {
  return boxes.flatMap((b) => [
    b,
    { ...b, x: -b.x, rotY: b.rotY === undefined ? undefined : -b.rotY },
  ]);
}
