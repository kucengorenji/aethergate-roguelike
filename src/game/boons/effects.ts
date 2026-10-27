import { isBoss } from '../ai/bosses';
import { applyDamage } from '../combat/damage';
import type { Entity } from '../components';
import { config } from '../config';
import { ImpactKind } from '../state';
import type { Ctx } from '../types';
import { BOON_BY_ID, holds, type Held } from './data';
import { addChill, addRot, addWeight } from './status';

/**
 * What blessings do, as hooks the combat systems call at fixed moments. Each
 * hook checks the player's held blessings, so systems stay unaware of them.
 */

function held(ctx: Ctx): Held | null {
  return ctx.world.with('player', 'boons').first?.boons.held ?? null;
}

export function has(ctx: Ctx, id: string): boolean {
  const h = held(ctx);
  return h !== null && holds(h, id);
}

/** Multiplier on player damage against `target` (passives). */
export function damageMultiplier(ctx: Ctx, target: Entity): number {
  const chilled = (target.status?.chill ?? 0) > 0 || (target.status?.frozen ?? 0) > 0;
  return chilled && has(ctx, 'cold-heart') ? 1 + config.boons.coldHeart : 1;
}

/** The comet's element, from the blessing in the Skill slot. */
export function skillElement(h: Held): 'frost' | 'gravity' | 'rot' | 'storm' | null {
  const id = h.skill;
  if (!id) return null;
  return ({ moon: 'frost', star: 'gravity', rot: 'rot', storm: 'storm' } as const)[
    BOON_BY_ID[id]!.god
  ];
}

/** A player bolt landed on `target` for `damage`. */
export function onBoltHit(ctx: Ctx, target: Entity, damage: number): void {
  if (has(ctx, 'moonlit-bolts')) chill(ctx, target, 1);
  if (has(ctx, 'starfall-bolts')) weigh(ctx, target, 1);
  if (has(ctx, 'blighted-bolts')) rot(ctx, target, 1);
  if (has(ctx, 'arc-bolts')) arc(ctx, target, 1, damage * config.boons.arcFraction);
  const counter = ctx.world.with('player', 'boons').first?.boons;
  if (counter && has(ctx, 'thunderhead')) {
    counter.bolts++;
    if (counter.bolts % config.boons.thunderheadEvery === 0) arc(ctx, target, 3, damage);
  }
}

/** Before a comet bursts. Returns true when the burst should wait for a pull. */
export function beforeBurst(ctx: Ctx, x: number, z: number): boolean {
  if (!has(ctx, 'collapsing-comet')) return false;
  const { pullRadius } = config.boons;
  for (const e of livingEnemies(ctx)) {
    const p = e.body!.translation();
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > pullRadius || d < 0.5) continue;
    // Knockback decays at 8/s, so a push of 8 * distance covers about that distance.
    const speed = (d - 0.8) * 8;
    e.enemy!.pushX += (dx / d) * speed;
    e.enemy!.pushZ += (dz / d) * speed;
  }
  return true;
}

/** After a comet burst hit `victims`. */
export function afterBurst(ctx: Ctx, x: number, y: number, z: number, victims: Entity[]): void {
  for (const v of victims) {
    if (has(ctx, 'rime-comet')) chill(ctx, v, 2);
    if (has(ctx, 'blight-comet')) rot(ctx, v, 3);
  }
  if (has(ctx, 'thunder-comet')) {
    const { thunderRange, thunderDamage } = config.boons;
    const far = livingEnemies(ctx)
      .filter((e) => !victims.includes(e))
      .map((e) => ({ e, d: distanceTo(e, x, z) }))
      .filter(({ d }) => d <= thunderRange)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { e } of far) strike(ctx, { x, y, z }, e, thunderDamage);
  }
}

export function onDodgeStart(ctx: Ctx, player: Entity): void {
  const p = player.body!.translation();
  if (has(ctx, 'pale-step')) {
    for (const e of within(ctx, p.x, p.z, config.boons.novaRadius)) chill(ctx, e, 1);
    ctx.state.impacts.push({ x: p.x, y: 0.3, z: p.z, age: 0, kind: ImpactKind.Nova });
  }
  if (has(ctx, 'static-step')) {
    const nearest = livingEnemies(ctx)
      .map((e) => ({ e, d: distanceTo(e, p.x, p.z) }))
      .filter(({ d }) => d <= config.boons.staticRange)
      .sort((a, b) => a.d - b.d)[0];
    if (nearest)
      strike(ctx, { x: p.x, y: p.y + 0.6, z: p.z }, nearest.e, config.boons.staticDamage);
  }
}

