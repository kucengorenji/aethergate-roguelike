import type { GameSystem } from '../types';

/** Writes game state into the DOM HUD declared in index.html. Only touches the DOM on change. */
export function createHudSystem(): GameSystem {
  const score = document.getElementById('hud-score')!;
  const time = document.getElementById('hud-time')!;
  const banner = document.getElementById('banner')!;
  let last = '';

  return ({ state }) => {
    const key = `${state.score}/${state.total}|${state.elapsed.toFixed(1)}|${state.phase}`;
    if (key === last) return;
    last = key;
    score.textContent = `${state.score} / ${state.total}`;
    time.textContent = `${state.elapsed.toFixed(1)}s`;
    banner.hidden = state.phase !== 'won';
    if (state.phase === 'won') {
      banner.querySelector('[data-time]')!.textContent = `${state.elapsed.toFixed(1)}s`;
    }
  };
}
