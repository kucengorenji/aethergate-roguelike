# 0012: Title screen, pause menu and settings

Status: done
Owner: Mikael (built by a parallel agent in a Herdr pane)

## Problem

The game drops the player straight into play and has no way to pause or change settings.
M5 needs a title screen, a pause menu and settings that persist (spec 0011 provides save data and panels).

## Behavior

1. **Title screen.** When the game is opened without a `?mode` parameter (the way players open it), it starts on a title panel over the dimmed scene: the name "Aethergate", a one-line tagline, and buttons Begin and Settings. Begin closes the title; clicking the game then locks the pointer and play starts. Tests that pass `?mode=` skip the title.
2. **Pause.** When the pointer lock is lost during play (Esc, alt-tab), the pause panel opens and the simulation is suspended (`ctx.suspended`). Buttons: Resume (relocks the pointer and resumes) and Settings. Not while dead, choosing a blessing, or in another panel; nothing pauses if the pointer was never locked.
3. **Settings** (from title or pause; Back returns to where it was opened from):
   - Mouse sensitivity: a slider, applied at once to looking.
   - Volume: a slider, applied at once to the master volume.
   - Quality: Low, Medium, High. Low renders at 75% resolution without shadows; Medium at full resolution with a 1024 shadow map; High at full resolution (up to 2x on high-DPI screens) with a 2048 shadow map.
   - Every change is saved (spec 0011) and restored on the next launch.
4. **Feel and access.** Panels match the HUD's warm palette; buttons have visible hover and keyboard focus states, work with Tab and Enter, and Esc goes back one level in menus.

## Acceptance criteria

- [x] Opening without `?mode` shows the title; Begin closes it; with `?mode=...` there is no title. Verified: `menus.spec.ts` › the title opens without a mode and Begin closes it.
- [x] Losing the pointer lock during play opens the pause panel and suspends the game; Resume closes it and resumes; no pause before the first lock, while dead or while choosing a blessing. Verified: `menus.spec.ts` › losing the pointer pauses the game and Resume continues; no pause before the first lock, while dead or while choosing.
- [x] Settings change sensitivity, volume and quality at once, and all three are restored after a reload. Verified: `menus.spec.ts` › settings apply at once and survive a reload.
- [x] Quality Low lowers the render scale and turns shadows off; High restores them. Verified: same E2E test (pixel ratio 0.75 and no shadows, then Medium 1024 and High 2048), `src/game/quality.test.ts`.
- [x] Menus work with the keyboard (Tab, Enter, Esc back). Verified: `menus.spec.ts` › menus work with the keyboard. Esc goes back from settings; the title and the pause menu are the top level, because browsers do not let Esc relock the pointer.
- [x] Visual baselines of the title, pause and settings panels look right; `pnpm verify` passes. Verified: `menus.spec.ts-snapshots` reviewed at 1280x720; `E2E_PORT=4174 pnpm verify` passed 2026-10-27.

## Out of scope

- The hub, upgrades, staffs and "Abandon run" (spec 0010, built in parallel), key rebinding, gamepad.