export function onDodgeEnd(ctx: Ctx, player: Entity): void {
  const p = player.body!.translation();
  const r = config.boons.novaRadius;
  if (has(ctx, 'meteor-step')) {
    for (const e of within(ctx, p.x, p.z, r)) {
      applyDamage(ctx, e, config.boons.meteorDamage * damageMultiplier(ctx, e), {
        from: p,
        knockback: 5,
      });
      weigh(ctx, e, 1);
    }
    ctx.state.impacts.push({ x: p.x, y: 0.3, z: p.z, age: 0, kind: ImpactKind.Meteor, radius: r });
    ctx.audio.play('slam', { volume: 0.5, rate: 1.3 });
  }
  if (has(ctx, 'spore-step')) {
    for (const e of within(ctx, p.x, p.z, r)) rot(ctx, e, 2);
    ctx.state.impacts.push({ x: p.x, y: 0.3, z: p.z, age: 0, kind: ImpactKind.Spore, radius: r });
  }
}

/** A bash landed on `target`. */
export function onBashHit(ctx: Ctx, target: Entity): void {
  if (has(ctx, 'starbound-staff') && target.enemy && (target.health?.current ?? 0) > 0)
    crush(ctx, target);
}

export function chill(ctx: Ctx, target: Entity, stacks: number): void {
  if (!target.status || (target.health?.current ?? 0) <= 0) return;
  const canFreeze = !target.enemy || !isBoss(target.enemy.kind);
  if (addChill(target.status, stacks, canFreeze)) ctx.audio.play('freeze', { volume: 0.5 });
}

export function weigh(ctx: Ctx, target: Entity, stacks: number): void {
  if (!target.status || (target.health?.current ?? 0) <= 0) return;
  if (addWeight(target.status, stacks)) crush(ctx, target);
}

export function rot(ctx: Ctx, target: Entity, stacks: number): void {
  if (!target.status || (target.health?.current ?? 0) <= 0) return;
  addRot(target.status, stacks, has(ctx, 'fester'));
}

function crush(ctx: Ctx, target: Entity): void {
  const s = target.status;
  const chilled = !!s && (s.chill > 0 || s.frozen > 0);
  const damage = config.status.weight.crushDamage * (chilled && has(ctx, 'shatter') ? 2 : 1);
  applyDamage(ctx, target, damage, { staggers: true, quiet: true });
  const p = target.body?.translation();
  if (p) ctx.state.impacts.push({ x: p.x, y: p.y, z: p.z, age: 0, kind: ImpactKind.Gravity });
  ctx.audio.play('crush', { volume: 0.6 });
}

/** Lightning from `source` to up to `count` other enemies within arc range. */
function arc(ctx: Ctx, source: Entity, count: number, damage: number): void {
  const p = source.body?.translation();
  if (!p) return;
  const targets = livingEnemies(ctx)
    .filter((e) => e !== source)
    .map((e) => ({ e, d: distanceTo(e, p.x, p.z) }))
    .filter(({ d }) => d <= config.boons.arcRange)
    .sort((a, b) => a.d - b.d)
    .slice(0, count);
  for (const { e } of targets) strike(ctx, p, e, damage);
}

/** One lightning strike: quiet damage, a drawn arc, Plague Storm rot. */
function strike(
  ctx: Ctx,
  from: { x: number; y: number; z: number },
  target: Entity,
  damage: number,
): void {
  const t = target.body!.translation();
  applyDamage(ctx, target, damage * damageMultiplier(ctx, target), { quiet: true });
  ctx.state.arcs.push({ x1: from.x, y1: from.y, z1: from.z, x2: t.x, y2: t.y, z2: t.z, age: 0 });
  if (has(ctx, 'plague-storm')) rot(ctx, target, 2);
  ctx.audio.play('zap', { volume: 0.4, rate: ctx.rng.range(0.9, 1.2) });
}

function livingEnemies(ctx: Ctx): Entity[] {
  return [...ctx.world.with('enemy', 'body', 'health')].filter(
    (e) => e.health.current > 0 && e.enemy.state !== 'rising' && e.enemy.state !== 'dying',
  );
}

function within(ctx: Ctx, x: number, z: number, r: number): Entity[] {
  return livingEnemies(ctx).filter((e) => distanceTo(e, x, z) - (e.hurtbox?.radius ?? 0) <= r);
}

function distanceTo(e: Entity, x: number, z: number): number {
  const p = e.body!.translation();
  return Math.hypot(p.x - x, p.z - z);
}
