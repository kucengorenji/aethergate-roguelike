import { describe, expect, it } from 'vitest';
import { defaultSave, migrate, SAVE_VERSION } from './data';

describe('migrate', () => {
  it('gives defaults for nothing or garbage', () => {
    expect(migrate(undefined)).toEqual(defaultSave());
    expect(migrate('broken')).toEqual(defaultSave());
    expect(migrate([1, 2])).toEqual(defaultSave());
  });

  it('keeps valid fields and repairs damaged ones', () => {
    const save = migrate({
      version: 1,
      shards: 120.7,
      upgrades: { vigor: 2, junk: 'x', zero: 0 },
      staffs: ['lance', 7],
      staff: 'scatter',
      settings: { sensitivity: 5, volume: 0.4, quality: 'ultra' },
      stats: { runs: 3, wins: 'many', bestTime: -2 },
    })!;
    expect(save.shards).toBe(120);
    expect(save.upgrades).toEqual({ vigor: 2 });
    expect(save.staffs).toEqual(['glint', 'lance']);
    expect(save.staff).toBe('glint');
    expect(save.settings).toEqual({ sensitivity: 0.01, volume: 0.4, quality: 'high' });
    expect(save.stats).toEqual({ runs: 3, wins: 0, bestTime: null });
  });

  it('fills fields an older record never had', () => {
    const save = migrate({ shards: 40 })!;
    expect(save.shards).toBe(40);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.settings).toEqual(defaultSave().settings);
  });

  it('refuses a record from a newer version', () => {
    expect(migrate({ version: SAVE_VERSION + 1, shards: 999 })).toBeNull();
  });
});
