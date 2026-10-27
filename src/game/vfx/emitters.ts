import { OrbLook, ProjectileKind } from '../combat/projectiles';
import type { Element } from '../components';
import type { Status } from '../boons/status';
import { config } from '../config';
import { STAFFS } from '../meta/staffs';
import { ImpactKind, type HitMark, type Impact } from '../state';
import {
  burst,
  coneDirection,
  emitOne,
  full,
  rollCount,
  type Emitter,
  type Recipe,
  type Rgb,
} from './emit';
import { elementColor, linear } from './palette';
import { TAG } from './particles';
import { trailColor, trailSpec } from './trails';

/**
 * Effect recipes: what each event in the game sprays. All randomness comes from
 * the emitter's own stream; counts scale with the quality density.
 */

const rgb: Rgb = { r: 0, g: 0, b: 0 };
const dir = { x: 0, y: 0, z: 0 };

const colors = () => config.vfx.colors;
const bursts = () => config.vfx.bursts;

/** Lance impacts are bigger and Scatter's smaller than the Glint Staff's. */
function staffScale(look: number): number {
  const id = STAFFS[look]?.id;
  return id === 'lance' ? 1.3 : id === 'scatter' ? 0.7 : 1;
}

function boltColor(primary: Element | null): number {
  return elementColor(primary, colors().bolt);
}

function orbColor(look: number): number {
  return look === OrbLook.Thorn ? colors().thorn : colors().totem;
}

/** Sprays particles outward along the ground in every direction, starting `from` m out. */
function radial(
  e: Emitter,
  tag: number,
  recipe: Recipe,
  color: Rgb,
  x: number,
  y: number,
  z: number,
  rise: number,
  scale: number,
  from = 0,
  count = recipe.count ?? 1,
): void {
  if (full(e)) return;
  const n = rollCount(e, count);
  const [lo, hi] = recipe.speed ?? [0, 0];
  for (let k = 0; k < n; k++) {
    const a = e.rng.next() * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const speed = e.rng.range(lo, hi) * scale;
    const up = rise * e.rng.next();
    emitOne(
      e,
      tag,
      recipe,
      color,
      x + c * from,
      y,
      z + s * from,
      c * speed,
      up * speed,
      s * speed,
      scale,
    );
  }
}

/** Particles that start on a sphere of `radius` around a point and rush into it. */
function implode(
  e: Emitter,
  tag: number,
  recipe: Recipe,
  color: Rgb,
  x: number,
  y: number,
  z: number,
  radius: number,
  scale: number,
): void {
  if (full(e)) return;
  const n = rollCount(e, recipe.count ?? 1);
  const [lo, hi] = recipe.speed ?? [0, 0];
  for (let k = 0; k < n; k++) {
    coneDirection(e.rng, 0, 1, 0, Math.PI, dir);
    const speed = -e.rng.range(lo, hi) * scale;
    emitOne(
      e,
      tag,
      recipe,
      color,
      x + dir.x * radius,
      y + dir.y * radius,
      z + dir.z * radius,
      dir.x * speed,
      dir.y * speed,
      dir.z * speed,
      scale,
    );
  }
}

/** Particles appearing anywhere on a cylinder around a body, drifting in a cone around up. */
function around(
  e: Emitter,
  tag: number,
  recipe: Recipe,
  color: Rgb,
  x: number,
  bottom: number,
  z: number,
  radius: number,
  height: number,
  rate: number,
  scale = 1,
): void {
  if (full(e)) return;
  const n = rollCount(e, rate);
  const [lo, hi] = recipe.speed ?? [0, 0];
  for (let k = 0; k < n; k++) {
    const a = e.rng.next() * Math.PI * 2;
    const r = radius * (0.8 + 0.5 * e.rng.next());
    const py = bottom + e.rng.next() * height;
    coneDirection(e.rng, 0, 1, 0, 0.9, dir);
    const speed = e.rng.range(lo, hi) * scale;
    emitOne(
      e,
      tag,
      recipe,
      color,
      x + Math.cos(a) * r,
      py,
      z + Math.sin(a) * r,
      dir.x * speed,
      dir.y * speed,
      dir.z * speed,
      scale,
    );
  }
}

