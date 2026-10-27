import type { ArenaLayout } from './arenas/types';
import { defaultSave, type SaveData } from './save/data';
import { grayboxArena } from './arenas/graybox';
import { ProjectilePool } from './combat/projectiles';
import type { RunPlan, Wave } from './run/plan';
import type { Reward } from './run/rewards';
import type { God } from './boons/data';

export type Phase = 'playing' | 'dead';
/** Full-screen menus that take over input. */
export type Panel = 'title' | 'pause' | 'settings' | 'shop' | 'staffs';
/**
 * `hub` is the full game: the Kindled Hall between runs. `run` plays runs back
 * to back without the hall (tests). The others are single-room test arenas.
 */
export type Mode = 'hub' | 'run' | 'encounter' | 'training' | 'sandbox';
export type RunStatus = 'fighting' | 'reward' | 'choosing' | 'transition' | 'complete';
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
  /** The room the player is in. */
  layout: ArenaLayout;
  run: {
    /** True during a run; false in the hall and in single-room modes. */
    active: boolean;
    plan: RunPlan | null;
    /** Index of the current room in the plan. */
    index: number;
    status: RunStatus;
    /** Seconds in the current status. */
    timer: number;
    /** What the current room grants when cleared (null for the boss). */
    reward: Reward | null;
    /** Door picked during a transition. */
    chosen: number;
    /** Whether the next room was loaded during the current transition. */
    loaded: boolean;
    boons: number;
    shards: number;
    /** Seconds since the run started. */
    time: number;
  };
  /** Persistent progress and settings (spec 0011). */
  save: SaveData;
  /** The open menu panel, if any; the player cannot act while one is open. */
  panel: Panel | null;
  /** An open blessing choice: the demigod and the boon ids on its cards. */
  choice: { god: God; options: string[] } | null;
  /** Lightning arcs being drawn, with their age in seconds. */
  arcs: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; age: number }[];
  /** Boss hazards: meteor markers counting down to impact. */
  hazards: { x: number; z: number; radius: number; time: number; damage: number }[];
  /** Phase 3 burning ring: the safe radius around the arena center, or null. */
  burnRing: number | null;
  /** Seconds until the burning ring hurts again. */
  burnTick: number;
  /** Velocity pulling the player this step (gravity well), consumed by locomotion. */
  pull: { x: number; z: number };
  /** Comet bursts waiting for their pull to finish (Collapsing Comet). */
  pendingBursts: { x: number; y: number; z: number; time: number }[];
  /** A short message on screen (rewards), with its age in seconds. */
  message: { text: string; age: number } | null;
  encounter: {
    status: EncounterStatus;
    waves: Wave[];
    /** Seconds after the pointer lock (first room) or the fade-in before wave 1. */
    startDelay: number;
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

/** True while the player cannot act: dead, choosing a blessing, or in a menu. */
export function controlsLocked(state: GameState): boolean {
  return state.phase !== 'playing' || state.choice !== null || state.panel !== null;
}

export function createState(mode: Mode = 'run', waves: Wave[] = [], startDelay = 2): GameState {
  return {
    phase: 'playing',
    mode,
    layout: grayboxArena,
    run: {
      active: false,
      plan: null,
      index: 0,
      status: 'fighting',
      timer: 0,
      reward: null,
      chosen: 0,
      loaded: false,
      boons: 0,
      shards: 0,
      time: 0,
    },
    message: null,
    save: defaultSave(),
    panel: null,
    choice: null,
    arcs: [],
    pendingBursts: [],
    hazards: [],
    burnRing: null,
    burnTick: 0,
    pull: { x: 0, z: 0 },
    encounter: {
      status: mode === 'encounter' ? 'waiting' : 'off',
      waves,
      startDelay,
      wave: 0,
      total: waves.length,
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
