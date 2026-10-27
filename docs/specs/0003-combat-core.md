# 0003: Combat core

Status: done
Owner: Mikael (built by agent)

## Problem

Milestone M2: before enemies exist, the basic verbs (cast, dodge, bash, heal) must feel good against a target.
If shooting a dummy is not satisfying for two minutes, no amount of content will save the game.

## Behavior

1. **Primary spell.** Holding left click casts glintstone bolts at about 5 per second toward whatever is under the crosshair. Bolts fly fast, glow blue-white and burst on impact with walls or targets. Each cast costs focus.
2. **Focus.** A bar under the health bar. It regenerates after a short pause in casting. With too little focus, clicking plays a dry "empty" click and nothing fires.
3. **Dodge roll.** Space dashes in the movement direction (forward when standing still) with a short invulnerability window, then a short cooldown. No casting during a roll.
4. **Melee bash.** F swings the staff in front of you: a short-range arc that damages and knocks back. No casting during the swing.
5. **Flask.** Q drinks a flask over a short moment, healing a fixed amount. Limited charges, shown on the HUD. No casting while drinking.
6. **Training dummy.** A dummy stands in the courtyard. Hits flash it white, show a floating damage number and play an impact sound. At zero health it collapses and comes back at full health after two seconds.
7. **Training totem.** A totem on the dais fires a slow, glowing orb at the player every few seconds, with a visible charge-up before each shot. It exists to practice dodging and to prove player damage works. It can be switched off in the debug panel.
8. **Player health and death.** Orbs damage the player unless the player is mid-roll. Taking damage shakes the camera and flashes the screen edge. At zero health, "You fell" shows; R restarts with full health, focus and flasks.
9. **Feel.** Landing a hit freezes time for a few frames (hitstop). Casting kicks the camera slightly. Every action has a placeholder sound.
10. **HUD.** Health bar, focus bar and flask charges in the bottom left. The controls hint lists the new keys.

## Acceptance criteria

- [x] Holding left click for 1 s fires 5 bolts (within 1) and spends 5 casts of focus. Verified: `combat.spec.ts` › holding fire casts five bolts a second.
- [x] A bolt aimed at the dummy hits it and lowers its health by the bolt damage; a damage number appears. Verified: `combat.spec.ts` › bolts damage the dummy.
- [x] Bolts stop at walls (they never pass through cover). Verified: `combat.spec.ts` › cover blocks bolts.
- [x] With focus below one cast, left click fires nothing. Verified: `combat.spec.ts` › no focus, no bolt.
- [x] Focus regenerates to full after a pause. Verified: `combat.spec.ts` › focus regenerates after a pause.
- [x] Space moves the player at least 4 m in about half a second, and an orb that hits during the invulnerable window deals no damage. Verified: `combat.spec.ts` › dodge moves and avoids damage, an orb hurts without a dodge.
- [x] The dodge cannot be chained faster than its cooldown. Verified: `combat.spec.ts` › dodge has a cooldown.
- [x] F damages and pushes back a dummy in front of the player, and misses one behind. Verified: `combat.spec.ts` › bash hits in front only.
- [x] Q heals by the flask amount, consumes a charge, and does nothing at zero charges. Verified: `combat.spec.ts` › flask heals and runs out.
- [x] Hitting the dummy triggers hitstop (simulated time slows for a few steps). Verified: `combat.spec.ts` › hits cause hitstop.
- [x] The dummy collapses at zero health and returns at full health after 2 s. Verified: `combat.spec.ts` › dummy collapses and returns.
- [x] A totem orb that reaches the player deals damage; at zero health the death banner shows and R restores everything. Verified: `combat.spec.ts` › totem orbs can kill, R restores; the totem fires at the player.
- [x] Projectile pool, aim math and hit tests have unit tests. Verified: `projectiles.test.ts`, `hit.test.ts`, `camera-rig.test.ts`, `collision-groups.test.ts`, Animator layer tests.
- [x] 200 live projectiles stay within the CPU step budget (perf test). Verified: `perf.spec.ts`, avg 0.42 ms and p95 0.7 ms per step with 200 live.
- [x] Visual baselines for casting at the dummy and the HUD look right. Verified: `visual.spec.ts` casting-at-dummy and death-banner, reviewed by eye.
- [x] `pnpm verify` passes. Verified: `pnpm progress:verify` 2026-10-27.

## Out of scope

- Enemies with AI (M3), boons and status effects (M4), the Ash skill (M4).
- Real VFX, models and sounds (M6).
- Staff variants (M5).

## Open questions

- Numbers (damage, rates, costs) are first guesses in `config.ts` and need a real playtest.
