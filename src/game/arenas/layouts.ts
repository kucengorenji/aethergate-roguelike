import { grayboxArena } from './graybox';
import { lowWall, mirrored, pillar, rubble, type ArenaLayout } from './types';

const twoDoors = (z: number) => [
  { x: -5, z },
  { x: 5, z },
];

/** Two rows of tall pillars down the length of the hall, low walls between. */
const colonnade: ArenaLayout = {
  id: 'colonnade',
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 15, yaw: 0 },
  doors: twoDoors(-18.6),
  enemySpawns: [
    { x: -15, z: -15 },
    { x: 15, z: -15 },
    { x: -15, z: -5 },
    { x: 15, z: -5 },
    { x: -15, z: 6 },
    { x: 15, z: 6 },
    { x: 0, z: -15 },
    { x: -10, z: -17 },
    { x: 10, z: -17 },
  ],
  boxes: [
    ...mirrored([pillar(6, -12, 5), pillar(6, -6, 5), pillar(6, 0, 3), pillar(6, 6, 5)]),
    lowWall(0, -3, 4),
    lowWall(-12, 3, 3, Math.PI / 2),
    lowWall(12, -9, 3, Math.PI / 2),
    rubble(2.5, 8, 0.8, 0.5, 0.7, 0.6),
  ],
};

/** Four heavy blocks around an open cross of lanes. */
const crossroads: ArenaLayout = {
  id: 'crossroads',
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 15, yaw: 0 },
  doors: twoDoors(-18.6),
  enemySpawns: [
    { x: -16, z: -16 },
    { x: 16, z: -16 },
    { x: 0, z: -15 },
    { x: -16, z: -1 },
    { x: 16, z: -1 },
    { x: -16, z: 12 },
    { x: 16, z: 12 },
    { x: -3, z: -10 },
    { x: 3, z: -10 },
  ],
  boxes: [
    ...mirrored([
      { x: 8, y: 0, z: -7, size: [5, 2.6, 5], kind: 'wall' },
      { x: 8, y: 0, z: 6, size: [5, 2.6, 5], kind: 'wall' },
      lowWall(14, -1, 4, Math.PI / 2),
    ]),
    lowWall(0, -1, 3),
    rubble(-2, 9, 0.9, 0.5, 0.8, 0.3),
  ],
};

/** A ring of pillars around a raised dais, cover on the flanks. */
const ring: ArenaLayout = {
  id: 'ring',
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 15, yaw: 0 },
  doors: twoDoors(-18.6),
  enemySpawns: [
    { x: -16, z: -16 },
    { x: 16, z: -16 },
    { x: 0, z: -15 },
    { x: -17, z: 0 },
    { x: 17, z: 0 },
    { x: -16, z: 12 },
    { x: 16, z: 12 },
  ],
  boxes: [
    ...Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      return pillar(Math.sin(a) * 8, -2 + Math.cos(a) * 8, k % 3 === 0 ? 2.2 : 4);
    }),
    { x: 0, y: 0, z: -2, size: [5, 0.3, 5], kind: 'trim' },
    ...mirrored([lowWall(14, -10, 3.5, 0.5), lowWall(14, 8, 3, -0.5)]),
  ],
};

/** Long low walls split the hall into lanes; tall stones on the sides. */
const trench: ArenaLayout = {
  id: 'trench',
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 15, yaw: 0 },
  doors: twoDoors(-18.6),
  enemySpawns: [
    { x: -16, z: -16 },
    { x: 16, z: -16 },
    { x: 0, z: -11 },
    { x: -16, z: -2 },
    { x: 16, z: -2 },
    { x: -16, z: 12 },
    { x: 16, z: 12 },
    { x: -8, z: -17 },
    { x: 8, z: -17 },
  ],
  boxes: [
    ...mirrored([
      { x: 4, y: 0, z: -3, size: [0.6, 1.1, 13], kind: 'cover' },
      pillar(11, -8, 3.5, 2),
      pillar(11, 6, 3.5, 2),
    ]),
    lowWall(0, -15, 4),
  ],
};

