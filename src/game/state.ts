import { ProjectilePool } from './combat/projectiles';

export type Phase = 'playing' | 'dead';
export type Mode = 'encounter' | 'training' | 'sandbox';
export type EncounterStatus = 'off' | 'waiting' | 'active' | 'intermission' | 'cleared';

export interface DamageNumber {
  x: number;
  y: number;
  z: number;
  value: number;
  age: number;
}

export interface Impact {
  x: number;
  y: number;
  z: number;
  age: number;
  /** 0 bolt, 1 orb: picks color and size. */
  kind: number;
}

export interface GameState {
  phase: Phase;
  mode: Mode;
  encounter: {
    status: EncounterStatus;
    /** Index of the current (or next) wave. */
    wave: number;
    total: number;
    /** Seconds in the current status. */
    timer: number;
  };
  /** Seconds of play since the last reset. */
  elapsed: number;
  projectiles: ProjectilePool;
  impacts: Impact[];
  damageNumbers: DamageNumber[];
  feedback: {
    /** Fixed steps of hitstop left. */
    hitstop: number;
    /** Upward camera kick from casting, radians, decays to 0. */
    kick: number;
    /** Camera shake strength from taking damage, decays to 0. */
    shake: number;
    /** Screen-edge hurt flash, 1 right after a hit, decays to 0. */
    hurt: number;
  };
  /** Counters for tests and tuning. */
  stats: { casts: number; hits: number };
}

export function createState(mode: Mode = 'encounter', waves = 0): GameState {
  return {
    phase: 'playing',
    mode,
    encounter: {
      status: mode === 'encounter' ? 'waiting' : 'off',
      wave: 0,
      total: waves,
      timer: 0,
    },
    elapsed: 0,
    projectiles: new ProjectilePool(256),
    impacts: [],
    damageNumbers: [],
    feedback: { hitstop: 0, kick: 0, shake: 0, hurt: 0 },
    stats: { casts: 0, hits: 0 },
  };
}