/** A spell or attack hit something: the burst of its kind. */
export function impactEffect(
  e: Emitter,
  im: Impact,
  primary: Element | null,
  skill: Element | null,
): void {
  const b = bursts();
  const c = colors();
  const { x, y, z } = im;
  const tag = TAG.impact;
  switch (im.kind) {
    case ImpactKind.Bolt: {
      const s = staffScale(im.look ?? 0);
      burst(
        e,
        tag,
        b.flash,
        linear(primary ? boltColor(primary) : c.boltCore, rgb),
        x,
        y,
        z,
        0,
        1,
        0,
        s,
      );
      burst(
        e,
        tag,
        b.sparks,
        linear(boltColor(primary), rgb),
        x,
        y,
        z,
        0,
        1,
        0,
        s,
        0,
        b.sparks.count * s,
      );
      break;
    }
    case ImpactKind.Orb: {
      linear(orbColor(im.look ?? 0), rgb);
      burst(e, tag, b.flash, rgb, x, y, z, 0, 1, 0, 1.3);
      burst(e, tag, b.sparks, rgb, x, y, z, 0, 1, 0, 1.1, 0, 8);
      break;
    }
    case ImpactKind.Comet: {
      linear(elementColor(skill, c.comet), rgb);
      burst(e, TAG.comet, b.cometFlash, rgb, x, y, z, 0, 1, 0);
      burst(e, TAG.comet, b.cometSparks, rgb, x, y, z, 0, 1, 0);
      linear(skill ? elementColor(skill, c.ember) : c.ember, rgb);
      burst(e, TAG.comet, b.embers, rgb, x, y, z, 0, 1, 0, 1, 0.6);
      burst(e, TAG.comet, b.smoke, linear(c.smoke, rgb), x, y, z, 0, 1, 0, 1, 0.5);
      break;
    }
    case ImpactKind.Nova: {
      linear(c.frost, rgb);
      burst(e, TAG.blessing, b.flash, rgb, x, y + 0.4, z, 0, 1, 0, 2);
      radial(e, TAG.blessing, b.shards, rgb, x, y, z, 0.3, 1, 0.3);
      break;
    }
    case ImpactKind.Gravity: {
      const s = (im.radius ?? 1.5) / 1.5;
      linear(c.gravity, rgb);
      burst(e, TAG.blessing, b.flash, rgb, x, y, z, 0, 1, 0, 1.5 * Math.sqrt(s));
      implode(e, TAG.blessing, b.implode, rgb, x, y, z, 1.3 * s, Math.sqrt(s));
      break;
    }
    case ImpactKind.Slam: {
      const s = (im.radius ?? 2) / 2;
      burst(e, tag, b.flash, linear(config.colors.marker, rgb), x, y, z, 0, 1, 0, 1.6 * s);
      radial(e, tag, b.dust, linear(c.dust, rgb), x, 0.15, z, 0.2, s, 0.3 * s);
      burst(e, tag, b.debris, linear(c.ash, rgb), x, 0.2, z, 0, 1, 0, s, 0.5 * s);
      break;
    }
    case ImpactKind.Meteor: {
      const s = (im.radius ?? 1.8) / 1.8;
      linear(c.fire, rgb);
      burst(e, TAG.meteor, b.cometFlash, rgb, x, y, z, 0, 1, 0, 0.8 * s);
      burst(e, TAG.meteor, b.cometSparks, rgb, x, y, z, 0, 1, 0, s);
      burst(
        e,
        TAG.meteor,
        b.sparks,
        linear(config.colors.starGlow, rgb),
        x,
        y,
        z,
        0,
        1,
        0,
        1.5 * s,
        0,
        10,
      );
      burst(e, TAG.meteor, b.debris, linear(c.meteor, rgb), x, y, z, 0, 1, 0, s, 0.4 * s);
      burst(e, TAG.meteor, b.smoke, linear(c.smoke, rgb), x, y, z, 0, 1, 0, s, 0.5 * s, 6);
      break;
    }
    case ImpactKind.Spore: {
      const s = (im.radius ?? 2.5) / 2.5;
      radial(e, TAG.blessing, b.spores, linear(c.spore, rgb), x, 0.4, z, 0.4, s, 0.3);
      burst(e, TAG.blessing, b.aura, linear(c.rot, rgb), x, 0.6, z, 0, 1, 0, 1.5, 1.5 * s, 12);
      break;
    }
  }
}

/** Sparks where a blow landed: hot sparks on enemies, red on the player, gold off a shield. */
export function hitEffect(e: Emitter, h: HitMark): void {
  const b = bursts();
  const c = colors();
  // Sparks fly back out of the struck side, toward the attacker.
  const ax = -h.dx;
  const az = -h.dz;
  switch (h.kind) {
    case 'enemy':
      linear(c.hit, rgb);
      burst(e, TAG.hit, b.flash, rgb, h.x, h.y, h.z, 0, 1, 0, 0.6);
      burst(e, TAG.hit, b.hitSparks, rgb, h.x, h.y, h.z, ax, 0.5, az);
      burst(e, TAG.hit, b.flecks, linear(c.ash, rgb), h.x, h.y, h.z, ax, 0.6, az);
      break;
    case 'player':
      burst(e, TAG.hurt, b.hurtSparks, linear(c.hurt, rgb), h.x, h.y, h.z, ax, 0.6, az);
      burst(e, TAG.hurt, b.flecks, linear(c.ash, rgb), h.x, h.y, h.z, ax, 0.6, az);
      break;
    case 'block':
      linear(c.block, rgb);
      burst(e, TAG.block, b.flash, rgb, h.x, h.y, h.z, 0, 1, 0, 0.5);
      burst(e, TAG.block, b.blockSparks, rgb, h.x, h.y, h.z, ax, 0.4, az);
      break;
  }
}

