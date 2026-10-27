import { equipStaff, STAFFS, unlockStaff } from '../meta/staffs';
import { buy, canBuy, level, nextCost, UPGRADES } from '../meta/upgrades';
import { closePanel, saveGame } from '../save';
import type { Ctx, GameSystem } from '../types';

/**
 * The altar of upgrades and the staff rack (frame system). Rows are rebuilt
 * only when the panel or the save changes; buttons act on the live context.
 */
export function createMetaUiSystem(): GameSystem {
  const panel = document.getElementById('meta-panel')!;
  const title = panel.querySelector('h2')!;
  const shards = panel.querySelector<HTMLElement>('.meta-shards')!;
  const rows = panel.querySelector<HTMLElement>('.meta-rows')!;
  let ctxRef: Ctx | null = null;
  let lastKey = '';

  panel.querySelector('.meta-close')!.addEventListener('click', () => {
    if (ctxRef) closePanel(ctxRef);
  });
  window.addEventListener('keydown', (e) => {
    const open = ctxRef?.state.panel;
    if (e.code === 'Escape' && ctxRef && (open === 'shop' || open === 'staffs')) closePanel(ctxRef);
  });

  const act = (change: (ctx: Ctx) => boolean) => () => {
    if (!ctxRef || !change(ctxRef)) return;
    render(ctxRef);
    void saveGame(ctxRef);
    ctxRef.audio.play('blessing', { volume: 0.5 });
  };

  const render: GameSystem = (ctx) => {
    ctxRef = ctx;
    const which =
      ctx.state.panel === 'shop' || ctx.state.panel === 'staffs' ? ctx.state.panel : null;
    const key = which ? `${which}|${JSON.stringify(ctx.state.save)}` : '';
    if (key === lastKey) return;
    lastKey = key;
    panel.hidden = !which;
    if (!which) return;
    const save = ctx.state.save;
    title.textContent = which === 'shop' ? 'Altar of upgrades' : 'Staff rack';
    shards.textContent = `${save.shards} Lumen shards`;
    if (which === 'shop') {
      rows.replaceChildren(
        ...UPGRADES.map((u) => {
          const cost = nextCost(save, u.id);
          const label = cost === null ? 'Maxed' : `Buy · ${cost}`;
          return row(
            u.name,
            u.text,
            pips(level(save, u.id), u.costs.length),
            label,
            !canBuy(save, u.id),
            act((c) => buy(c.state.save, u.id)),
          );
        }),
      );
    } else {
      rows.replaceChildren(
        ...STAFFS.map((s) => {
          const owned = save.staffs.includes(s.id);
          const equipped = save.staff === s.id;
          const label = equipped ? 'Equipped' : owned ? 'Equip' : `Unlock · ${s.cost}`;
          const disabled = equipped || (!owned && save.shards < s.cost);
          const stats = `${s.damage} damage${s.count > 1 ? ` × ${s.count}` : ''} · ${(1 / s.interval).toFixed(1)} per second${s.pierce ? ` · pierces ${s.pierce}` : ''}`;
          return row(
            s.name,
            `${s.text} ${stats}.`,
            null,
            label,
            disabled,
            act((c) => (owned ? equipStaff(c.state.save, s.id) : unlockStaff(c.state.save, s.id))),
          );
        }),
      );
    }
  };
  return render;
}

function pips(filled: number, total: number): HTMLElement {
  const el = document.createElement('span');
  el.className = 'meta-pips';
  el.setAttribute('aria-label', `Level ${filled} of ${total}`);
  for (let i = 0; i < total; i++) {
    const pip = document.createElement('i');
    if (i < filled) pip.className = 'on';
    el.appendChild(pip);
  }
  return el;
}

function row(
  name: string,
  text: string,
  levels: HTMLElement | null,
  label: string,
  disabled: boolean,
  onClick: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'meta-row';
  const info = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = name;
  const p = document.createElement('p');
  p.textContent = text;
  info.append(h, p);
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  el.append(info, ...(levels ? [levels] : []), button);
  return el;
}
