import { closePanel, openPanel, saveGame } from '../save';
import { defaultSave, type Quality } from '../save/data';
import { controlsLocked, type Panel } from '../state';
import { returnToHub } from '../systems/hub';
import type { Ctx, GameSystem } from '../types';

const DEFAULT_SENSITIVITY = defaultSave().settings.sensitivity;

/**
 * The title, pause and settings panels. Buttons and Esc change `state.panel`
 * from DOM events; the returned frame system only shows the open panel and
 * moves keyboard focus into it. `applySettings` pushes changed settings into
 * the running game.
 */
export function createMenus(
  ctx: Ctx,
  canvas: HTMLCanvasElement,
  applySettings: () => void,
): GameSystem {
  const root = document.getElementById('menu')!;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const sensitivity = document.querySelector<HTMLInputElement>('#set-sensitivity')!;
  const volume = document.querySelector<HTMLInputElement>('#set-volume')!;
  const sensitivityOut = document.getElementById('out-sensitivity')!;
  const volumeOut = document.getElementById('out-volume')!;
  const qualities = [...root.querySelectorAll<HTMLInputElement>('input[name="quality"]')];
  // Where Back leads from settings.
  let settingsFrom: Panel = 'title';
  let shown: Panel | null | undefined;

  const resume = () => {
    closePanel(ctx);
    // Chrome refuses the lock for about a second after the player pressed Esc;
    // pause again rather than let the game run without mouse control.
    void Promise.resolve(canvas.requestPointerLock()).catch(() => {
      if (!ctx.input.locked && !controlsLocked(ctx.state)) openPanel(ctx, 'pause', true);
    });
  };
  const openSettings = () => {
    settingsFrom = ctx.state.panel ?? 'title';
    syncControls();
    openPanel(ctx, 'settings');
  };
  const back = () => {
    openPanel(ctx, settingsFrom);
  };
  const actions: Record<string, () => void> = {
    begin: () => {
      closePanel(ctx);
    },
    resume,
    settings: openSettings,
    back,
    // Spec 0010: leave the run for the hall, keeping the shards earned so far.
    abandon: () => {
      closePanel(ctx);
      returnToHub(ctx, 'abandoned');
    },
  };

  root.addEventListener('click', (e) => {
    const button = (e.target as Element).closest<HTMLElement>('[data-action]');
    const action = button?.dataset.action;
    if (action) actions[action]?.();
  });
  // Esc goes back one level. The title and the pause menu are the top level:
  // Esc cannot relock the pointer (browsers do not count it as a gesture).
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && ctx.state.panel === 'settings') back();
  });

  const settings = () => ctx.state.save.settings;
  sensitivity.addEventListener('input', () => {
    settings().sensitivity = (DEFAULT_SENSITIVITY * Number(sensitivity.value)) / 100;
    applySettings();
    syncLabels();
  });
  volume.addEventListener('input', () => {
    settings().volume = Number(volume.value) / 100;
    applySettings();
    syncLabels();
  });
  // `input` applies while dragging; `change` (on release) saves once.
  for (const slider of [sensitivity, volume]) {
    slider.addEventListener('change', () => {
      void saveGame(ctx);
    });
  }
  for (const radio of qualities) {
    radio.addEventListener('change', () => {
      settings().quality = radio.value as Quality;
      applySettings();
      void saveGame(ctx);
    });
  }

  function syncControls(): void {
    const s = settings();
    sensitivity.value = String(Math.round((s.sensitivity / DEFAULT_SENSITIVITY) * 100));
    volume.value = String(Math.round(s.volume * 100));
    for (const radio of qualities) radio.checked = radio.value === s.quality;
    syncLabels();
  }

  function syncLabels(): void {
    sensitivityOut.textContent = `${sensitivity.value}%`;
    volumeOut.textContent = `${volume.value}%`;
    for (const slider of [sensitivity, volume]) {
      const min = Number(slider.min);
      const fill = (Number(slider.value) - min) / (Number(slider.max) - min);
      slider.style.setProperty('--fill', `${(fill * 100).toFixed(1)}%`);
    }
  }

  const abandon = root.querySelector<HTMLElement>('[data-action="abandon"]')!;

  return ({ state }) => {
    if (state.panel === shown) return;
    shown = state.panel;
    // Only a run started from the hall can be abandoned back to it.
    abandon.hidden = !(state.mode === 'hub' && state.run.active);
    const panel = panels.find((p) => p.dataset.panel === state.panel);
    root.hidden = !panel;
    document.body.dataset.menu = state.panel ?? '';
    for (const p of panels) p.hidden = p !== panel;
    if (panel === undefined) {
      // A focused button that disappears would keep Space and Enter for itself.
      if (root.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      return;
    }
    if (state.panel === 'settings') syncControls();
    panel.querySelector<HTMLElement>('button, input')?.focus();
  };
}
