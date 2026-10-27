import { config } from '../config';
import type { GameSystem } from '../types';

const STEP = 1 / 60;
const MESSAGE_SECONDS = 2.4;
const ARC_SECONDS = 0.18;

/**
 * Hitstop, camera kick and shake, hurt flash, hit flash, damage numbers and
 * impact bursts. Decays use real step time so they keep going during hitstop.
 */
export const feedbackSystem: GameSystem = (ctx) => {
  const { state, world } = ctx;
  const f = config.feedback;
  const fb = state.feedback;
  if (fb.hitstop > 0) {
    fb.hitstop--;
    ctx.timeScale = f.hitstopTimeScale;
  } else {
    ctx.timeScale = 1;
  }

  fb.kick *= Math.exp(-f.kickRecover * STEP);
  fb.shake *= Math.exp(-f.shakeRecover * STEP);
  fb.hurt = Math.max(0, fb.hurt - STEP * 2.5);

  for (const { flash, status } of world.with('flash')) {
    flash.time = Math.max(0, flash.time - STEP);
    // The hit flash wins; otherwise the strongest status tints the body.
    const [r, g, b, intensity] =
      flash.time > 0
        ? [1, 1, 1, 1]
        : !status
          ? [0, 0, 0, 0]
          : status.frozen > 0
            ? [0.35, 0.65, 1, 0.9]
            : status.chill > 0
              ? [0.55, 0.85, 1, 0.2 + status.chill * 0.12]
              : status.rot > 0
                ? [0.45, 0.9, 0.2, 0.25 + Math.min(status.rot, 5) * 0.05]
                : status.weight > 0
                  ? [0.65, 0.45, 1, 0.2 + status.weight * 0.12]
                  : [0, 0, 0, 0];
    for (const m of flash.materials) {
      m.emissive.setRGB(r, g, b);
      m.emissiveIntensity = intensity;
    }
  }
  const arcs = state.arcs;
  for (const a of arcs) a.age += STEP;
  while (arcs.length > 0 && arcs[0]!.age > ARC_SECONDS) arcs.shift();

  const numbers = state.damageNumbers;
  for (const n of numbers) n.age += STEP;
  while (numbers.length > 0 && numbers[0]!.age > f.numberSeconds) numbers.shift();
  if (state.message) {
    state.message.age += STEP;
    if (state.message.age > MESSAGE_SECONDS) state.message = null;
  }
  const impacts = state.impacts;
  for (const im of impacts) im.age += STEP;
  while (impacts.length > 0 && impacts[0]!.age > 0.25) impacts.shift();
};
