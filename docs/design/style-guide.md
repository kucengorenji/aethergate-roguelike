# Aethergate visual style guide

Status: ready for Mikael's review (Round A and Round B references complete)
Source: the Codex frames Mikael approved on 2026-10-27 (spec 0013), ADR 0004.

This guide turns the concept frames into rules an asset script, a shader or a HUD panel can follow.
When a frame and this guide disagree, this guide wins, because the frames are illustrations and the game is a low-poly model running at 60 fps on an integrated GPU.

## References

| Image                                             | Canonical for                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `assets-src/concept/round-a/codex-1-hall.webp`    | Kindled Hall mood, grace site, golden-hour light                        |
| `assets-src/concept/round-a/codex-2-combat.webp`  | Combat room mood, readability of enemies against stone, the player bolt |
| `assets-src/concept/round-a/codex-3-boss.webp`    | Boss arena mood, telegraph rings, meteors, violet starlight             |
| `assets-src/concept/round-a/codex-4-lineup.webp`  | Relative scale and silhouettes of all seven characters                  |
| `assets-src/concept/round-b/codex-turn-*.webp`    | Modeling reference per character (front, three-quarter, side, back)     |
| `assets-src/concept/round-b/codex-kit-ruins.webp` | Modular ruin kit pieces                                                 |
| `assets-src/concept/round-b/codex-kit-hall.webp`  | Kindled Hall stations and the distant tree card                         |
| `assets-src/concept/round-b/codex-hud-sheet.webp` | HUD frames, icons and sigils                                            |

## Pillars

1. **Melancholy grandeur.** A fallen golden age at the last hour of sunset: warm light, long shadows, haze, ash in the air.
2. **Readability first.** Every threat reads in a fraction of a second against the stone, from behind the player's shoulder, at a distance of 30 m.
3. **Buildable.** Big shapes, flat facets and painted gradients that a headless Blender script can produce, not illustration detail.

## Color language

Color carries gameplay meaning, so each hue family belongs to one owner.

