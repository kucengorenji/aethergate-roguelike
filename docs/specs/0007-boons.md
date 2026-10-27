# 0007: Boons and status effects

Status: done
Owner: Mikael (built by agent)

## Problem

Runs need builds: choices that change how the player fights, so two runs feel different.
This is the "Remembrance" system from the design: four rival demigods each offer blessings.

## Behavior

1. **Choosing.** Taking a Blessing token opens a choice of 3 blessings from one demigod (picked by the run seed). Keys 1, 2, 3 choose. The game waits while the choice is open. The doors open after choosing.
2. **Slots.** Every blessing fills one slot: Primary (bolts), Skill (comet), Dodge, or Passive. A new blessing in a filled slot replaces the old one; the card says so. Offers prefer empty slots.
3. **Demigods and their status effects** (names are working names):
   - The Veiled Moon Queen, frost: **Chill** slows an enemy 20% per stack; 3 stacks freeze it solid for 1.5 s.
   - The Starfall General, gravity: **Weight** stacks; the third stack **crushes** for 25 damage and staggers.
   - The Rot Saint, decay: **Rot** deals 3 damage per second per stack, up to 5 stacks, for 4 s after the last stack.
   - The Storm Warden, lightning: **Arcs** jump from a hit to nearby enemies.
4. **Blessings** (4 per demigod):
   - Moon: Moonlit Bolts (bolts Chill), Rime Comet (burst adds 2 Chill), Pale Step (rolling releases a frost nova that Chills within 2.5 m), Cold Heart (+25% damage to chilled enemies).
   - Starfall: Starfall Bolts (bolts add Weight), Collapsing Comet (the burst first pulls enemies within 6 m inward), Meteor Step (ending a roll slams 2.5 m for 15 damage and adds Weight), Starbound Staff (bashes crush at once).
   - Rot: Blighted Bolts (bolts add Rot), Blight Comet (burst adds 3 Rot), Spore Step (ending a roll adds 2 Rot within 2.5 m), Fester (Rot deals 60% more and stacks to 8).
   - Storm: Arc Bolts (bolts arc to 1 enemy within 5 m for 50%), Thunder Comet (the burst also strikes up to 3 enemies within 8 m for 20), Static Step (starting a roll strikes the nearest enemy within 7 m for 15), Thunderhead (every 5th bolt arcs to 3 enemies).
5. **Duo blessings** appear in an offer once the player holds a blessing from both demigods: Shatter (Moon and Starfall: crushing a chilled enemy deals double) and Plague Storm (Rot and Storm: arcs carry 2 Rot).
6. **Feedback.** Status effects tint the enemy (pale blue chill, solid blue frozen, violet weight, green rot); arcs draw as brief lightning lines; crushes and freezes have their own sounds. The HUD lists the blessings held, colored by demigod.
7. **Comet element.** The Skill slot sets the comet's element and color.

## Acceptance criteria

- [x] Offers: 3 distinct blessings from one demigod, preferring empty slots, including a duo once eligible, deterministic per seed (unit tests). Verified: `src/game/boons/offer.test.ts`.
- [x] Taking a Blessing token opens the choice; key 2 takes the second card; the slot fills; the doors open afterwards; the player cannot move or cast while choosing. Verified: `boons.spec.ts` › a Blessing token opens a choice that fills a slot.
- [x] Status math: chill stacks, slow and freeze; weight crush; rot ticks and expiry; Fester raises the cap and damage (unit tests). Verified: `src/game/boons/status.test.ts`.
- [x] Each demigod's four blessings do what their card says (one E2E test per demigod, plus one for the duos). Verified: `boons.spec.ts` › Moon Queen, Starfall General, Rot Saint, Storm Warden, duo blessings and replacing a slot.
- [x] Frozen enemies neither move nor attack; chilled enemies wind up slower. Verified: `boons.spec.ts` › Moon Queen (frozen knight stays put), chilled enemies wind up slower.
- [x] Replacing a slot removes the old blessing's effect. Verified: `boons.spec.ts` › duo blessings and replacing a slot.
- [x] Visual baselines of the choice screen and a fight with tinted enemies and an arc look right. Verified: `visual.spec.ts` › blessing choice, status effects and an arc, reviewed by eye.
- [x] 30 enemies with statuses stay within the CPU step budget; `pnpm verify` passes. Verified: `perf.spec.ts` (avg 1.08 ms, p95 2.2 ms); `pnpm progress:verify` 2026-10-27.

## Out of scope

- Rarity, upgrades of a held blessing, and boon sacrifice (post-MVP).
- Boons in the hub or meta progression (M5).
