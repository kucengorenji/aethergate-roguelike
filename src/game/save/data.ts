export const SAVE_VERSION = 1;

export type Quality = 'low' | 'medium' | 'high';

/** Everything that persists between sessions. */
export interface SaveData {
  version: typeof SAVE_VERSION;
  shards: number;
  /** Upgrade id to level bought (0 when absent). */
  upgrades: Record<string, number>;
  /** Unlocked staff ids, and the one equipped for the next run. */
  staffs: string[];
  staff: string;
  settings: { sensitivity: number; volume: number; quality: Quality };
  stats: { runs: number; wins: number; bestTime: number | null };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    shards: 0,
    upgrades: {},
    staffs: ['glint'],
    staff: 'glint',
    settings: { sensitivity: 0.0022, volume: 0.8, quality: 'high' },
    stats: { runs: 0, wins: 0, bestTime: null },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/**
 * Turns whatever was stored into valid save data, field by field: valid values
 * are kept, missing or damaged ones fall back to defaults. Returns null for a
 * record from a newer version, which must not be overwritten by this build.
 */
export function migrate(raw: unknown): SaveData | null {
  const d = defaultSave();
  if (!isObject(raw)) return d;
  if (typeof raw.version === 'number' && raw.version > SAVE_VERSION) return null;
  const upgrades: Record<string, number> = {};
  if (isObject(raw.upgrades)) {
    for (const [id, level] of Object.entries(raw.upgrades)) {
      const n = num(level, 0, 0, 99);
      if (n > 0) upgrades[id] = Math.floor(n);
    }
  }
  const staffs = Array.isArray(raw.staffs)
    ? [...new Set(['glint', ...raw.staffs.filter((s): s is string => typeof s === 'string')])]
    : d.staffs;
  const staff = typeof raw.staff === 'string' && staffs.includes(raw.staff) ? raw.staff : 'glint';
  const s = isObject(raw.settings) ? raw.settings : {};
  const quality =
    s.quality === 'low' || s.quality === 'medium' || s.quality === 'high'
      ? s.quality
      : d.settings.quality;
  const st = isObject(raw.stats) ? raw.stats : {};
  return {
    version: SAVE_VERSION,
    shards: Math.floor(num(raw.shards, 0, 0)),
    upgrades,
    staffs,
    staff,
    settings: {
      sensitivity: num(s.sensitivity, d.settings.sensitivity, 0.0003, 0.01),
      volume: num(s.volume, d.settings.volume, 0, 1),
      quality,
    },
    stats: {
      runs: Math.floor(num(st.runs, 0, 0)),
      wins: Math.floor(num(st.wins, 0, 0)),
      bestTime: typeof st.bestTime === 'number' && st.bestTime > 0 ? st.bestTime : null,
    },
  };
}