| Hue         | Owner                                                                                                      | Never used for                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Pale blue   | The player's magic (bolts, staff crystal, comet core) and the upgrade crystal                              | Enemies, the environment                                      |
| Orange-red  | Enemy threat: eyes, telegraphs, the core of every enemy projectile (the caster's too), burning arena edges | Friendly fire, decoration, braziers                           |
| Green       | The Thorn Caster's gem and its casting glow                                                                | Anything else, including the rot blessing                     |
| Violet glow | Starlight: the Starfall General's blessings and the Starfallen Knight                                      | The player's robe is dark, desaturated violet and never glows |
| Gold        | The world and everything friendly: grace, doors, rewards, trim, the great tree, UI                         | Threats                                                       |

Consequences:

- The environment stays desaturated (stone, wood, roots), so magic and threats are the most saturated things on screen.
- Braziers and torches burn golden yellow, not orange-red, so fire never reads as a telegraph.
- The heal reward is a deep crimson inside a gold ring, kept cooler and darker than threat orange.
- Blessings tint the player's magic in their demigod's color: moon `#8fd3ff`, star `#b48cff`, rot `#b5a642`, storm `#ffe066` (`DEMIGODS` in `src/game/boons/data.ts`).
  Rot moves from `#9bc53d` to a muted ochre-olive, so a rotting enemy never reads as a Thorn Caster.
- Anything that can hurt the player has an orange-red core, whatever its owner's color, so threats read the same everywhere.

## Palette

Values are sRGB.
The existing `config.colors` already matches the frames closely; only the robe and hood move toward the frames' deeper violet.
`k-means` samples from the four frames are noted where they anchor a value.

| Role                           | `config.colors` key   | Value                     | Notes                                                       |
| ------------------------------ | --------------------- | ------------------------- | ----------------------------------------------------------- |
| Sky zenith                     | `skyZenith`           | `#8c8f99`                 | Dusty blue-grey, frames sample `#8a8d96`                    |
| Sky horizon                    | `skyHorizon`          | `#e9cf9b`                 | Warm haze band at the horizon                               |
| Fog and haze                   | `fog`                 | `#c9b48c`                 | Frames sample `#c8ac82` near the sun                        |
| Sun                            | `sun`                 | `#ffdcaa`                 | Low warm key light                                          |
| Stone, lit                     | `pillar`              | `#c4b89c`                 | Ash-beige, frames sample `#baa08c`                          |
| Stone, walls                   | `wall`                | `#b2a894`                 |                                                             |
| Stone, floor                   | `floor`               | `#8d8478`                 |                                                             |
| Stone, cover                   | `cover`               | `#9c917f`                 |                                                             |
| Stone, trim and shadowed faces | `trim`                | `#7f776b`                 |                                                             |
| Deepest shadow                 | none                  | `#1e1410`                 | Warm, never pure black; also the outline color              |
| Gold accent (inlay, UI)        | `accent`              | `#d8a548`                 |                                                             |
| The great tree                 | `tree`                | `#f7d98a`                 |                                                             |
| Player robe                    | `robe`                | `#4e3a6b` (was `#5b4f66`) | Deeper violet, as in the frames and the sorcerer turnaround |
| Player hood                    | `hood`                | `#2f2540` (was `#3d3446`) |                                                             |
| Player bolt                    | `bolt`                | `#7cc8ff`                 | Core `#e6f4ff`                                              |
| Enemy glow and telegraphs      | `enemyGlow`, `marker` | `#ff7a3d`, `#ff5a2a`      |                                                             |
| Thorn caster magic             | `casterGlow`          | `#9be05a`                 |                                                             |
| Boss starlight                 | `starGlow`            | `#c9a2ff`                 |                                                             |

## Shapes

- Faceted low-poly: flat shading, visible planes, no smoothing groups on stone or armor.
  Cloth and fur may use a few smoothed faces where a hard facet would look broken.
- Chunky and slightly exaggerated: heavy bases, thick slabs, big hands and weapons, so silhouettes survive at range and at low resolution.
- Stone is cut into irregular blocks with one chamfer on exposed corners; ruins break in stepped chunks, not noisy fractures.
- Gold inlay lines run up pilasters and around tiles, sparingly, as in the kit sheet: one or two lines per piece.
- Cloth is a few large tattered panels with three to six zig-zag hem points, never many thin strips.
- Fine detail from the frames (filigree, cracks, small spikes, chains) is either painted into the texture or dropped.

## Polygon budgets

Triangles per asset after export.
`pnpm perf` enforces the per-file budgets listed in `perf-budget.json`; new assets add their line there.

| Class                                                      | Triangles                                            | Bones      |
| ---------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| Player                                                     | at most 4000                                         | at most 40 |
| Regular enemy (soldier, caster, knight, hound)             | 1500 to 3000                                         | at most 32 |
| Boss (Ward Captain, Starfallen Knight)                     | 3000 to 6000                                         | at most 48 |
| Kit piece (wall, pillar, arch, floor, rubble, grave, root) | 50 to 400                                            | none       |
| Hall station (grace site, altar, staff rack)               | at most 1500                                         | none       |
| Reward token, pickup                                       | at most 300                                          | none       |
| Distant tree                                               | a camera-facing card or a very low mesh, at most 500 | none       |

## Materials and textures

- One shared environment material with a painted gradient atlas (at most 1024 px, WebP or KTX2): each swatch is a vertical gradient, lighter on top and darker toward the base, and kit UVs are placed on swatches.
  All kit pieces share it, so a room batches into few draw calls.
- Characters use one atlas each, at most 512 px, painted the same way.
- No normal maps and no metal-roughness maps.
  Stone, cloth, wood and fur use roughness 0.9 and metalness 0; armor uses roughness 0.6 and metalness at most 0.2, because there is no environment map to reflect.
- Vertex colors add per-instance tone variation and a darker base (the bottom 20 percent of tall pieces), so repeated pieces do not tile visibly.
- Emissive is reserved for owners of the color language: magic, eyes, the grace site, doors, crystals, rewards.
  Only emissive above an HDR intensity of 1 blooms, so lit stone never glows.

## Outlines

- Thin, warm-dark (`#1e1410`) inverted-hull outlines on characters, bosses, stations and pickups, so they separate from the stone.
- Thickness in world units: 1.2 cm on regular characters and the player, 2 cm on bosses, 1 cm on stations and pickups.
- The environment kit gets no outline; its facets and the fog carry it.
- Low quality draws outlines on characters and bosses only.

## Lighting and atmosphere

- One low sun, 15 to 25 degrees above the horizon, warm `sun` color, casting long soft shadows across each room.
  Shadow map 2048 on High, 1024 on Medium, off on Low (contact darkening comes from the vertex-color base).
- A hemisphere fill from warm sky to brown ground, as in `src/game/entities/level.ts`.
- Linear fog in the `fog` color from about 25 m to 110 m, so ruins fade into the haze and the great tree stays visible outside the fog.
- Ash particles drift in every room and in the hall.
- Post: ACES tone mapping, restrained bloom on emissive only, a warm color grade (golden highlights, slightly violet-brown shadows) and a light vignette.
  Low quality turns bloom off.
  VFX and post-processing are built in spec 0014.

## Characters

Silhouette rules for every character, so each reads by shape alone:

| Character         | Silhouette                                                               | Glow                     |
| ----------------- | ------------------------------------------------------------------------ | ------------------------ |
| Sorcerer (player) | Tall hood, wide robe flaring to a ragged hem, staff taller than the head | Staff crystal, pale blue |
| Hollow Soldier    | Hunched, gaunt, sword low, plates over a thin frame                      | Eyes, orange-red         |
| Thorn Caster      | Tall and narrow, thorn crown, long robe, staff with a gem                | Gem and magic, green     |
| Ward Knight       | Wide and square, tower shield as tall as the body                        | Eye slit, orange-red     |
| Rot Hound         | Low and long, spiky ridge along the back                                 | Eyes, orange-red         |
| Ward Captain      | Tall fan crest, long gold cloak, longsword                               | Eyes, orange-red         |
| Starfallen Knight | About twice the player's height, jagged plates, huge greatsword          | Star points, violet      |

Scale: the player is 1.8 m tall (the gameplay capsule); every other character keeps the proportions of the lineup frame.

Build notes from the turnaround sheets:

- **Sorcerer:** the robe is the deeper violet of the palette with gold sash and trim; the hood hides the face completely (a dark void, no features to model); hands are dark gloves; the twisted staff carries the pale blue crystal in a forked head.
- **Hollow Soldier:** a skull face inside an open helm, bronze-brown plates with rust patches, rust-red tattered cloth kept desaturated (it must not read as threat orange); the eyes are the only glow.
- **Thorn Caster:** pale green-grey face, robe in layered dusty green and beige panels over a dark violet-grey underskirt, thorn vines as a few thick spiral tubes, not many thin ones; the crown is a ring of thorns behind the head.
- **Ward Knight:** stone-grey armor with gold trim only, so the Ward Captain stays the one gilded figure (the turnaround sheet is too gold; desaturate it toward `pillar` and `trim`); the tower shield is a separate rigid piece on the left arm.
- **Rot Hound:** ash-brown fur as large spiky shards along the back and tail, ribs as a few painted ridges, long thin legs; the only humanoid-free rig, keyframed by hand (ADR 0004).
- **Ward Captain:** full bright gold armor, the fan crest and the long gold cloak are its silhouette; the cloak is two or three large panels.
- **Starfallen Knight:** dark bronze-grey jagged plates, a cape in dusty violet panels, star points as small emissive quads in `starGlow`, the greatsword blade emissive violet along its edge.

## Environment kit

- Built on a 1 m grid, matching the arena layouts in `src/game/arenas/`: walls 4 m tall and 0.8 m thick in 2 m and 4 m segments, pillars 1.2 m square and 4.5 m tall (broken ones shorter), floor tiles 2 m, low cover 0.5 to 0.9 m tall.
- Pieces snap and scale along their length, so any box in a layout can be dressed from the kit.
- Every room keeps the graybox colliders; the kit only replaces what is drawn.

## UI

- Gold-on-dark: thin gold (`--accent`, `#d8a548`) frames over dark warm iron panels, light parchment text (`--hud-fg`, `#f1e9da`), the existing Georgia serif.
- Ornament stays at the frame corners and ends; bar interiors and icon backgrounds stay plain so values read instantly.
- Icons are flat painted shapes in gold on dark, legible at 32 px, one line weight across the set.
- The four demigod sigils (moon, falling star, rot, storm) tint boons and their VFX.