/** Scattered rubble and a few standing stones: lots of low cover, no lanes. */
const rubbleField: ArenaLayout = {
  id: 'rubble',
  halfSize: 20,
  wallHeight: 4,
  spawn: { x: 0, z: 15, yaw: 0 },
  doors: twoDoors(-18.6),
  enemySpawns: [
    { x: -16, z: -16 },
    { x: 16, z: -16 },
    { x: 0, z: -16 },
    { x: -16, z: -4 },
    { x: 16, z: -4 },
    { x: -16, z: 10 },
    { x: 16, z: 10 },
    { x: -6, z: -12 },
    { x: 7, z: -11 },
  ],
  boxes: [
    rubble(-9, -6, 1.4, 0.8, 1.1, 0.4),
    rubble(-4, -9, 1.0, 0.6, 0.9, -0.3),
    rubble(3, -6, 1.6, 0.9, 1.0, 0.8),
    rubble(9, -9, 1.2, 0.7, 1.2, 0.1),
    rubble(-11, 3, 1.3, 0.8, 1.0, -0.6),
    rubble(-3, 2, 0.9, 0.5, 0.9, 0.2),
    rubble(5, 4, 1.5, 0.9, 1.1, -0.4),
    rubble(11, 1, 1.0, 0.6, 1.0, 0.9),
    rubble(-6, 10, 1.1, 0.7, 0.8, 0.5),
    rubble(7, 10, 0.9, 0.5, 0.9, -0.2),
    pillar(-13, -11, 3.2, 1.6),
    pillar(0, -2, 3.8, 1.4),
    pillar(13, -4, 2.6, 1.6),
  ],
};

/** A calm, small courtyard: no enemies, the reward waits in the middle. */
const grace: ArenaLayout = {
  id: 'grace',
  halfSize: 12,
  wallHeight: 3.5,
  // 6 m from the back wall so the shoulder camera (4.2 m behind) stays in the room.
  spawn: { x: 0, z: 6, yaw: 0 },
  doors: [
    { x: -3.5, z: -10.6 },
    { x: 3.5, z: -10.6 },
  ],
  enemySpawns: [],
  rewardAt: { x: 0, z: -2 },
  boxes: [
    ...mirrored([pillar(7, -6, 2.4), pillar(7, 4, 3.4), rubble(5, -1, 0.8, 0.5, 0.7, 0.5)]),
    { x: 0, y: 0, z: -2, size: [4, 0.2, 4], kind: 'trim' },
  ],
};

/** A wide hall with four heavy pillars, for the elite fight. */
const gateHall: ArenaLayout = {
  id: 'gate-hall',
  halfSize: 20,
  wallHeight: 5,
  spawn: { x: 0, z: 15, yaw: 0 },
  doors: twoDoors(-18.6),
  enemySpawns: [
    { x: 0, z: -12 },
    { x: -14, z: -14 },
    { x: 14, z: -14 },
    { x: -16, z: 0 },
    { x: 16, z: 0 },
    { x: -14, z: 10 },
    { x: 14, z: 10 },
  ],
  boxes: mirrored([pillar(8, -6, 6, 2), pillar(8, 6, 6, 2)]),
};

/** The open arena where the boss waits. */
const starfall: ArenaLayout = {
  id: 'starfall',
  halfSize: 24,
  wallHeight: 5,
  spawn: { x: 0, z: 19, yaw: 0 },
  doors: [{ x: 0, z: -22.6 }],
  enemySpawns: [
    { x: 0, z: -14 },
    { x: -16, z: -16 },
    { x: 16, z: -16 },
    { x: -19, z: 0 },
    { x: 19, z: 0 },
    { x: -16, z: 14 },
    { x: 16, z: 14 },
  ],
  boxes: mirrored([pillar(14, -14, 3, 1.8), pillar(14, 14, 2, 1.8)]),
};

/** The hub between runs: a quiet ruined hall with the three stations. */
const kindledHall: ArenaLayout = {
  id: 'kindled-hall',
  halfSize: 12,
  wallHeight: 4.5,
  spawn: { x: 0, z: 6, yaw: 0 },
  doors: [],
  enemySpawns: [],
  stations: [
    { kind: 'grace', x: 0, z: -6 },
    { kind: 'altar', x: -6, z: -1.5 },
    { kind: 'rack', x: 6, z: -1.5 },
  ],
  boxes: [
    ...mirrored([pillar(9, -9, 4.5), pillar(9, 3, 4.5), pillar(4, -10, 2.4)]),
    { x: 0, y: 0, z: -6, size: [5, 0.2, 5], kind: 'trim' },
  ],
};

export const ARENAS: Record<string, ArenaLayout> = Object.fromEntries(
  [
    grayboxArena,
    colonnade,
    crossroads,
    ring,
    trench,
    rubbleField,
    grace,
    gateHall,
    starfall,
    kindledHall,
  ].map((a) => [a.id, a]),
);

/** Layouts combat rooms draw from. */
export const COMBAT_LAYOUTS = [
  'courtyard',
  'colonnade',
  'crossroads',
  'ring',
  'trench',
  'rubble',
] as const;
export const GRACE_LAYOUT = 'grace';
export const HALL_LAYOUT = 'kindled-hall';
export const ELITE_LAYOUT = 'gate-hall';
export const BOSS_LAYOUT = 'starfall';
