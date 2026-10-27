# 0008: Mini-boss and boss

Status: done
Owner: Mikael (built by agent)

## Problem

The elite and boss rooms are placeholders (spec 0005).
A run needs a midpoint test and a finale with their own patterns, phases and a health bar, readable enough to learn and beat.

## Behavior

1. **The Ward Captain (mini-boss, room 5).** A larger, gilded Ward Knight with a boss health bar.
   - It blocks bolts from the front with its shield; a bash breaks the guard as for knights.
   - **Slam:** like the knight's, wider (2.6 m), after a 0.8 s wind-up with a ground marker.
   - **Shield charge:** from range, it winds up 0.9 s while a marker line shows its path, then charges 12 m in a straight line; touching it hurts.
   - **Phase 2** at half health: the shield cracks (no more guard), it calls two Hollow Soldiers, and wind-ups get 25% shorter.
2. **The Starfallen Knight (boss, room 8).** A towering armored demigod with a starry violet glow and a health bar with three phases.
   - **Sweep:** a 120 degree sword arc in front, 3.8 m, after a 0.7 s wind-up with a cone marker.
   - **Gravity well:** a ring marker shows a 4 m area around it; for 1.2 s the player is pulled toward it, then the ring detonates. Dodging out or rolling away escapes.
   - **Phase 2** (two thirds health) adds **Starfall:** six meteor markers appear around the player and strike after 1.2 s.
   - **Phase 3** (one third health): the arena's edge burns. A ring closes from 22 m to 9 m over 25 s; standing outside it hurts every half second. Wind-ups get 20% shorter.
   - Each phase change staggers the boss for a second with a shockwave that pushes the player back, and shows a message.
3. **Bosses resist control:** Chill slows them but never freezes them; bashes and crushes do not stagger them (except breaking the Captain's guard).
4. **Health bar:** the boss's name and a bar at the top with phase notches.
5. **Finale:** killing the Starfallen Knight ends the run ("The Aethergate opens").

## Acceptance criteria

- [x] The elite room spawns the Ward Captain with two soldiers; the boss room spawns the Starfallen Knight alone; both show the health bar with their name. Verified: `bosses.spec.ts` › the elite and boss rooms bring their bosses and a health bar.
- [x] Captain: frontal bolts are blocked; a charge is preceded by a 0.9 s marker and damages a player in its path; at half health two soldiers join, the guard is gone and wind-ups are shorter. Verified: `bosses.spec.ts` › the Captain blocks, telegraphs its charge, and splits at half health.
- [x] Boss: the sweep damages a player in front and not behind; the gravity well pulls the player toward the boss and detonates; a roll away escapes it. Verified: `bosses.spec.ts` › the sweep hits in front of the boss, not behind it; the gravity well pulls the player in, and a roll away escapes.
- [x] Boss phase 2 drops meteors on their markers after a telegraph: standing on a marker hurts, standing off it does not. Verified: `bosses.spec.ts` › meteors strike their markers.
- [x] Boss phase 3 burns outside the closing ring. Verified: `bosses.spec.ts` › the last phase burns outside the closing ring.
- [x] Phase changes push the player back and show a message; bosses are never frozen or staggered by blessings. Verified: `bosses.spec.ts` › phase changes push the player back; bosses resist control.
- [x] The boss pattern logic has unit tests (move choice per phase, wind-up scaling, ring radius over time). Verified: `src/game/ai/bosses.test.ts`.
- [x] The full seeded run test ends by killing the real boss. Verified: `run.spec.ts` › a seeded run reaches the Aethergate (asserts the last room holds the Starfallen Knight).
- [x] Visual baselines of the Captain's charge marker and the boss with meteor markers and the health bar look right; `pnpm verify` passes. Verified: `visual.spec.ts` › the Captain winding up a charge, the Starfallen Knight calling meteors, reviewed by eye; `pnpm progress:verify` 2026-10-27.

## Out of scope

- Boss art and animation (M6), boss music, more bosses.