/** A projectile was just cast or fired from (x, y, z) toward (vx, vy, vz). */
export function muzzleEffect(
  e: Emitter,
  kind: number,
  look: number,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  primary: Element | null,
  skill: Element | null,
): void {
  const b = bursts();
  if (kind === ProjectileKind.Comet) {
    linear(elementColor(skill, colors().comet), rgb);
    burst(e, TAG.comet, b.cometMuzzle, rgb, x, y, z, vx, vy, vz);
    burst(e, TAG.comet, b.flash, rgb, x, y, z, 0, 1, 0, 1.4);
  } else if (kind === ProjectileKind.Bolt) {
    burst(
      e,
      TAG.muzzle,
      b.muzzle,
      linear(boltColor(primary), rgb),
      x,
      y,
      z,
      vx,
      vy,
      vz,
      staffScale(look),
    );
  } else {
    burst(e, TAG.muzzle, b.muzzle, linear(orbColor(look), rgb), x, y, z, vx, vy, vz, 1.4);
  }
}

/** Sparkles (and comet smoke) shed along the stretch a projectile flew this step. */
export function trailEffect(
  e: Emitter,
  kind: number,
  look: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  primary: Element | null,
  skill: Element | null,
): void {
  // Hundreds of shots can be in the air: once the pool is full, skip the work.
  if (full(e)) return;
  const comet = kind === ProjectileKind.Comet;
  linear(trailColor(kind, look, primary, skill), rgb);
  const recipe = bursts().mote;
  const tag = comet ? TAG.comet : TAG.trail;
  const scale = comet ? 2.2 : kind === ProjectileKind.Orb ? 1.5 : 1;
  const n = rollCount(e, trailSpec(kind, look).motes);
  // Motes only drift a little, so a random velocity in a box is round enough.
  const drift = recipe.speed[1] * 2;
  for (let k = 0; k < n; k++) {
    const t = e.rng.next();
    emitOne(
      e,
      tag,
      recipe,
      rgb,
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      (e.rng.next() - 0.5) * drift,
      (e.rng.next() - 0.5) * drift,
      (e.rng.next() - 0.5) * drift,
      scale,
    );
  }
  if (comet) {
    burst(
      e,
      TAG.comet,
      bursts().smoke,
      linear(colors().smoke, rgb),
      bx,
      by,
      bz,
      0,
      1,
      0,
      0.35,
      0,
      0.5,
    );
  }
}

/** Ash and embers shed by a falling meteor. */
export function meteorTrailEffect(
  e: Emitter,
  x: number,
  y: number,
  z: number,
  scale: number,
): void {
  const c = colors();
  const motes = config.vfx.trails.meteor.motes;
  burst(
    e,
    TAG.meteor,
    bursts().mote,
    linear(c.fire, rgb),
    x,
    y,
    z,
    0,
    1,
    0,
    2.5 * scale,
    0.4 * scale,
    motes,
  );
  burst(
    e,
    TAG.meteor,
    bursts().smoke,
    linear(c.smoke, rgb),
    x,
    y,
    z,
    0,
    1,
    0,
    0.6 * scale,
    0.3,
    0.6,
  );
}

/** Flames and smoke rising along the inner edge of the phase 3 burning ring. */
export function flamesEffect(e: Emitter, ring: number): void {
  const b = bursts();
  const c = colors();
  const n = rollCount(e, b.flames.count);
  for (let k = 0; k < n; k++) {
    const a = e.rng.next() * Math.PI * 2;
    const r = ring + e.rng.next() * 1.5;
    burst(
      e,
      TAG.flame,
      b.flames,
      linear(c.fire, rgb),
      Math.cos(a) * r,
      0.1,
      Math.sin(a) * r,
      0,
      1,
      0,
      1,
      0.2,
      1,
    );
  }
  const a = e.rng.next() * Math.PI * 2;
  const r = ring + 0.5 + e.rng.next() * 3;
  burst(
    e,
    TAG.flame,
    b.smoke,
    linear(c.smoke, rgb),
    Math.cos(a) * r,
    0.8,
    Math.sin(a) * r,
    0,
    1,
    0,
    1.2,
    0.5,
    0.25,
  );
}

/** Lightning struck (x, y, z): yellow sparks crackle around the target. */
export function arcEffect(e: Emitter, x: number, y: number, z: number): void {
  const b = bursts();
  linear(colors().storm, rgb);
  burst(e, TAG.arc, b.flash, rgb, x, y, z, 0, 1, 0, 0.8);
  burst(e, TAG.arc, b.sparks, rgb, x, y, z, 0, 1, 0, 1, 0.3, 10);
}

