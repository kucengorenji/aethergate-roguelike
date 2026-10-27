import type { SaveData } from '../save/data';

export type RunEnd = 'death' | 'victory' | 'abandoned';

/** Records a finished run: shards are kept whatever the ending; wins and best time on victory. */
export function bankRun(save: SaveData, shards: number, end: RunEnd, seconds: number): void {
  save.shards += shards;
  save.stats.runs++;
  if (end !== 'victory') return;
  save.stats.wins++;
  if (save.stats.bestTime === null || seconds < save.stats.bestTime) save.stats.bestTime = seconds;
}
