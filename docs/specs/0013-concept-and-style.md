# 0013: Concept art and style direction

Status: in-progress
Owner: Mikael (concept by two image agents in Herdr panes, Codex and Antigravity)

## Problem

M6 replaces every graybox asset.
Without one approved look, parallel asset agents would drift apart.
This spec produces the references the style guide and all asset work follow.

## Art direction (shared brief for every image)

- **Game:** Aethergate, a third-person spell-shooter roguelike. The camera sits behind the right shoulder of a hooded sorcerer with a staff.
- **World:** an original dark fantasy of a fallen golden age: ruined courtyards of pale stone, broken arches and pillars, graves and roots, ash in the air, and on the horizon a colossal glowing golden tree. Melancholy and grand. No names, symbols or designs from Elden Ring or any FromSoftware game.
- **Style:** painterly low-poly. Clearly faceted low-poly shapes with soft painted gradients on them (not photoreal, not plastic), thin dark outlines, strong silhouettes.
- **Light:** low golden-hour sun, warm haze and fog, long soft shadows, bloom on magic.
- **Palette:** warm gold and amber light; ash-beige and grey-brown stone; dusty blue-grey sky toward the zenith; magic colors: pale blue glintstone bolts (player), orange-red eyes and telegraphs (enemies), green thorn magic (casters), violet starlight (the boss).
- **Readability:** enemies and telegraphs must read instantly against the stone; the player is dark violet-robed with a gold sash.

## Round A: direction (both agents, same shots)

1. The Kindled Hall: a small ruined hall at dusk, a glowing grace site (a sapling of golden light on a stone ring), an altar with a floating blue crystal, a rack of three staffs; the hooded sorcerer seen from behind the right shoulder.
2. A combat room: a ruined courtyard with cover, the sorcerer casting a pale blue bolt at a group of hollow armored soldiers with glowing orange eyes, a thorn-crowned robed caster with a green gem in the back, the giant golden tree on the horizon through haze.
3. The boss arena: the Starfallen Knight, a towering dark armored knight with violet star points across its armor and a huge blade, meteors falling onto glowing orange ground markers, the arena edge burning.
4. A lineup sheet: the sorcerer, the Hollow Soldier, the Thorn Caster, the Ward Knight (tower shield), the Rot Hound (lean, low, ash-furred), the Ward Captain (gilded, crested) and the Starfallen Knight, side by side to scale, neutral background.

Mikael picks a direction (one agent's frames, or a mix with notes).

## Round B: production references (the chosen direction)

- Turnaround sheets (front, side, back, three-quarter; neutral A-pose; plain grey background) for the sorcerer and each enemy and boss.
- An environment kit sheet: wall segments, pillars (whole and broken), an arch, floor tiles, rubble, graves, tree roots, a brazier, the door arch, reward tokens.
- A HUD and icon sheet: health and focus bar frames, flask icon, comet skill ring, four demigod sigils (moon, falling star, rot, storm), reward icons (blessing, shards, heal, flask), boss bar frame.

## Acceptance criteria

- [ ] Round A: four frames from each agent exist on disk, with the exact prompts recorded next to them.
- [ ] Mikael has chosen a direction.
- [ ] Round B references exist on disk in the chosen direction, with prompts recorded.
- [ ] `docs/design/style-guide.md` turns the chosen frames into rules for models, materials, palette, lighting, outlines and UI.
- [ ] Every image has a line in `assets-src/LICENSES.md`.

## Out of scope

- Any shipped asset; these are references only.
