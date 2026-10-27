/**
 * The first handcrafted arena, as data. Boxes are axis-aligned before `rotY`
 * (radians); `size` is the full size in meters and `y` is the bottom.
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
  /** Half the floor's side length. */
  halfSize: number;
  wallHeight: number;
  spawn: { x: number; z: number; yaw: number };
  boxes: ArenaBox[];
}

const pillar = (x: number, z: number, h = 4.5): ArenaBox => ({
  x,
  y: 0,
  z,
  size: [1.2, h, 1.2],
  kind: 'pillar',
});
const lowWall = (x: number, z: number, length: number, rotY = 0): ArenaBox => ({
  x,
  y: 0,
  z,
  size: [length, 1.1, 0.5],
  rotY,
  kind: 'cover',
});

/** A ruined courtyard: a broken arch in the middle, a ring of pillars, low walls for cover. */
export const grayboxArena: ArenaLayout = {
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 14, yaw: 0 },
  boxes: [
    // Broken arch: two tall pillars and a lintel that only spans part of the gap.
    pillar(-3, -2, 6),
    pillar(3, -2, 6),
    { x: -1.2, y: 6, z: -2, size: [5.4, 0.9, 1.4], kind: 'trim' },
    // Ring of pillars, some broken short.
    pillar(-10, -9),
    pillar(10, -9, 2.2),
    pillar(-12, 3, 3),
    pillar(12, 3),
    pillar(-7, 10, 1.6),
    pillar(8, 9),
    // Cover.
    lowWall(-5, 6, 3.5),
    lowWall(5.5, 4, 3, 0.35),
    lowWall(-11, -2, 3, Math.PI / 2),
    lowWall(13, -4, 3.5, Math.PI / 2),
    lowWall(0, -12, 5),
    lowWall(-14, -13, 3, 0.6),
    lowWall(14, 13, 2.5, -0.5),
    // Raised dais behind the arch: a single 0.3 m step the player can walk onto.
    { x: 0, y: 0, z: -7, size: [7, 0.3, 4], kind: 'trim' },
    // Rubble.
    { x: 6, y: 0, z: -4, size: [0.9, 0.5, 0.7], rotY: 0.4, kind: 'cover' },
    { x: -6.5, y: 0, z: -6, size: [1.2, 0.7, 0.9], rotY: -0.3, kind: 'cover' },
    { x: 2.5, y: 0, z: 9, size: [0.7, 0.45, 0.7], rotY: 0.8, kind: 'cover' },
  ],
};
