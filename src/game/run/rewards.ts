export type Reward = 'boon' | 'shards' | 'heal' | 'flask';

/** What a door leads to: a room with a reward, or the boss. */
export type Offer = Reward | 'boss';

export const OFFER_INFO: Record<Offer, { label: string; color: number }> = {
  boon: { label: 'Blessing', color: 0xffc857 },
  shards: { label: 'Lumen shards', color: 0x7cc8ff },
  heal: { label: 'Heal', color: 0xe0524a },
  flask: { label: 'Flask charge', color: 0xf0a040 },
  boss: { label: 'The Starfallen Knight', color: 0xb070ff },
};
