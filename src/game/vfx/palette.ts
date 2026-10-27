import { BOON_BY_ID, GODS, type Held } from '../boons/data';
import type { Element } from '../components';
import { config } from '../config';
import type { Rgb } from './emit';

/** Converted colors: effects ask for the same few dozen every step. */
const cache = new Map<number, Rgb>();

/** sRGB hex to linear RGB, the space particles and shaders mix light in. */
export function linear(hex: number, out: Rgb): Rgb {
  let c = cache.get(hex);
  if (!c) {
    c = {
      r: toLinear(((hex >> 16) & 255) / 255),
      g: toLinear(((hex >> 8) & 255) / 255),
      b: toLinear((hex & 255) / 255),
    };
    cache.set(hex, c);
  }
  out.r = c.r;
  out.g = c.g;
  out.b = c.b;
  return out;
}

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** The element of the blessing in the Primary slot, which colors bolts. */
export function primaryElement(held: Held | undefined): Element | null {
  const id = held?.primary;
  const boon = id ? BOON_BY_ID[id] : undefined;
  return boon ? GODS[boon.god].element : null;
}

/** A demigod's effect color, or `fallback` without a blessing. */
export function elementColor(element: Element | null, fallback: number): number {
  return element ? config.vfx.colors[element] : fallback;
}
