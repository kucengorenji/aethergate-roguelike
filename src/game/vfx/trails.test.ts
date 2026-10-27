import { describe, expect, it } from 'vitest';
import { OrbLook, ProjectileKind } from '../combat/projectiles';
import { config } from '../config';
import { STAFFS } from '../meta/staffs';
import { trailColor, trailLength, trailSpec } from './trails';

const look = (id: string) => STAFFS.findIndex((s) => s.id === id);

describe('trails', () => {
  it('give each staff its own trail: Scatter short, Glint medium, Lance long and thin', () => {
    const glint = trailSpec(ProjectileKind.Bolt, look('glint'));
    const lance = trailSpec(ProjectileKind.Bolt, look('lance'));
    const scatter = trailSpec(ProjectileKind.Bolt, look('scatter'));
    expect(scatter.length).toBeLessThan(glint.length);
    expect(glint.length).toBeLessThan(lance.length);
    expect(lance.width).toBeLessThan(glint.width);
    expect(trailSpec(ProjectileKind.Comet, 0)).toBe(config.vfx.trails.comet);
  });

  it('never reach back past where the projectile was cast', () => {
    const spec = trailSpec(ProjectileKind.Bolt, 0);
    expect(trailLength(spec, 0.4, 0)).toBe(0.4);
    expect(trailLength(spec, 0.4, 0.3)).toBeCloseTo(0.1);
    expect(trailLength(spec, 10, 0)).toBe(spec.length);
    expect(trailLength(spec, 0.2, 0.5)).toBe(0);
  });

  it('take the blessing colors, or pale blue, green thorns and orange totem orbs', () => {
    const c = config.vfx.colors;
    expect(trailColor(ProjectileKind.Bolt, 0, null, null)).toBe(c.bolt);
    expect(trailColor(ProjectileKind.Bolt, 0, 'frost', 'rot')).toBe(c.frost);
    expect(trailColor(ProjectileKind.Comet, 0, 'frost', 'rot')).toBe(c.rot);
    expect(trailColor(ProjectileKind.Comet, 0, null, null)).toBe(c.comet);
    expect(trailColor(ProjectileKind.Orb, OrbLook.Thorn, null, null)).toBe(c.thorn);
    expect(trailColor(ProjectileKind.Orb, OrbLook.Totem, null, null)).toBe(c.totem);
  });
});
