import type { GameSystem } from '../types';

/**
 * Health, focus, flasks, the death banner, the hurt flash and the
 * click-to-play prompt. Only touches the DOM when a shown value changes.
 */
export function createHudSystem(): GameSystem {
  const $ = (id: string) => document.getElementById(id)!;
  const prompt = $('lock-prompt');
  const crosshair = $('crosshair');
  const hpFill = $('hp-fill');
  const hpText = $('hp-text');
  const focusFill = $('focus-fill');
  const flasks = $('flasks');
  const death = $('death');
  const hurt = $('hurt');
  const wave = $('wave');
  const cleared = $('cleared');
  const last = new Map<string, string>();
  const set = (key: string, value: string, apply: () => void) => {
    if (last.get(key) === value) return;
    last.set(key, value);
    apply();
  };

  return ({ input, state, world }) => {
    const player = world.with('player', 'health', 'caster', 'flask').first;
    const dead = state.phase === 'dead';
    set('lock', String(input.locked || dead), () => {
      prompt.hidden = input.locked || dead;
      crosshair.classList.toggle('dim', !input.locked);
    });
    set('dead', String(dead), () => {
      death.hidden = !dead;
      crosshair.hidden = dead;
    });
    const enc = state.encounter;
    const waveText =
      enc.status === 'active'
        ? `Wave ${enc.wave + 1} / ${enc.total}`
        : enc.status === 'intermission'
          ? `Wave ${enc.wave + 2} / ${enc.total} incoming`
          : '';
    set('wave', waveText, () => {
      wave.hidden = waveText === '';
      wave.textContent = waveText;
    });
    set('cleared', String(enc.status === 'cleared' && !dead), () => {
      cleared.hidden = enc.status !== 'cleared' || dead;
    });
    set('hurt', state.feedback.hurt.toFixed(2), () => {
      hurt.style.opacity = state.feedback.hurt.toFixed(2);
    });
    if (!player) return;
    const { health, caster, flask } = player;
    set('hp', `${Math.ceil(health.current)}/${health.max}`, () => {
      hpFill.style.width = `${(health.current / health.max) * 100}%`;
      hpText.textContent = `${Math.ceil(health.current)}`;
    });
    set('focus', caster.focus.toFixed(0), () => {
      focusFill.style.width = `${(caster.focus / caster.maxFocus) * 100}%`;
    });
    set('flask', `${flask.charges}/${flask.max}`, () => {
      flasks.replaceChildren(
        ...Array.from({ length: flask.max }, (_, i) => {
          const pip = document.createElement('i');
          if (i >= flask.charges) pip.className = 'spent';
          return pip;
        }),
      );
      flasks.setAttribute('aria-label', `${flask.charges} of ${flask.max} flasks`);
    });
  };
}
