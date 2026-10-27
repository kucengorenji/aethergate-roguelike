import { config } from '../config';
import type { SaveData } from '../save/data';

/** How a staff's primary bolts behave. Damage is per bolt. */
export interface StaffDef {
  id: string;
  name: string;
  text: string;
  /** Lumen shards to unlock; 0 for the starting staff. */
  cost: number;
  interval: number;
  damage: number;
  focusCost: number;
  speed: number;
  radius: number;
  /** Bolts per cast, fanned out over `spread` radians in total. */
  count: number;
  spread: number;
  /** Enemies a bolt passes through before it stops. */
  pierce: number;
}

export const STAFFS: readonly StaffDef[] = [
  {
    id: 'glint',
    name: 'Glint Staff',
    text: 'Quick bolts.',
    cost: 0,
    // The starting staff reads the bolt tunables, so the debug panel still tunes it live.
    get interval() {
      return config.bolt.interval;
    },
    get damage() {
      return config.bolt.damage;
    },
    get focusCost() {
      return config.bolt.cost;
    },
    get speed() {
      return config.bolt.speed;
    },
    get radius() {
      return config.bolt.radius;
    },
    count: 1,
    spread: 0,
    pierce: 0,
  },
  {
    id: 'lance',
    name: 'Lance Staff',
    text: 'Slow, heavy bolts that pierce up to two enemies.',
    cost: 80,
    interval: 0.42,
    damage: 18,
    focusCost: 9,
    speed: 60,
    radius: 0.1,
    count: 1,
    spread: 0,
    pierce: 2,
  },
  {
    id: 'scatter',
    name: 'Scatter Staff',
    text: 'Three lighter bolts in a fan.',
    cost: 80,
    interval: 0.32,
    damage: 6,
    focusCost: 8,
    speed: 34,
    radius: 0.1,
    count: 3,
    spread: 0.18,
    pierce: 0,
  },
];

export const STAFF_BY_ID: Record<string, StaffDef> = Object.fromEntries(
  STAFFS.map((s) => [s.id, s]),
);

/** Unlocks a staff if affordable and not owned. Returns whether it was unlocked. */
export function unlockStaff(save: SaveData, id: string): boolean {
  const staff = STAFF_BY_ID[id];
  if (!staff || save.staffs.includes(id) || save.shards < staff.cost) return false;
  save.shards -= staff.cost;
  save.staffs.push(id);
  return true;
}

export function equipStaff(save: SaveData, id: string): boolean {
  if (!save.staffs.includes(id)) return false;
  save.staff = id;
  return true;
}
