import { BOON_BY_ID, GODS, type Held } from '../boons/data';
import type { GameSystem } from '../types';

const SLOT_LABEL = {
  primary: 'Primary',
  skill: 'Skill',
  dodge: 'Dodge',
  passive: 'Passive',
  duo: 'Duo',
} as const;
const css = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** The blessing choice cards and the list of blessings held (frame system). */
export function createBoonsUiSystem(): GameSystem {
  const choice = document.getElementById('boon-choice')!;
  const god = choice.querySelector<HTMLElement>('.boon-god')!;
  const cards = choice.querySelector<HTMLElement>('.boon-cards')!;
  const list = document.getElementById('boons-held')!;
  let lastChoice = '';
  let lastHeld = '';

  return ({ state, world }) => {
    const held = world.with('player', 'boons').first?.boons.held;
    const key = state.choice ? `${state.choice.god}:${state.choice.options.join(',')}` : '';
    if (key !== lastChoice) {
      lastChoice = key;
      choice.hidden = !state.choice;
      if (state.choice && held) renderChoice(state.choice.god, state.choice.options, held);
    }
    const heldKey = held ? JSON.stringify(held) : '';
    if (heldKey !== lastHeld && held) {
      lastHeld = heldKey;
      const ids = [held.primary, held.skill, held.dodge, held.passive, ...held.duos].filter(
        (id): id is string => !!id,
      );
      list.replaceChildren(
        ...ids.map((id) => {
          const b = BOON_BY_ID[id]!;
          const li = document.createElement('li');
          li.style.setProperty('--god', css(GODS[b.god].color));
          li.textContent = b.name;
          return li;
        }),
      );
    }
  };

  function renderChoice(g: keyof typeof GODS, options: string[], held: Held): void {
    choice.style.setProperty('--god', css(GODS[g].color));
    god.textContent = `${GODS[g].name} offers a blessing`;
    cards.replaceChildren(
      ...options.map((id, i) => {
        const b = BOON_BY_ID[id]!;
        const card = document.createElement('article');
        card.className = 'boon-card';
        card.style.setProperty('--god', css(GODS[b.god].color));
        const replaced = b.slot === 'duo' ? undefined : held[b.slot];
        card.innerHTML = `<header><kbd></kbd><span class="slot"></span></header><h2></h2><p></p>${
          replaced ? '<span class="replaces"></span>' : ''
        }`;
        card.querySelector('kbd')!.textContent = String(i + 1);
        card.querySelector('.slot')!.textContent = SLOT_LABEL[b.slot];
        card.querySelector('h2')!.textContent = b.name;
        card.querySelector('p')!.textContent = b.text;
        const r = card.querySelector('.replaces');
        if (r && replaced) r.textContent = `Replaces ${BOON_BY_ID[replaced]!.name}`;
        return card;
      }),
    );
  }
}
