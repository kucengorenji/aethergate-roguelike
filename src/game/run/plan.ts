import { Rng } from '@engine/rng';
import { BOSS_LAYOUT, COMBAT_LAYOUTS, ELITE_LAYOUT, GRACE_LAYOUT } from '../arenas/layouts';
import type { EnemyKind } from '../components';
import { config } from '../config';
import type { Offer, Reward } from './rewards';

export type RoomKind = 'combat' | 'grace' | 'elite' | 'boss';
export type Wave = Partial<Record<EnemyKind, number>>;

export interface RoomPlan {
  kind: RoomKind;
  layout: string;
  waves: Wave[];
}

export interface RunPlan {
  seed: number;
  rooms: RoomPlan[];
  /** What the doors offer after room i (leading to room i + 1). Empty after the last room. */
  offers: Offer[][];
}

/** The fixed shape of a run; layouts, waves and offers vary with the seed. */
export const RUN_SHAPE: readonly RoomKind[] = [
  'combat',
  'combat',
  'grace',
  'combat',
  'elite',
  'combat',
  'grace',
  'boss',
];

/** The reward of the first room, which no door leads to. */
export const FIRST_REWARD: Reward = 'boon';

/** Builds a whole run from a seed. Pure: the same seed always gives the same run. */
export function planRun(seed: number): RunPlan {
  const rng = new Rng(seed);
  let lastCombat = '';
  const rooms = RUN_SHAPE.map((kind, depth): RoomPlan => {
    switch (kind) {
      case 'combat': {
        const choices = COMBAT_LAYOUTS.filter((id) => id !== lastCombat);
        lastCombat = rng.pick(choices);
        return { kind, layout: lastCombat, waves: combatWaves(rng, depth) };
      }
      case 'grace':
        return { kind, layout: GRACE_LAYOUT, waves: [] };
      case 'elite':
        return { kind, layout: ELITE_LAYOUT, waves: config.run.eliteWaves };
      case 'boss':
        return { kind, layout: BOSS_LAYOUT, waves: config.run.bossWaves };
    }
  });
  const offers = rooms.map((_, i): Offer[] => {
    if (i === rooms.length - 1) return [];
    if (rooms[i + 1]!.kind === 'boss') return ['boss'];
    const first = rng.pick(config.run.rewardPool);
    const rest = config.run.rewardPool.filter((r) => r !== first);
    return [first, rng.pick(rest)];
  });
  return { seed, rooms, offers };
}

const COST: Record<EnemyKind, number> = {
  soldier: 1,
  hound: 1,
  caster: 1.5,
  knight: 3,
  captain: 10,
  starfallen: 30,
};

/** Fills each wave's budget with random enemies; knights only from depth 3, casters capped. */
function combatWaves(rng: Rng, depth: number): Wave[] {
  const { baseBudget, budgetPerDepth } = config.run;
  const count = depth < 3 ? 2 : 3;
  return Array.from({ length: count }, (_, w) => {
    let budget = baseBudget + depth * budgetPerDepth + w;
    const wave: Wave = {};
    const kinds: EnemyKind[] =
      depth >= 3
        ? ['soldier', 'soldier', 'hound', 'caster', 'knight']
        : ['soldier', 'soldier', 'hound', 'caster'];
    while (budget >= 1) {
      const affordable = kinds.filter(
        (k) =>
          COST[k] <= budget &&
          !(k === 'caster' && (wave.caster ?? 0) >= 2) &&
          !(k === 'knight' && (wave.knight ?? 0) >= 1),
      );
      if (affordable.length === 0) break;
      const kind = rng.pick(affordable);
      wave[kind] = (wave[kind] ?? 0) + 1;
      budget -= COST[kind];
    }
    return wave;
  });
}

/** Total enemy cost of a wave, for tests and tuning. */
export function waveCost(wave: Wave): number {
  return Object.entries(wave).reduce((n, [k, c]) => n + COST[k as EnemyKind] * c, 0);
}
