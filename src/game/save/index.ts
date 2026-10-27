import type { Panel } from '../state';
import type { Ctx } from '../types';
import type { SaveData } from './data';

let writer: ((d: SaveData) => Promise<void>) | null = null;

/** Connects the game to its save writer (once, at start). */
export function useSaveWriter(write: (d: SaveData) => Promise<void>): void {
  writer = write;
}

/** Writes `ctx.state.save` (in order with earlier writes). */
export function saveGame(ctx: Ctx): Promise<void> {
  return writer ? writer(ctx.state.save) : Promise.resolve();
}

/** Opens a menu panel: the player stops acting and the pointer is freed for the menu. */
export function openPanel(ctx: Ctx, panel: Panel): void {
  ctx.state.panel = panel;
  ctx.input.releasePointer();
}

export function closePanel(ctx: Ctx): void {
  ctx.state.panel = null;
  ctx.suspended = false;
}

/** Applies saved settings to the running game. */
export function applySettings(ctx: Ctx, config: { look: { sensitivity: number } }): void {
  const { sensitivity, volume } = ctx.state.save.settings;
  config.look.sensitivity = sensitivity;
  ctx.audio.masterVolume = volume;
}
