import type { Element } from '../components';

export type God = 'moon' | 'star' | 'rot' | 'storm';
export type Slot = 'primary' | 'skill' | 'dodge' | 'passive' | 'duo';

export const GODS: Record<God, { name: string; element: Element; color: number }> = {
  moon: { name: 'The Veiled Moon Queen', element: 'frost', color: 0x8fd3ff },
  star: { name: 'The Starfall General', element: 'gravity', color: 0xb48cff },
  rot: { name: 'The Rot Saint', element: 'rot', color: 0x9bc53d },
  storm: { name: 'The Storm Warden', element: 'storm', color: 0xffe066 },
};

export const GOD_ORDER: readonly God[] = ['moon', 'star', 'rot', 'storm'];

export interface BoonDef {
  id: string;
  name: string;
  god: God;
  slot: Slot;
  text: string;
  /** Duo blessings: the two demigods the player must already hold blessings from. */
  requires?: readonly [God, God];
}

/** Every blessing. The order is stable: tests and debug tools refer to boons by index. */
export const BOONS: readonly BoonDef[] = [
  {
    id: 'moonlit-bolts',
    name: 'Moonlit Bolts',
    god: 'moon',
    slot: 'primary',
    text: 'Bolts Chill.',
  },
  {
    id: 'rime-comet',
    name: 'Rime Comet',
    god: 'moon',
    slot: 'skill',
    text: 'The comet burst adds 2 Chill.',
  },
  {
    id: 'pale-step',
    name: 'Pale Step',
    god: 'moon',
    slot: 'dodge',
    text: 'Rolling releases a frost nova that Chills within 2.5 m.',
  },
  {
    id: 'cold-heart',
    name: 'Cold Heart',
    god: 'moon',
    slot: 'passive',
    text: '+25% damage to chilled enemies.',
  },
  {
    id: 'starfall-bolts',
    name: 'Starfall Bolts',
    god: 'star',
    slot: 'primary',
    text: 'Bolts add Weight. The third Weight crushes for 25.',
  },
  {
    id: 'collapsing-comet',
    name: 'Collapsing Comet',
    god: 'star',
    slot: 'skill',
    text: 'The burst first pulls enemies within 6 m inward.',
  },
  {
    id: 'meteor-step',
    name: 'Meteor Step',
    god: 'star',
    slot: 'dodge',
    text: 'Ending a roll slams 2.5 m for 15 and adds Weight.',
  },
  {
    id: 'starbound-staff',
    name: 'Starbound Staff',
    god: 'star',
    slot: 'passive',
    text: 'Bashes crush at once.',
  },
  {
    id: 'blighted-bolts',
    name: 'Blighted Bolts',
    god: 'rot',
    slot: 'primary',
    text: 'Bolts add Rot: 3 damage per second per stack.',
  },
  {
    id: 'blight-comet',
    name: 'Blight Comet',
    god: 'rot',
    slot: 'skill',
    text: 'The comet burst adds 3 Rot.',
  },
  {
    id: 'spore-step',
    name: 'Spore Step',
    god: 'rot',
    slot: 'dodge',
    text: 'Ending a roll adds 2 Rot within 2.5 m.',
  },
  {
    id: 'fester',
    name: 'Fester',
    god: 'rot',
    slot: 'passive',
    text: 'Rot deals 60% more and stacks to 8.',
  },
  {
    id: 'arc-bolts',
    name: 'Arc Bolts',
    god: 'storm',
    slot: 'primary',
    text: 'Bolts arc to 1 enemy within 5 m for 50%.',
  },
  {
    id: 'thunder-comet',
    name: 'Thunder Comet',
    god: 'storm',
    slot: 'skill',
    text: 'The burst also strikes up to 3 enemies within 8 m for 20.',
  },
  {
    id: 'static-step',
    name: 'Static Step',
    god: 'storm',
    slot: 'dodge',
    text: 'Starting a roll strikes the nearest enemy within 7 m for 15.',
  },
  {
    id: 'thunderhead',
    name: 'Thunderhead',
    god: 'storm',
    slot: 'passive',
    text: 'Every 5th bolt arcs to 3 enemies.',
  },
  {
    id: 'shatter',
    name: 'Shatter',
    god: 'moon',
    slot: 'duo',
    text: 'Crushing a chilled enemy deals double.',
    requires: ['moon', 'star'],
  },
  {
    id: 'plague-storm',
    name: 'Plague Storm',
    god: 'rot',
    slot: 'duo',
    text: 'Arcs carry 2 Rot.',
    requires: ['rot', 'storm'],
  },
];

export const BOON_BY_ID: Record<string, BoonDef> = Object.fromEntries(BOONS.map((b) => [b.id, b]));

/** What the player holds: one blessing per slot, any number of duos. */
export interface Held {
  primary?: string;
  skill?: string;
  dodge?: string;
  passive?: string;
  duos: string[];
}

export function holds(held: Held, id: string): boolean {
  const b = BOON_BY_ID[id];
  if (!b) return false;
  return b.slot === 'duo' ? held.duos.includes(id) : held[b.slot] === id;
}

/** Puts a blessing in its slot, replacing whatever was there. */
export function grant(held: Held, id: string): void {
  const b = BOON_BY_ID[id];
  if (!b) throw new Error(`Unknown boon "${id}"`);
  if (b.slot === 'duo') {
    if (!held.duos.includes(id)) held.duos.push(id);
  } else {
    held[b.slot] = id;
  }
}

/** Demigods the player holds at least one blessing from. */
export function heldGods(held: Held): Set<God> {
  const ids = [held.primary, held.skill, held.dodge, held.passive, ...held.duos];
  return new Set(ids.flatMap((id) => (id ? [BOON_BY_ID[id]!.god] : [])));
}
