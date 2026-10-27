# 0012: Title screen, pause menu and settings

Status: approved
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

- [ ] Opening without `?mode` shows the title; Begin closes it; with `?mode=...` there is no title.
- [ ] Losing the pointer lock during play opens the pause panel and suspends the game; Resume closes it and resumes; no pause before the first lock, while dead or while choosing a blessing.
- [ ] Settings change sensitivity, volume and quality at once, and all three are restored after a reload.
- [ ] Quality Low lowers the render scale and turns shadows off; High restores them.
- [ ] Menus work with the keyboard (Tab, Enter, Esc back).
- [ ] Visual baselines of the title, pause and settings panels look right; `pnpm verify` passes.

## Out of scope

- The hub, upgrades, staffs and "Abandon run" (spec 0010, built in parallel), key rebinding, gamepad.
