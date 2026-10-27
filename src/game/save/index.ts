import type * as THREE from 'three/webgpu';
import { applyQuality, qualityProfile } from '../quality';
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

/**
 * Opens a menu panel: the player stops acting and the pointer is freed for the
 * menu. `suspend` also stops the simulation (title, pause); switching panels
 * without it keeps the game suspended or running as it was.
 */
export function openPanel(ctx: Ctx, panel: Panel, suspend = false): void {
  ctx.state.panel = panel;
  if (suspend) ctx.suspended = true;
  ctx.input.releasePointer();
}

export function closePanel(ctx: Ctx): void {
  ctx.state.panel = null;
  ctx.suspended = false;
}

/** Applies saved settings to the running game; render quality needs the renderer. */
export function applySettings(
  ctx: Ctx,
  config: { look: { sensitivity: number } },
  renderer?: THREE.WebGPURenderer,
): void {
  const { sensitivity, volume, quality } = ctx.state.save.settings;
  config.look.sensitivity = sensitivity;
  ctx.audio.masterVolume = volume;
  if (renderer) applyQuality(renderer, ctx.scene, qualityProfile(quality, window.devicePixelRatio));
}
