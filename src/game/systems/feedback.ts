import { config } from '../config';
import type { GameSystem } from '../types';

const STEP = 1 / 60;

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

  for (const { flash } of world.with('flash')) {
    flash.time = Math.max(0, flash.time - STEP);
    const on = flash.time > 0 ? 1 : 0;
    for (const m of flash.materials) {
      m.emissive.setRGB(1, 1, 1);
      m.emissiveIntensity = on;
    }
  }

  const numbers = state.damageNumbers;
  for (const n of numbers) n.age += STEP;
  while (numbers.length > 0 && numbers[0]!.age > f.numberSeconds) numbers.shift();
  const impacts = state.impacts;
  for (const im of impacts) im.age += STEP;
  while (impacts.length > 0 && impacts[0]!.age > 0.25) impacts.shift();
};
