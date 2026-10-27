import { OrbLook, ProjectileKind } from '../combat/projectiles';
import type { Element } from '../components';
import { config } from '../config';
import { STAFFS } from '../meta/staffs';
import { elementColor } from './palette';

export type TrailSpec = (typeof config.vfx.trails)[keyof typeof config.vfx.trails];

/** The trail of a projectile kind and look: bolts by staff, then orbs and comets. */
export function trailSpec(kind: number, look: number): TrailSpec {
  const t = config.vfx.trails;
  if (kind === ProjectileKind.Comet) return t.comet;
  if (kind === ProjectileKind.Orb) return t.orb;
  const id = STAFFS[look]?.id;
  return id === 'lance' ? t.lance : id === 'scatter' ? t.scatter : t.glint;
}

/**
 * A projectile's effect color: bolts take the primary blessing's color (pale
 * blue without one), the comet its Skill blessing's, orbs their caster's.
 */
export function trailColor(
  kind: number,
  look: number,
  primary: Element | null,
  skill: Element | null,
): number {
  const c = config.vfx.colors;
  if (kind === ProjectileKind.Bolt) return elementColor(primary, c.bolt);
  if (kind === ProjectileKind.Comet) return elementColor(skill, c.comet);
  return look === OrbLook.Thorn ? c.thorn : c.totem;
}

/**
 * How long a trail is drawn: its full length, but never more than the projectile
 * has flown, so a fresh bolt's trail starts at the staff instead of behind it.
 * `pending` is the part of the last step not yet shown (blending between steps).
 */
export function trailLength(spec: TrailSpec, flown: number, pending: number): number {
  return Math.max(0, Math.min(spec.length, flown - pending));
}
