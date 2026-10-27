import { Rng } from '@engine/rng';
import { describe, expect, it } from 'vitest';
import { BOON_BY_ID, grant, type Held } from './data';
import { offerBoons } from './offer';

const empty = (): Held => ({ duos: [] });

describe('offerBoons', () => {
  it('offers three different blessings of one demigod', () => {
    const ids = offerBoons(new Rng(1), empty(), 'moon');
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(BOON_BY_ID[id]!.god).toBe('moon');
  });

  it('prefers empty slots and skips held blessings', () => {
    const held = empty();
    grant(held, 'moonlit-bolts');
    for (let seed = 0; seed < 20; seed++) {
      const ids = offerBoons(new Rng(seed), held, 'moon');
      expect(ids).not.toContain('moonlit-bolts');
      expect(ids.map((id) => BOON_BY_ID[id]!.slot).sort()).toEqual(['dodge', 'passive', 'skill']);
    }
  });

  it('adds a duo once both demigods are held', () => {
    const held = empty();
    grant(held, 'cold-heart');
    expect(offerBoons(new Rng(3), held, 'star')).not.toContain('shatter');
    grant(held, 'starfall-bolts');
    const ids = offerBoons(new Rng(3), held, 'star');
    expect(ids).toContain('shatter');
    expect(ids).toHaveLength(3);
  });

  it('is deterministic per RNG state', () => {
    expect(offerBoons(new Rng(9), empty(), 'rot')).toEqual(offerBoons(new Rng(9), empty(), 'rot'));
  });
});

describe('grant', () => {
  it('replaces the blessing in the same slot', () => {
    const held = empty();
    grant(held, 'moonlit-bolts');
    grant(held, 'arc-bolts');
    expect(held.primary).toBe('arc-bolts');
  });
});
