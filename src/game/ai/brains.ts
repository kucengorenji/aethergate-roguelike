import type { BossMove, EnemyKind, EnemyState } from '../components';
import { bossAttackTime, bossWindup, chooseMove, isBoss } from './bosses';
import { config } from '../config';

/** What an enemy's brain sees this step. Distances in meters, directions unit and horizontal. */
export interface View {
  kind: EnemyKind;
  state: EnemyState;
  time: number;
  cooldown: number;
  side: 1 | -1;
  /** Distance to the player and the unit direction toward them. */
  dist: number;
  dirX: number;
  dirZ: number;
  /** False while the player is dead: enemies stop attacking. */
  playerAlive: boolean;
  /** Bosses only: the current move, phase and pattern counter. */
  move?: BossMove | null;
  phase?: number;
  pattern?: number;
}

export interface Decision {
  /** Next state; equal to `view.state` when nothing changes. */
  state: EnemyState;
  /** Desired horizontal velocity, m/s. */
  wantX: number;
  wantZ: number;
  /** Whether to keep turning toward the player (false keeps the locked aim). */
  track: boolean;
  /** Bosses only: the move chosen when a wind-up starts. */
  move?: BossMove;
}

/** How long each timed state lasts for a kind (bosses: for their current move and phase). */
export function stateDuration(
  kind: EnemyKind,
  state: EnemyState,
  move: BossMove | null = null,
  phase = 1,
): number {
  const k = config.enemies[kind];
  if (move && state === 'windup') return bossWindup(kind, move, phase);
  if (move && state === 'attack') return bossAttackTime(kind, move);
  switch (state) {
    case 'rising':
      return config.enemy.riseSeconds;
    case 'windup':
      return k.windup;
    case 'attack':
      return k.attack;
    case 'recover':
      return k.recover;
    case 'stagger':
      return config.enemy.staggerSeconds;
    case 'dying':
      return config.enemy.dyingSeconds;
    case 'chase':
      return Infinity;
  }
}

const STILL = { wantX: 0, wantZ: 0 };

/**
 * The per-kind state machine. Timed states advance on their own; `chase`
 * decides movement and when to start a wind-up. Pure, so it is unit-tested.
 */
export function think(v: View): Decision {
  const timed = v.state !== 'chase' && v.state !== 'dying';
  if (timed && v.time >= stateDuration(v.kind, v.state, v.move ?? null, v.phase)) {
    const next: EnemyState =
      v.state === 'windup' ? 'attack' : v.state === 'attack' ? 'recover' : 'chase';
    return { state: next, ...STILL, track: next === 'chase' };
  }
  if (v.state !== 'chase') return { state: v.state, ...STILL, track: v.state === 'rising' };
  if (!v.playerAlive) return { state: 'chase', ...STILL, track: false };

  if (isBoss(v.kind)) {
    const move = chooseMove(v.kind, v.dist, v.phase ?? 1, v.pattern ?? 0);
    if (move) return { state: 'windup', ...STILL, track: false, move };
    const { speed } = config.enemies[v.kind];
    return { state: 'chase', wantX: v.dirX * speed, wantZ: v.dirZ * speed, track: true };
  }

  switch (v.kind) {
    case 'captain':
    case 'starfallen':
      return { state: 'chase', ...STILL, track: true };
    case 'soldier':
    case 'knight': {
      const { speed, reach } = config.enemies[v.kind];
      if (v.dist <= reach) return { state: 'windup', ...STILL, track: false };
      return { state: 'chase', wantX: v.dirX * speed, wantZ: v.dirZ * speed, track: true };
    }
    case 'caster': {
      const { speed, minRange, maxRange } = config.enemies.caster;
      if (v.cooldown <= 0 && v.dist <= maxRange + 3)
        return { state: 'windup', ...STILL, track: true };
      // Back off when crowded, close in when far, otherwise circle the player.
      const radial = v.dist < minRange ? -1 : v.dist > maxRange ? 1 : 0;
      const tx = -v.dirZ * v.side;
      const tz = v.dirX * v.side;
      const mx = v.dirX * radial + tx * (radial === 0 ? 1 : 0.4);
      const mz = v.dirZ * radial + tz * (radial === 0 ? 1 : 0.4);
      const len = Math.hypot(mx, mz) || 1;
      return { state: 'chase', wantX: (mx / len) * speed, wantZ: (mz / len) * speed, track: true };
    }
    case 'hound': {
      const { speed, flankRadius, reach } = config.enemies.hound;
      if (v.dist <= reach) return { state: 'windup', ...STILL, track: true };
      // Run toward a point beside the player rather than straight at them.
      const sideX = -v.dirZ * v.side * flankRadius;
      const sideZ = v.dirX * v.side * flankRadius;
      const tx = v.dirX * v.dist + sideX;
      const tz = v.dirZ * v.dist + sideZ;
      const len = Math.hypot(tx, tz) || 1;
      return { state: 'chase', wantX: (tx / len) * speed, wantZ: (tz / len) * speed, track: true };
    }
  }
}
