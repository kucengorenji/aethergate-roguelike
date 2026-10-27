import { isBoss } from '../ai/bosses';
import { stateDuration } from '../ai/brains';
import type { BossMove, EnemyKind, EnemyState } from '../components';
import { config } from '../config';
import { ImpactKind, type Impact } from '../state';

/** Ground decal shapes, as the decal shader reads them. */
export const DecalShape = {
  /** A circle: rim plus a fill growing from the center. */
  Disc: 0,
  /** A pie slice toward local -z: `param` is the half angle. */
  Sector: 1,
  /** A strip from its back edge forward (-z): the fill grows forward. */
  Strip: 2,
  /** The area outside `param` (inner radius fraction) up to the rim: fire. */
  Band: 3,
  /** A ring at `progress` of the radius that fades out: shockwaves. */
  Wave: 4,
} as const;

export type DecalKind =
  | 'slam'
  | 'well'
  | 'meteor'
  | 'charge'
  | 'sweep'
  | 'sword'
  | 'leap'
  | 'burn'
  | 'spawn'
  | 'death'
  | 'shock'
  | 'weight';

export interface Decal {
  kind: DecalKind;
  shape: number;
  x: number;
  z: number;
  /** Half extents in m: the radius for round shapes, half width and half length for strips. */
  sx: number;
  sz: number;
  /** Turn around y; 0 points the shape's front toward -z. */
  yaw: number;
  /** Fill from 0 to 1, full at the strike; for waves, the ring's radius fraction. */
  progress: number;
  /** Sector half angle (radians) or band inner radius fraction. */
  param: number;
  /** sRGB hex. */
  color: number;
  /** Strength from 0 to 1. */
  alpha: number;
}

/** Reusable decal records, so drawing every frame allocates nothing. */
export class DecalList {
  readonly items: Decal[] = [];
  count = 0;

  clear(): void {
    this.count = 0;
  }

  add(kind: DecalKind, shape: number, x: number, z: number, sx: number, sz = sx): Decal {
    let d = this.items[this.count];
    if (!d) {
      d = { kind, shape, x, z, sx, sz, yaw: 0, progress: 0, param: 0, color: 0, alpha: 1 };
      this.items.push(d);
    }
    this.count++;
    d.kind = kind;
    d.shape = shape;
    d.x = x;
    d.z = z;
    d.sx = sx;
    d.sz = sz;
    d.yaw = 0;
    d.progress = 0;
    d.param = 0;
    d.color = config.colors.marker;
    d.alpha = 1;
    return d;
  }

  /** The decals as plain objects (tests). */
  list(): Decal[] {
    return this.items.slice(0, this.count).map((d) => ({ ...d }));
  }
}

/** What the telegraphs need from an enemy. */
export interface EnemyView {
  kind: EnemyKind;
  state: EnemyState;
  time: number;
  move: BossMove | null;
  phase: number;
  aimX: number;
  aimZ: number;
  facing: number;
}

const STEP = 1 / 60;

/**
 * Wind-up fill: full on the last step before the strike resolves (looking one
 * step ahead), so the rim is reached exactly when the blow lands.
 */
function windupFill(e: EnemyView): number {
  return Math.min(1, (e.time + STEP) / stateDuration(e.kind, 'windup', e.move, e.phase));
}

/** The strike itself keeps the full decal, fading out over the attack. */
function strikeFade(e: EnemyView): number {
  return Math.max(0, 1 - e.time / stateDuration(e.kind, 'attack', e.move, e.phase));
}

/**
 * Ground decals of one enemy at (x, z): its spawn ring while rising, the area
 * of the attack it is winding up or striking with, the boss death shockwave,
 * and the Weight ring that tightens toward the crush.
 */
