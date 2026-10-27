import { ringRadius } from '../ai/bosses';
import { applyDamage } from '../combat/damage';
import { config } from '../config';
import { ImpactKind } from '../state';
import type { GameSystem } from '../types';

/**
 * Boss hazards: meteors strike their markers when the countdown ends, and in
 * the Starfallen Knight's last phase the arena edge burns outside a closing ring.
 */
export const hazardsSystem: GameSystem = (ctx) => {
  const { state, dt } = ctx;
  const player = ctx.world.with('player', 'body', 'health', 'hurtbox').first;
  const p = player?.body.translation();

  for (const h of [...state.hazards]) {
    h.time -= dt;
    if (h.time > 0) continue;
    state.hazards.splice(state.hazards.indexOf(h), 1);
    state.impacts.push({
      x: h.x,
      y: 0.3,
      z: h.z,
      age: 0,
      kind: ImpactKind.Meteor,
      radius: h.radius,
    });
    ctx.audio.play('burst', { volume: 0.5, rate: 1.3 });
    if (player && p && Math.hypot(p.x - h.x, p.z - h.z) <= h.radius + player.hurtbox.radius) {
      applyDamage(ctx, player, h.damage, { from: { x: h.x, z: h.z } });
    }
  }

  const boss = [...ctx.world.with('enemy', 'health')].find(
    (e) => e.enemy.kind === 'starfallen' && e.enemy.phase >= 3 && e.health.current > 0,
  );
  state.burnRing = boss ? ringRadius(boss.enemy.phaseTime) : null;
  if (state.burnRing === null || !player || !p || state.phase !== 'playing') return;
  state.burnTick -= dt;
  if (Math.hypot(p.x, p.z) > state.burnRing && state.burnTick <= 0) {
    state.burnTick = config.enemies.starfallen.ringTick;
    applyDamage(ctx, player, config.enemies.starfallen.ringDamage, { quiet: true });
  }
};
