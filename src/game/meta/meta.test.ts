import { describe, expect, it } from 'vitest';
import { defaultSave } from '../save/data';
import { bankRun } from './bank';
import { equipStaff, STAFF_BY_ID, STAFFS, unlockStaff } from './staffs';
import { buy, canBuy, loadout, nextCost, UPGRADES } from './upgrades';

const base = { health: 100, focus: 100, flasks: 3, cometCooldown: 6 };

describe('upgrades', () => {
  it('cost more per level and stop at the max', () => {
    const save = { ...defaultSave(), shards: 1000 };
    expect(nextCost(save, 'vigor')).toBe(30);
    expect(buy(save, 'vigor')).toBe(true);
    expect(nextCost(save, 'vigor')).toBe(60);
    buy(save, 'vigor');
    buy(save, 'vigor');
    expect(nextCost(save, 'vigor')).toBeNull();
    expect(buy(save, 'vigor')).toBe(false);
    expect(save.shards).toBe(1000 - 30 - 60 - 100);
  });

  it('cannot be bought without the shards', () => {
    const save = { ...defaultSave(), shards: 29 };
    expect(canBuy(save, 'vigor')).toBe(false);
    expect(buy(save, 'vigor')).toBe(false);
    expect(save.shards).toBe(29);
  });

  it('each change the loadout', () => {
    const plain = loadout(defaultSave(), base);
    const save = defaultSave();
    for (const u of UPGRADES) save.upgrades[u.id] = 1;
    const up = loadout(save, base);
    expect(up.maxHealth).toBe(115);
    expect(up.maxFocus).toBe(115);
    expect(up.flasks).toBe(4);
    expect(up.boltBonus).toBe(2);
    expect(up.cometCooldown).toBe(5.25);
    expect(up.iframeBonus).toBeCloseTo(0.08);
    expect(plain).toMatchObject({ maxHealth: 100, flasks: 3, boltBonus: 0, staff: 'glint' });
  });
});

describe('staffs', () => {
  it('start with the Glint Staff and unlock others for shards', () => {
    const save = { ...defaultSave(), shards: 100 };
    expect(equipStaff(save, 'lance')).toBe(false);
    expect(unlockStaff(save, 'lance')).toBe(true);
    expect(unlockStaff(save, 'lance')).toBe(false);
    expect(save.shards).toBe(20);
    expect(unlockStaff(save, 'scatter')).toBe(false);
    expect(equipStaff(save, 'lance')).toBe(true);
    expect(loadout(save, base).staff).toBe('lance');
  });

  it('trade fire rate for weight', () => {
    const glint = STAFF_BY_ID.glint!;
    const lance = STAFF_BY_ID.lance!;
    const scatter = STAFF_BY_ID.scatter!;
    expect(lance.damage).toBeGreaterThan(glint.damage);
    expect(lance.interval).toBeGreaterThan(glint.interval);
    expect(scatter.count * scatter.damage).toBeGreaterThan(glint.damage);
    expect(STAFFS.every((s) => s.focusCost > 0)).toBe(true);
  });
});

describe('bankRun', () => {
  it('keeps shards from any ending and counts wins and the best time', () => {
    const save = defaultSave();
    bankRun(save, 25, 'death', 300);
    expect(save.shards).toBe(25);
    expect(save.stats).toEqual({ runs: 1, wins: 0, bestTime: null });
    bankRun(save, 125, 'victory', 900);
    bankRun(save, 100, 'victory', 1100);
    expect(save.shards).toBe(250);
    expect(save.stats).toEqual({ runs: 3, wins: 2, bestTime: 900 });
  });
});
