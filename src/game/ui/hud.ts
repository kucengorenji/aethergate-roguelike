import { config } from '../config';
import { OFFER_INFO } from '../run/rewards';
import { nearestOpenDoor } from '../systems/interact';
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
  const skillIcon = $('skill');
  const death = $('death');
  const hurt = $('hurt');
  const wave = $('wave');
  const cleared = $('cleared');
  const runStats = $('run-stats');
  const statBoons = $('stat-boons');
  const statShards = $('stat-shards');
  const toast = $('toast');
  const doorPrompt = $('door-prompt');
  const complete = $('complete');
  const fade = $('fade');
  const last = new Map<string, string>();
  const set = (key: string, value: string, apply: () => void) => {
    if (last.get(key) === value) return;
    last.set(key, value);
    apply();
  };

  return (ctx) => {
    const { input, state, world } = ctx;
    const player = world.with('player', 'health', 'caster', 'flask', 'skill').first;
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
    const run = state.run;
    const room = run.plan?.rooms[run.index];
    const inRun = state.mode === 'run' && !!room;
    const kindText = room
      ? { combat: '', grace: 'Grace', elite: 'Elite', boss: 'Boss' }[room.kind]
      : '';
    const label = inRun
      ? [`Room ${run.index + 1} / ${run.plan!.rooms.length}`, waveText || kindText]
          .filter(Boolean)
          .join(' · ')
      : waveText;
    set('wave', label, () => {
      wave.hidden = label === '';
      wave.textContent = label;
    });
    set('cleared', String(enc.status === 'cleared' && !dead && !inRun), () => {
      cleared.hidden = enc.status !== 'cleared' || dead || inRun;
    });
    set('stats', `${inRun}|${run.boons}|${run.shards}`, () => {
      runStats.hidden = !inRun;
      statBoons.textContent = String(run.boons);
      statShards.textContent = String(run.shards);
    });
    const message = state.message?.text ?? '';
    set('toast', message, () => {
      toast.hidden = message === '';
      toast.textContent = message;
    });
    const p = world.with('player', 'body').first?.body.translation();
    const door = inRun && run.status === 'choosing' && p ? nearestOpenDoor(ctx, p.x, p.z) : null;
    const promptText = door ? `Enter: ${OFFER_INFO[door.offer].label}` : '';
    set('door', promptText, () => {
      doorPrompt.hidden = promptText === '';
      doorPrompt.querySelector('span')!.textContent = promptText;
    });
    const done = inRun && run.status === 'complete' && !dead;
    set('complete', `${done}|${done ? run.time.toFixed(0) : ''}`, () => {
      complete.hidden = !done;
      const minutes = Math.floor(run.time / 60);
      const seconds = Math.floor(run.time % 60);
      complete.querySelector('[data-time]')!.textContent =
        `${minutes}:${String(seconds).padStart(2, '0')}`;
    });
    const f = config.run.fadeSeconds;
    const fadeLevel =
      inRun && run.status === 'transition'
        ? run.timer < f
          ? run.timer / f
          : Math.max(0, 1 - (run.timer - f) / f)
        : 0;
    set('fade', fadeLevel.toFixed(2), () => {
      fade.style.opacity = fadeLevel.toFixed(2);
    });
    set('hurt', state.feedback.hurt.toFixed(2), () => {
      hurt.style.opacity = state.feedback.hurt.toFixed(2);
    });
    if (!player) return;
    const { health, caster, flask, skill } = player;
    const ready = 1 - skill.cooldown / skill.maxCooldown;
    set('skill', ready.toFixed(2), () => {
      skillIcon.style.setProperty('--ready', ready.toFixed(3));
      skillIcon.classList.toggle('ready', skill.cooldown <= 0);
    });
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
