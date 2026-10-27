import type { Rng } from '@engine/rng';
import { BOONS, GOD_ORDER, heldGods, holds, type God, type Held } from './data';

/**
 * Three blessings from `god` the player does not hold, empty slots first, with
 * an eligible duo taking the last card. Deterministic for a given RNG state.
 */
export function offerBoons(rng: Rng, held: Held, god: God): string[] {
  const own = BOONS.filter((b) => b.god === god && b.slot !== 'duo' && !holds(held, b.id));
  const empty = shuffle(
    rng,
    own.filter((b) => b.slot !== 'duo' && !held[b.slot]),
  );
  const filled = shuffle(
    rng,
    own.filter((b) => !empty.includes(b)),
  );
  const picks = [...empty, ...filled].slice(0, 3).map((b) => b.id);
  const gods = heldGods(held);
  const duo = BOONS.find(
    (b) =>
      b.slot === 'duo' &&
      b.requires?.includes(god) === true &&
      b.requires.every((g) => gods.has(g)) &&
      !holds(held, b.id),
  );
  if (duo) picks.splice(Math.min(2, picks.length), 1, duo.id);
  return picks;
}

/** The demigod behind a Blessing token. */
export function pickGod(rng: Rng): God {
  return rng.pick(GOD_ORDER);
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
