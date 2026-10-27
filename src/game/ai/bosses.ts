import type { BossMove, EnemyKind } from '../components';
import { config } from '../config';

export const BOSS_KINDS: readonly EnemyKind[] = ['captain', 'starfallen'];
export const isBoss = (kind: EnemyKind): boolean => BOSS_KINDS.includes(kind);

/** Phase from remaining health: the Captain has 2 phases, the Starfallen Knight 3. */
export function phaseFor(kind: EnemyKind, healthFraction: number): number {
  if (kind === 'captain') return healthFraction <= 0.5 ? 2 : 1;
  if (kind === 'starfallen') return healthFraction <= 1 / 3 ? 3 : healthFraction <= 2 / 3 ? 2 : 1;
  return 1;
}

const STARFALL_CYCLES: Record<number, readonly BossMove[]> = {
  1: ['sweep', 'well'],
  2: ['sweep', 'meteors', 'well', 'meteors'],
  3: ['sweep', 'well', 'meteors'],
};

/**
 * The next attack for a boss in `chase`, or null to keep closing in. Melee moves
 * wait for reach; the Starfallen Knight's ranged moves start from anywhere.
 */
export function chooseMove(
  kind: EnemyKind,
  dist: number,
  phase: number,
  pattern: number,
): BossMove | null {
  if (kind === 'captain') {
    const c = config.enemies.captain;
    if (dist <= c.reach) return 'slam';
    if (dist >= c.chargeFrom && pattern % 2 === 0) return 'charge';
    return null;
  }
  const cycle = STARFALL_CYCLES[phase] ?? STARFALL_CYCLES[1]!;
  const move = cycle[pattern % cycle.length]!;
  if (move === 'sweep' && dist > config.enemies.starfallen.reach) return null;
  return move;
}

/** Wind-up seconds of a boss move, shortened in later phases. */
export function bossWindup(kind: EnemyKind, move: BossMove, phase: number): number {
  if (kind === 'captain') {
    const c = config.enemies.captain;
    const base = move === 'charge' ? c.chargeWindup : c.windup;
    return base * (phase >= 2 ? c.phase2Windup : 1);
  }
  const s = config.enemies.starfallen;
  const base = move === 'well' ? s.wellWindup : move === 'meteors' ? s.meteorWindup : s.windup;
  return base * (phase >= 3 ? s.phase3Windup : 1);
}

/** Seconds a boss move's attack lasts (charges and the gravity well last a while). */
export function bossAttackTime(kind: EnemyKind, move: BossMove): number {
  if (kind === 'captain')
    return move === 'charge' ? config.enemies.captain.chargeTime : config.enemies.captain.attack;
  return move === 'well' ? config.enemies.starfallen.wellTime : config.enemies.starfallen.attack;
}

/** Radius of the safe area in phase 3, closing linearly. */
export function ringRadius(secondsInPhase: number): number {
  const { ringStart, ringEnd, ringSeconds } = config.enemies.starfallen;
  const t = Math.min(1, Math.max(0, secondsInPhase / ringSeconds));
  return ringStart + (ringEnd - ringStart) * t;
}
