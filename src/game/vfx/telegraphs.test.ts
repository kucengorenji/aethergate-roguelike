import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../config';
import { ImpactKind } from '../state';
import {
  burnDecal,
  DecalList,
  DecalShape,
  enemyDecals,
  impactDecal,
  meteorDecal,
  type EnemyView,
} from './telegraphs';

const STEP = 1 / 60;

function view(e: Partial<EnemyView>): EnemyView {
  return {
    kind: 'soldier',
    state: 'chase',
    time: 0,
    move: null,
    phase: 1,
    aimX: 0,
    aimZ: -1,
    facing: 0,
    ...e,
  };
}

function decals(e: Partial<EnemyView>, weight = 0) {
  const out = new DecalList();
  enemyDecals(view(e), 2, 3, weight, 0xff0000, out);
  return out.list();
}

afterEach(() => {
  config.vfx.telegraphs.minor = true;
});

describe('enemy telegraphs', () => {
  it('a knight slam fills its circle toward the rim, full on the step before the strike', () => {
    const k = config.enemies.knight;
    const [early] = decals({ kind: 'knight', state: 'windup', time: 0.1, aimX: 1, aimZ: 0 });
    expect(early).toMatchObject({ kind: 'slam', shape: DecalShape.Disc, sx: k.slamRadius });
    expect(early!.x).toBeCloseTo(2 + k.slamDistance);
    expect(early!.z).toBeCloseTo(3);
    expect(early!.progress).toBeCloseTo((0.1 + STEP) / k.windup);
    const [last] = decals({ kind: 'knight', state: 'windup', time: k.windup - STEP / 2 });
    expect(last!.progress).toBe(1);
    const [strike] = decals({ kind: 'knight', state: 'attack', time: 0 });
    expect(strike).toMatchObject({ progress: 1, alpha: 1 });
    expect(decals({ kind: 'knight', state: 'attack', time: k.attack })).toEqual([]);
  });

  it('the soldier sword arc and the hound leap are faint and can be turned off', () => {
    const [sword] = decals({ kind: 'soldier', state: 'windup', facing: 1 });
    expect(sword).toMatchObject({ kind: 'sword', shape: DecalShape.Sector, yaw: 1 });
    expect(sword!.param).toBeCloseTo((55 * Math.PI) / 180);
    expect(sword!.alpha).toBe(config.vfx.telegraphs.minorAlpha);
    const h = config.enemies.hound;
    const [leap] = decals({ kind: 'hound', state: 'windup', aimX: 0, aimZ: -1 });
    expect(leap).toMatchObject({ kind: 'leap', shape: DecalShape.Strip });
    // The strip starts at the hound and runs along its aim.
    expect(leap!.z).toBeCloseTo(3 - (h.leapSpeed * h.attack) / 2);
    config.vfx.telegraphs.minor = false;
    expect(decals({ kind: 'soldier', state: 'windup' })).toEqual([]);
  });

  it('the Captain charge path and the sweep cone follow the boss facing', () => {
    const c = config.enemies.captain;
    const [charge] = decals({ kind: 'captain', state: 'windup', move: 'charge', facing: 0 });
    expect(charge).toMatchObject({ kind: 'charge', shape: DecalShape.Strip });
    expect(charge!.sz * 2).toBeCloseTo(c.chargeSpeed * c.chargeTime);
    const s = config.enemies.starfallen;
    const [sweep] = decals({ kind: 'starfallen', state: 'windup', move: 'sweep', facing: 2 });
    expect(sweep).toMatchObject({ kind: 'sweep', shape: DecalShape.Sector, sx: s.sweepRadius });
    expect(sweep!.param).toBeCloseTo((s.sweepArcDegrees * Math.PI) / 360);
  });

  it('the gravity well fills over its wind-up and pull and is full when it detonates', () => {
    const s = config.enemies.starfallen;
    const [windup] = decals({ kind: 'starfallen', state: 'windup', move: 'well', time: 0 });
    expect(windup!.progress).toBeLessThan(0.1);
    const [pull] = decals({ kind: 'starfallen', state: 'attack', move: 'well', time: 0.6 });
    expect(pull!.progress).toBeGreaterThan(0.4);
    expect(pull!.progress).toBeLessThan(1);
    const [boom] = decals({
      kind: 'starfallen',
      state: 'attack',
      move: 'well',
      time: s.wellTime - STEP,
    });
    expect(boom!.progress).toBe(1);
  });

  it('rising enemies show a spawn ring, dying bosses a shockwave, dying soldiers nothing', () => {
    const [spawn] = decals({ state: 'rising', time: config.enemy.riseSeconds / 2 });
    expect(spawn).toMatchObject({ kind: 'spawn', color: 0xff0000, progress: 0.5 });
    expect(decals({ kind: 'captain', state: 'dying', time: 0.2 })[0]?.kind).toBe('death');
    expect(decals({ state: 'dying', time: 0.2 })).toEqual([]);
  });

  it('the Weight ring tightens with each stack', () => {
    const one = decals({}, 1)[0]!;
    const two = decals({}, 2)[0]!;
    expect(one.kind).toBe('weight');
    expect(two.sx).toBeLessThan(one.sx);
  });
});

describe('hazard and impact decals', () => {
  it('a meteor marker is full on the last step before it lands', () => {
    const out = new DecalList();
    const delay = config.enemies.starfallen.meteorDelay;
    meteorDecal({ x: 1, z: 1, radius: 1.8, time: delay }, out);
    meteorDecal({ x: 1, z: 1, radius: 1.8, time: STEP }, out);
    const [start, end] = out.list();
    expect(start!.progress).toBeCloseTo(STEP / delay);
    expect(end!.progress).toBe(1);
  });

  it('the burning edge starts at the safe ring', () => {
    const out = new DecalList();
    burnDecal(12, out);
    const [band] = out.list();
    expect(band!.shape).toBe(DecalShape.Band);
    expect(band!.param * band!.sx).toBeCloseTo(12);
  });

  it('the comet shockwave reaches the damage radius; airborne bursts draw no ring', () => {
    const out = new DecalList();
    impactDecal({ x: 0, y: 0.3, z: 0, age: 0.25, kind: ImpactKind.Comet }, 0xffffff, out);
    impactDecal({ x: 0, y: 5, z: 0, age: 0.1, kind: ImpactKind.Comet }, 0xffffff, out);
    impactDecal({ x: 0, y: 0.3, z: 0, age: 0.1, kind: ImpactKind.Bolt }, 0xffffff, out);
    const list = out.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.sx * list[0]!.progress).toBeCloseTo(config.comet.radius);
  });

  it('reuses its records between frames', () => {
    const out = new DecalList();
    burnDecal(10, out);
    const first = out.items[0];
    out.clear();
    burnDecal(9, out);
    expect(out.items[0]).toBe(first);
    expect(out.count).toBe(1);
  });
});
