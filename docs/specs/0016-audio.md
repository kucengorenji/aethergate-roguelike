# 0016: Sound effects, music, ambience and voice

Status: in-progress
Owner: Mikael (built by a Codex audio agent in a Herdr pane, through the ElevenLabs MCP server)

## Problem

Every sound in the game is a placeholder generated in code (`registerSounds` in `src/game/index.ts`), there is no music and no ambience, and the demigods and bosses are silent.
M6's exit check asks that a minute of play sounds like a game.
ADR 0004 decided that all audio comes from ElevenLabs, on the free tier for now, with every file recorded so it can be regenerated after an upgrade.

## Behavior

### Sound effects

Every existing sound keeps its name, so no call site changes; only the registration swaps a synth recipe for a file.
New sounds are added where the game has an event but no sound yet.
Style: grounded, physical and a little dry (stone, cloth, metal, wood, glass), with magic as bright tonal layers on top; never cartoonish, never sci-fi.

| Name              | Event                         | Direction                                                   |
| ----------------- | ----------------------------- | ----------------------------------------------------------- |
| `step`            | Player footstep               | Soft leather boot on dusty stone, a few variations by pitch |
| `cast`            | Player bolt                   | Short glassy crystal chime with an airy whoosh              |
| `hit`             | Bolt hits an enemy            | Crisp crystal shatter on armor and cloth                    |
| `wall`            | Bolt hits stone               | Small crystal tick and stone dust                           |
| `dodge`           | Player dodge                  | Fast cloth whoosh with a faint magical shimmer              |
| `hurt`            | Player takes damage           | Dull body impact with a short breath, no voice words        |
| `empty`           | Cast with no focus            | Dry muted click of a spent crystal                          |
| `flask`           | Drinking the flask            | Cork, gulp and a warm golden swell                          |
| `swing`           | Enemy melee swing             | Heavy rusty blade whoosh                                    |
| `slam`            | Heavy slam or shockwave       | Deep stone impact with debris                               |
| `orb`             | Enemy orb or totem shot       | Low ember whoomp, fire crackle                              |
| `block`           | Ward Knight blocks            | Metal shield clang                                          |
| `guardbreak`      | Guard broken                  | Cracking metal and a staggered grunt-free clatter           |
| `wave`            | A new wave spawns             | Low rising rumble of ash and wind                           |
| `freeze`          | Chill freezes an enemy        | Ice crystallizing and cracking                              |
| `crush`           | Gravity crush                 | Compressed thud with a low gravitational hum                |
| `pull`            | Gravity pull                  | Rising inward suction hum                                   |
| `burst`           | Gravity burst                 | Big detonation of violet starlight, deep boom               |
| `zap`             | Storm chain                   | Sharp electric crackle                                      |
| `comet`           | Comet skill                   | Heavy falling rush and a bright impact tail                 |
| `blessing`        | A blessing is chosen          | Choir-like golden shimmer, short and reverent               |
| `reward`          | A room reward appears         | Soft golden chime                                           |
| `pickup`          | A reward is collected         | Bright rising chime                                         |
| `doors`           | Doors unlock after a clear    | Stone grinding open with a golden hum                       |
| `door`            | Stepping through a door       | Deep whoosh of golden light                                 |
| `cleared`         | Room cleared                  | Short resolved brass-and-choir sting                        |
| `death` (new)     | An enemy dies                 | Armor and bones collapsing into ash                         |
| `spawn` (new)     | An enemy appears              | Ash swirling into a body, a low hiss                        |
| `bite` (new)      | Rot Hound lunge               | Snarl and snapping jaws                                     |
| `meteor` (new)    | Boss meteor falls             | Rushing fire from above ending in an impact                 |
| `phase` (new)     | A boss changes phase          | Deep resonant boom with a violet shimmer                    |
| `defeat` (new)    | The player dies               | Fading heartbeat and a hollow low tone                      |
| `victory` (new)   | The final boss falls          | Long golden sting                                           |
| `ui-move` (new)   | Menu focus moves              | Tiny soft stone tick                                        |
| `ui-select` (new) | Menu button pressed           | Small warm chime                                            |
| `ui-back` (new)   | Menu back or close            | Soft lower tick                                             |
| `upgrade` (new)   | Buying an upgrade in the hall | Shards dissolving into a golden swell                       |
| `equip` (new)     | Taking a staff from the rack  | Wooden staff lifted, crystal hum                            |
| `grace` (new)     | Using the grace site          | Warm breath of light, quiet                                 |

