# 0012: Title screen, pause menu and settings (plan)

Spec: docs/specs/0012-menus-and-settings.md

## Approach

The menus are plain DOM panels in `index.html`, driven by one UI module (`src/game/ui/menus.ts`) on top of spec 0011's `state.panel`, `openPanel`/`closePanel`, `saveGame` and `ctx.suspended`.

- **Panels:** one `<section>` per panel (title, pause, settings) inside a shared dimmed backdrop. A frame system shows the section that matches `state.panel` and moves keyboard focus to its first control when it opens. Button clicks and Esc are DOM event handlers that call `openPanel`/`closePanel`, like spec 0011 intended: the menus change panel state, the fixed systems only read it.
- **Title:** `createGame` opens the title (suspended) when the URL has no `mode` parameter. Begin closes it; the existing click-to-play prompt then takes over.
- **Pause:** a new fixed system (`pauseSystem`, first in order) opens the pause panel and suspends the game when the pointer lock was lost this step during play, with no panel, no blessing choice and not dead. The engine `Input` reports that as a per-step edge (`input.lockLost`), like `wasPressed`, so "never locked" can never pause and no extra game state is needed. `releasePointer` (a panel opening) is not a loss and does not set the edge.
- **Resume** requests pointer lock from the click (a user gesture) and closes the panel. If the browser refuses the lock (Chrome does for about a second after the player pressed Esc), the pause panel comes back instead of the game running unlocked.
- **Settings:** a sensitivity slider (percent of the default), a volume slider and a Low / Medium / High radio group. `input` events apply at once, `change` events save, so dragging does not queue dozens of writes. Back and Esc return to the panel settings was opened from.
- **Quality:** `src/game/quality.ts` turns a quality level into a render profile (pure, unit tested) from `config.quality`, and applies it: renderer pixel ratio, and `castShadow` plus shadow map size on the scene's shadow-casting lights. Toggling `castShadow` (part of three's lights hash) rebuilds the light nodes correctly, while `renderer.shadowMap.enabled` would leave stale shaders. `applySettings` keeps its meaning (save data to the running game) and gains an optional renderer argument for quality.
- **Keyboard:** native `<button>`, `<input type="range">` and radio inputs give Tab, Enter, Space and arrows for free. `Input` stops suppressing Space and arrow defaults when a form control has focus, otherwise sliders and buttons would not respond to them.

## Changes

| File                                    | Change                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `src/engine/input.ts` (+ test)          | `lockLost` per-step edge; no default suppression on focused form controls         |
| `src/game/config.ts`                    | `quality` profiles (pixel ratio, shadow map size)                                 |
| `src/game/quality.ts` (+ test)          | `qualityProfile` (pure) and `applyQuality` (renderer and lights)                  |
| `src/game/save/index.ts`                | `openPanel` can suspend; `applySettings` applies quality when given the renderer  |
| `src/game/systems/pause.ts`             | Opens the pause panel when the pointer lock is lost during play                   |
| `src/game/ui/menus.ts`                  | Title, pause and settings panels: show and focus, buttons, sliders, Esc           |
| `src/game/index.ts`                     | Title at start without `?mode`, register systems, inspect fields and test actions |
| `index.html`, `src/style.css`           | Panel markup and styles in the HUD's warm palette                                 |
| `tests/e2e/menus.spec.ts` (+ baselines) | Title, pause, settings, persistence, quality, keyboard, visual baselines          |
| `tests/e2e/helpers.ts`                  | Snapshot fields for settings and render quality                                   |
| `docs/architecture.md`                  | Menus and quality in "Save data and panels"                                       |

## Tests

| Acceptance criterion                                   | Test                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Title without `?mode`, Begin closes it, none with mode | `menus.spec.ts` › "the title opens without a mode and Begin closes it"                                                       |
| Pause on lock loss, Resume, no pause in the exceptions | `menus.spec.ts` › "losing the pointer pauses and Resume continues", "no pause before the first lock, while dead or choosing" |
| Settings apply at once and survive a reload            | `menus.spec.ts` › "settings apply at once and survive a reload"                                                              |
| Low lowers render scale, no shadows; High restores     | `menus.spec.ts` › same test, plus `quality.test.ts`                                                                          |
| Keyboard: Tab, Enter, Esc back                         | `menus.spec.ts` › "menus work with the keyboard"                                                                             |
| Visual baselines                                       | `menus.spec.ts` › "title", "pause", "settings" screenshots                                                                   |

## Risks

- **Merge conflicts with spec 0010** (hub, running in parallel): edits stay out of run, hub, player, enemy, boon and combat code. `index.ts`, `config.ts` and `state.ts` are shared, so additions there are small and appended.
- **Determinism:** pausing is a fixed system driven by an input edge, so tests step it exactly. The menus only change panel state from DOM events, which tests trigger explicitly.
- **Performance:** the menus frame system touches the DOM only when the panel changes. Quality changes run once per click, not per frame.
- **Existing baselines:** the default quality (High) matches today's renderer setup, so no existing screenshot changes.