/** An enemy starts rising: embers burst outward from its spawn ring. */
export function spawnEffect(
  e: Emitter,
  x: number,
  z: number,
  radius: number,
  glow: number,
  boss: boolean,
): void {
  const s = boss ? config.vfx.bossScale : 1;
  radial(e, TAG.spawn, bursts().embers, linear(glow, rgb), x, 0.1, z, 0.8, 0.6 * s, radius, 10 * s);
}

/** While rising: dark ash and embers climb out of the ground around it. */
export function risingEffect(
  e: Emitter,
  x: number,
  z: number,
  radius: number,
  glow: number,
  boss: boolean,
): void {
  const b = bursts();
  const s = boss ? config.vfx.bossScale : 1;
  const rate = config.vfx.spawnPerStep * s;
  burst(
    e,
    TAG.spawn,
    b.rising,
    linear(colors().ash, rgb),
    x,
    0.2,
    z,
    0,
    1,
    0,
    s,
    radius * 0.8,
    rate,
  );
  burst(e, TAG.spawn, b.aura, linear(glow, rgb), x, 0.1, z, 0, 1, 0, s, radius, rate * 0.7);
}

/** An enemy died at (x, y, z): it breaks into ash and embers, bosses with a flash. */
export function deathEffect(
  e: Emitter,
  x: number,
  y: number,
  z: number,
  radius: number,
  glow: number,
  boss: boolean,
): void {
  const b = bursts();
  const c = colors();
  const s = boss ? config.vfx.bossScale : 1;
  burst(
    e,
    TAG.death,
    b.ash,
    linear(c.ash, rgb),
    x,
    y,
    z,
    0,
    1,
    0,
    s,
    radius + 0.3,
    b.ash.count * s,
  );
  burst(e, TAG.death, b.embers, linear(c.ember, rgb), x, y, z, 0, 1, 0, s, radius, 10 * s);
  if (boss) burst(e, TAG.death, b.cometFlash, linear(glow, rgb), x, y + 1, z, 0, 1, 0, 1.2);
}

/** While dying: ash keeps lifting off the sinking body, less as it goes. */
export function dyingEffect(
  e: Emitter,
  x: number,
  y: number,
  z: number,
  radius: number,
  done: number,
  boss: boolean,
): void {
  const s = boss ? config.vfx.bossScale : 1;
  const rate = config.vfx.dyingPerStep * (1 - done) * s;
  burst(
    e,
    TAG.death,
    bursts().ash,
    linear(colors().ash, rgb),
    x,
    y,
    z,
    0,
    1,
    0,
    s * 0.8,
    radius,
    rate,
  );
}

/**
 * Status auras around a body centered at (x, y, z): frost motes for Chill,
 * glints for frozen, violet stars falling onto it for Weight, spores for Rot.
 */
export function auraEffect(
  e: Emitter,
  status: Status,
  x: number,
  y: number,
  z: number,
  radius: number,
  halfHeight: number,
): void {
  const a = config.vfx.auras;
  const b = bursts();
  const c = colors();
  const bottom = y - halfHeight - radius;
  const height = 2 * (halfHeight + radius);
  if (status.chill > 0) {
    around(
      e,
      TAG.chill,
      b.aura,
      linear(c.frost, rgb),
      x,
      bottom,
      z,
      radius,
      height,
      a.chill * status.chill,
    );
  }
  if (status.frozen > 0) {
    around(e, TAG.frozen, b.aura, linear(c.ice, rgb), x, bottom, z, radius, height, a.frozen, 1.4);
  }
  if (status.weight > 0 && !full(e)) {
    linear(c.gravity, rgb);
    const n = rollCount(e, a.weight * status.weight);
    const [lo, hi] = b.falling.speed;
    for (let k = 0; k < n; k++) {
      const px = x + (e.rng.next() * 2 - 1) * radius;
      const pz = z + (e.rng.next() * 2 - 1) * radius;
      const py = bottom + height + 0.4 + e.rng.next() * 0.6;
      emitOne(e, TAG.weight, b.falling, rgb, px, py, pz, 0, -e.rng.range(lo, hi), 0);
    }
  }
  if (status.rot > 0) {
    const stacks = Math.min(status.rot, 5);
    around(e, TAG.rot, b.aura, linear(c.rot, rgb), x, bottom, z, radius, height, a.rot * stacks);
    around(
      e,
      TAG.rot,
      b.spores,
      linear(c.spore, rgb),
      x,
      bottom,
      z,
      radius,
      height * 0.8,
      a.rot * stacks * 0.5,
      0.35,
    );
  }
}