### Music

Three looping tracks, original, orchestral dark fantasy (low strings, choir, solo cello, sparse percussion), no lyrics.

- **Hall:** calm and melancholy, a little hopeful, about 90 seconds.
- **Combat:** driving but not frantic, about 120 seconds; its intensity follows the fight (see below).
- **Boss:** grand and threatening, choir and drums, about 120 seconds.

Music changes with a crossfade of about 1.5 seconds when the player enters the hall, a combat room or the boss arena.
Combat intensity: with few enemies left the combat track plays through a low-pass filter and slightly quieter; as more enemies are alive it opens to full, smoothly.
Music never restarts when the same track is already playing.

### Ambience

A looping bed per place, under the music: the hall (soft wind, distant embers, a faint hum from the grace site), combat rooms (wind through ruins, ash, distant crows), the boss arena (fire crackle, low rumble).

### Voice

Short lines, original wording, no names or phrases from any existing game.
Each demigod speaks one line when its blessing choice opens, chosen at random from its two lines; each boss speaks an intro line when the fight starts, a phase line, and a death line.
Subtitles show the line at the bottom of the screen while it plays.
Music ducks under voice.

| Speaker               | Voice                         | Lines                                                                                                                                           |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The Veiled Moon Queen | Cold, calm, quiet older woman | "Take my frost, exile, and let them sleep." / "The moon remembers you. Do not waste her."                                                       |
| The Starfall General  | Weary, commanding older man   | "Fall like the stars fell. All at once." / "Carry my weight, if your arms can bear it."                                                         |
| The Rot Saint         | Soft, kind, wrong; whispering | "Everything rots in time. I only hurry it." / "Let them bloom, child. Let them bloom."                                                          |
| The Storm Warden      | Sharp, proud, loud            | "Strike once, and let the sky strike again." / "Do not hesitate. Lightning never does."                                                         |
| The Ward Captain      | Rigid, dutiful, armored echo  | Intro: "No exile passes this gate while I stand." Phase: "I swore an oath. I will not break before you." Death: "The gate... is yours to keep." |
| The Starfallen Knight | Huge, slow, echoing           | Intro: "I fell from the sky to guard this ending." Phase: "Then let the heavens fall with me." Death: "At last... the stars go quiet."          |

### Mix

- Four buses into the master volume: effects, music, ambience and voice, each with its own gain in `config.ts`.
- All files are loudness-matched within their category, so no single sound jumps out.
- The existing volume setting (spec 0012) keeps controlling the master.
- Files load lazily per place, so the first room does not wait for the boss music.

## Acceptance criteria

- [ ] Every sound in the table plays from a file, and the new sounds play at their events; `sounds.test.ts` still finds every played name registered.
- [ ] The hall, combat and boss tracks play in their places with crossfades, and combat intensity follows the number of living enemies (unit test on the intensity mapping, E2E on the active track per place).
- [ ] Each place has its ambience loop.
- [ ] Each demigod line plays when its blessing choice opens and each boss line at its moment, with a subtitle; music ducks under voice.
- [ ] Every audio file is under `public/assets/audio/`, its raw generation under `assets-src/audio/`, and each has a line in `assets-src/LICENSES.md` marked as ElevenLabs free tier (regenerate before a commercial release, ADR 0004).
- [ ] The exact prompt, voice, settings and credit cost of every generation are recorded in `assets-src/audio/prompts.md`, so every file can be regenerated.
- [ ] Total audio stays within the 40 MB asset budget with room for models and textures (target at most 12 MB), and `pnpm perf` passes.
- [ ] `pnpm verify` passes, and a recorded minute of play (hall, a combat room, a boss intro) sounds coherent to Mikael.

## Out of scope

- Separate volume sliders per bus in the settings menu (the HUD and menu restyle may add them).
- Spatial 3D audio and reverb zones.
- Footstep surfaces other than stone.

## Open questions

- Music generation may not be available on the ElevenLabs free tier; the audio agent checks first and reports, and Mikael decides between upgrading and another source.
- The free tier's monthly credits may not cover everything; the agent spends them in this order: the sound effects that play most often, then voice lines (cheap, priced per character), then the remaining effects, then ambience, then music.
