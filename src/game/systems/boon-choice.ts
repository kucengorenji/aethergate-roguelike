import { skillElement } from '../boons/effects';
import { BOON_BY_ID, grant } from '../boons/data';
import type { GameSystem } from '../types';

const KEYS = [
  ['Digit1', 'Numpad1'],
  ['Digit2', 'Numpad2'],
  ['Digit3', 'Numpad3'],
] as const;

/** Keys 1 to 3 take a card from the open blessing choice. */
export const boonChoiceSystem: GameSystem = (ctx) => {
  const { state, input } = ctx;
  const choice = state.choice;
  if (!choice) return;
  const player = ctx.world.with('player', 'boons', 'skill').first;
  if (!player) return;
  const picked = KEYS.findIndex((codes) => input.wasPressed(...codes));
  const id = picked >= 0 ? choice.options[picked] : undefined;
  if (!id) return;
  grant(player.boons.held, id);
  player.skill.element = skillElement(player.boons.held);
  state.choice = null;
  state.run.boons++;
  state.message = { text: BOON_BY_ID[id]!.name, age: 0 };
  ctx.audio.play('blessing', { volume: 0.6 });
};
