import type { GameSystem } from '../types';

/** Shows the click-to-play prompt until the pointer is locked. Only touches the DOM on change. */
export function createHudSystem(): GameSystem {
  const prompt = document.getElementById('lock-prompt')!;
  const crosshair = document.getElementById('crosshair')!;
  let last: boolean | null = null;

  return ({ input }) => {
    if (input.locked === last) return;
    last = input.locked;
    prompt.hidden = input.locked;
    crosshair.classList.toggle('dim', !input.locked);
  };
}
