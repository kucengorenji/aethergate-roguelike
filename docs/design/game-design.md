# Aethergate: Game Design (MVP)

Status: approved (grilling session 2026-10-27)
Owner: Mikael

## Pitch

A short-session roguelike in the spirit of Hades, played as an over-the-shoulder third-person shooter in the spirit of Arc Raiders.
The world feels like a fallen golden age of demigods and fog-drowned ruins, but every name, character and design is original.
Runs last 15 to 20 minutes, death sends you back to a hub, and each run makes you a little stronger.

## Pillars

1. **Spell-slinging that feels good from the first room.** Aim, cast, dodge, and every hit lands with weight.
2. **Every run is a different build.** Room rewards from rival demigods combine into synergies.
3. **Readable melancholy.** Fog, golden light and ruined grandeur, but combat is always legible.
4. **Runs on a normal laptop.** 60 fps at 1080p on a modern integrated GPU.

## Platform and performance

- Browser first (Chrome and Edge, desktop), wrapped with Tauri or Electron for itch.io and Steam after the MVP.
- Mouse and keyboard only in the MVP.
- Target: 60 fps at 1080p on Intel Iris Xe or AMD Radeon 680M class iGPUs, with dynamic render scale down to 0.75.
- Budgets: at most 30 live enemies, 200 live projectiles and 300 draw calls per frame.

## Camera and controls

Over-the-shoulder camera behind the right shoulder, with a center crosshair and pointer lock.
The camera pushes in when it would clip into walls.

| Input       | Action                                 |
| ----------- | -------------------------------------- |
| Mouse       | Look and aim                           |
| WASD        | Move                                   |
| Left click  | Primary spell (hold for auto-fire)     |
| Right click | Ash skill (special, on cooldown)       |
| Space       | Dodge roll with invulnerability frames |
| F           | Emergency melee (staff bash)           |
| E           | Interact (doors, rewards, grace)       |
| Q           | Drink flask (heal, limited charges)    |
| Esc         | Pause and release the pointer          |

Jumping is deliberately out of the MVP.
Arenas are flat with cover and decorative height.

## Combat

- **Primary spells** are projectiles from a staff or a sacred seal, costing focus (mana) that regenerates while not casting.
- MVP spells: one staff (fast glintstone-like bolt) with two variants unlocked in the hub (charged beam, scatter shards).
- **Ash skill**: one active ability with a cooldown, swapped by boons and hub unlocks.
- **Dodge roll**: short dash with i-frames and a stamina-free cooldown, the core defensive verb.
- **Melee**: a quick staggering bash for enemies that close the gap.
- **Feedback**: hitstop, hit flash, damage numbers, camera kick, and audio on every hit.
- Enemies telegraph every attack (glow, wind-up pose, ground decal) at least 0.4 s before it lands.

## Enemies (MVP)

| Enemy          | Role                                        |
| -------------- | ------------------------------------------- |
| Hollow Soldier | Melee rusher, comes in groups               |
| Thorn Caster   | Ranged, keeps distance, forces you to move  |
| Ward Knight    | Shielded tank, must be flanked or staggered |
| Rot Hound      | Fast flanker, punishes standing still       |
| Mini-boss      | Elite variant with a second phase           |
| Boss           | Fallen demigod guarding the gate, 3 phases  |

AI is a state machine with simple steering and separation.
Arenas are flat, so no navmesh in the MVP.

## Run structure

1. Start at the first grace in the hub.
2. About 8 rooms: combat rooms drawn from a pool of about 6 handcrafted arenas, plus reward rooms.
3. Clearing a room opens 2 doors, each showing its reward type (boon, currency, flask charge, heal).
4. A mini-boss around room 5 and the boss at the end.
5. Death or victory returns you to the hub with the currency you earned.

## Boons: Remembrances of the demigods

Four rival demigods offer a pick of 1 of 3 blessings.
Each demigod has an element and a status effect, and some blessings combine across demigods.
All names are working names.

| Demigod (working name) | Element   | Status effect                   |
| ---------------------- | --------- | ------------------------------- |
| The Veiled Moon Queen  | Frost     | Chill (slow, then freeze)       |
| The Starfall General   | Gravity   | Pull and crush                  |
| The Rot Saint          | Decay     | Rot (stacking damage over time) |
| The Storm Warden       | Lightning | Chain to nearby enemies         |

MVP target: 4 blessings per demigod (primary, skill, dodge, passive), plus 2 duo blessings.

## Meta progression

The hub is a small ruined hall with a grace site.
Currency (working name: Lumen shards) buys permanent upgrades: max HP, flask charges, focus regen, and unlocking the two staff variants.
Progress is saved locally in the browser.

## World and art direction

- Original setting: a dying golden tree of light, shattered demigods, a cursed exile returning through the Aethergate.
- Stylized low-poly, flat-shaded with hand-tuned vertex color and few textures.
- Heavy distance fog, golden rim light, bloom on spells, ash particles in the air.
- Characters are built and rigged in Blender, with animations retargeted from a free library (Mixamo or Quaternius) and custom cast poses keyframed by hand.

## Audio (MVP)

Basic SFX from CC0 sources (cast, impact, dodge, enemy hurt and death, UI) and one ambient music track.

## IP rule

No names, characters, places, logos or recognizable designs from Elden Ring or any other FromSoftware game.
Inspiration is fine, imitation is not.
This keeps the game releasable and saves us from renaming later.

## Post-MVP backlog

- Jumping and vertical arenas
- Gamepad support with aim assist
- Second biome and more enemies
- More staffs and seals, more Ash skills
- Desktop wrapper and Steam release
