import { lowWall, pillar, type ArenaLayout } from './types';

/** A ruined courtyard: a broken arch in the middle, a ring of pillars, low walls for cover. */
export const grayboxArena: ArenaLayout = {
  id: 'courtyard',
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 14, yaw: 0 },
  doors: [
    { x: -5, z: -18.6 },
    { x: 5, z: -18.6 },
  ],
  enemySpawns: [
    { x: -11, z: -17 },
    { x: -6, z: -16 },
    { x: 7, z: -15 },
    { x: 16, z: -15 },
    { x: -16, z: -6 },
    { x: 17, z: -9 },
    { x: -16, z: 8 },
    { x: 16, z: 6 },
    { x: -9, z: 0 },
    { x: 8, z: -1 },
    { x: -12, z: 16 },
    { x: 11, z: 16 },
  ],
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
