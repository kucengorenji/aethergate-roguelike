import type { SaveData } from '../save/data';

export interface UpgradeDef {
  id: string;
  name: string;
  /** What one level does, for the altar panel. */
  text: string;
  /** Cost of each level in Lumen shards; the length is the max level. */
  costs: readonly number[];
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'vigor', name: 'Vigor', text: '+15 max health', costs: [30, 60, 100] },
  { id: 'focus', name: 'Deep Focus', text: '+15 max focus', costs: [30, 60, 100] },
  { id: 'flasks', name: 'Flask Bearer', text: '+1 flask', costs: [60, 120] },
  { id: 'ember', name: 'Ember Bolts', text: '+2 bolt damage', costs: [40, 80, 120] },
  { id: 'ash', name: 'Swift Ash', text: 'Comet recharges 0.75 s faster', costs: [50, 100] },
  { id: 'step', name: 'Steady Step', text: '+0.08 s roll invulnerability', costs: [40, 90] },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

export function level(save: SaveData, id: string): number {
  return save.upgrades[id] ?? 0;
}

/** Shards the next level costs, or null at the max level. */
export function nextCost(save: SaveData, id: string): number | null {
  return UPGRADE_BY_ID[id]?.costs[level(save, id)] ?? null;
}

export function canBuy(save: SaveData, id: string): boolean {
  const cost = nextCost(save, id);
  return cost !== null && save.shards >= cost;
}

/** Buys the next level if affordable. Returns whether it was bought. */
export function buy(save: SaveData, id: string): boolean {
  const cost = nextCost(save, id);
  if (cost === null || save.shards < cost) return false;
  save.shards -= cost;
  save.upgrades[id] = level(save, id) + 1;
  return true;
}

/** What the player starts a run with, from base values and bought levels. */
export interface Loadout {
  maxHealth: number;
  maxFocus: number;
  flasks: number;
  boltBonus: number;
  cometCooldown: number;
  iframeBonus: number;
  staff: string;
}

export function loadout(
  save: SaveData,
  base: { health: number; focus: number; flasks: number; cometCooldown: number },
): Loadout {
  return {
    maxHealth: base.health + 15 * level(save, 'vigor'),
    maxFocus: base.focus + 15 * level(save, 'focus'),
    flasks: base.flasks + level(save, 'flasks'),
    boltBonus: 2 * level(save, 'ember'),
    cometCooldown: base.cometCooldown - 0.75 * level(save, 'ash'),
    iframeBonus: 0.08 * level(save, 'step'),
    staff: save.staffs.includes(save.staff) ? save.staff : 'glint',
  };
}