export function enemyDecals(
  e: EnemyView,
  x: number,
  z: number,
  weight: number,
  glow: number,
  out: DecalList,
): void {
  const k = config.enemies[e.kind];
  const t = config.vfx.telegraphs;
  const boss = isBoss(e.kind);
  if (e.state === 'rising') {
    const d = out.add('spawn', DecalShape.Disc, x, z, (k.radius + 0.6) * (boss ? 1.6 : 1));
    d.progress = Math.min(1, e.time / config.enemy.riseSeconds);
    d.color = glow;
    d.alpha = 0.8;
    return;
  }
  if (e.state === 'dying') {
    if (!boss) return;
    const p = Math.min(1, e.time / 0.8);
    if (p >= 1) return;
    const d = out.add('death', DecalShape.Wave, x, z, 7);
    d.progress = Math.sqrt(p);
    d.color = glow;
    d.alpha = 1 - p;
    return;
  }
  if (weight > 0) {
    const d = out.add('weight', DecalShape.Disc, x, z, (k.radius + 0.7) * (1 - 0.18 * weight));
    d.color = config.vfx.colors.gravity;
    d.alpha = 0.5 + 0.2 * weight;
  }
  const striking = e.state === 'attack';
  if (e.state !== 'windup' && !striking) return;
  const fill = striking ? 1 : windupFill(e);
  const fade = striking ? strikeFade(e) : 1;
  if (striking && fade <= 0) return;

  if (e.move === 'well') {
    const s = config.enemies.starfallen;
    // The well detonates at the end of its attack, so the fill spans wind-up and pull.
    const windup = stateDuration(e.kind, 'windup', e.move, e.phase);
    const elapsed = striking ? windup + e.time : e.time;
    const d = out.add('well', DecalShape.Disc, x, z, s.wellRadius);
    d.progress = Math.min(1, (elapsed + STEP) / (windup + s.wellTime));
    return;
  }
  if (e.kind === 'knight' || e.move === 'slam') {
    const kn = e.kind === 'knight' ? config.enemies.knight : config.enemies.captain;
    const d = out.add(
      'slam',
      DecalShape.Disc,
      x + e.aimX * kn.slamDistance,
      z + e.aimZ * kn.slamDistance,
      kn.slamRadius,
    );
    d.progress = fill;
    d.alpha = fade;
    return;
  }
  if (e.move === 'charge') {
    const c = config.enemies.captain;
    const half = (c.chargeSpeed * c.chargeTime) / 2;
    const d = strip(out, 'charge', x, z, e.facing, c.radius * 1.2, half);
    d.progress = fill;
    d.alpha = fade;
    return;
  }
  if (e.move === 'sweep') {
    const s = config.enemies.starfallen;
    const d = out.add('sweep', DecalShape.Sector, x, z, s.sweepRadius);
    d.yaw = e.facing;
    d.param = (s.sweepArcDegrees * Math.PI) / 360;
    d.progress = fill;
    d.alpha = fade;
    return;
  }
  if (!t.minor) return;
  if (e.kind === 'soldier') {
    const s = config.enemies.soldier;
    // Matches the attack check: reach plus a margin, within a 110 degree arc.
    const d = out.add('sword', DecalShape.Sector, x, z, s.reach + 0.6);
    d.yaw = e.facing;
    d.param = (110 * Math.PI) / 360;
    d.progress = fill;
    d.alpha = t.minorAlpha * fade;
  } else if (e.kind === 'hound') {
    const h = config.enemies.hound;
    const half = (h.leapSpeed * h.attack) / 2;
    const d = strip(out, 'leap', x, z, Math.atan2(-e.aimX, -e.aimZ), h.radius + 0.3, half);
    d.progress = fill;
    d.alpha = t.minorAlpha * fade;
  }
}

/** A strip starting at (x, z) and running `2 * half` m toward `yaw`. */
function strip(
  out: DecalList,
  kind: DecalKind,
  x: number,
  z: number,
  yaw: number,
  halfWidth: number,
  half: number,
): Decal {
  const d = out.add(
    kind,
    DecalShape.Strip,
    x - Math.sin(yaw) * half,
    z - Math.cos(yaw) * half,
    halfWidth,
    half,
  );
  d.yaw = yaw;
  return d;
}

/** A meteor's decal: the fill reaches the rim on the last step before it lands. */
export function meteorDecal(
  h: { x: number; z: number; radius: number; time: number },
  out: DecalList,
): void {
  const d = out.add('meteor', DecalShape.Disc, h.x, h.z, h.radius);
  const delay = config.enemies.starfallen.meteorDelay;
  d.progress = Math.min(1, Math.max(0, 1 - (h.time - STEP) / delay));
}

/** The burning edge outside the phase 3 ring. */
export function burnDecal(ring: number, out: DecalList): void {
  const outer = ring + config.vfx.telegraphs.burnBand;
  const d = out.add('burn', DecalShape.Band, 0, 0, outer);
  d.param = ring / outer;
  d.progress = 1;
  d.color = config.vfx.colors.fire;
}

/** Seconds an impact lives (`feedbackSystem` drops it after this). */
export const IMPACT_SECONDS = 0.25;

/** Shockwave rings of impacts on or near the ground; `comet` colors the comet's. */
export function impactDecal(im: Impact, comet: number, out: DecalList): void {
  if (im.y > 2) return;
  const c = config.vfx.colors;
  let radius = im.radius ?? 0;
  let color: number = config.colors.marker;
  switch (im.kind) {
    case ImpactKind.Comet:
      radius = config.comet.radius;
      color = comet;
      break;
    case ImpactKind.Nova:
      radius = config.boons.novaRadius;
      color = c.frost;
      break;
    case ImpactKind.Meteor:
      color = c.fire;
      break;
    case ImpactKind.Spore:
      color = c.rot;
      break;
    case ImpactKind.Gravity:
      color = c.gravity;
      break;
    case ImpactKind.Slam:
      break;
    default:
      return;
  }
  if (radius <= 0) return;
  const p = Math.min(1, im.age / IMPACT_SECONDS);
  const d = out.add('shock', DecalShape.Wave, im.x, im.z, radius);
  d.progress = Math.sqrt(Math.max(p, 0.05));
  d.color = color;
  d.alpha = 1 - p * p;
}
