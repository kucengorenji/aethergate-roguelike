# 0006: Ash skill (plan)

Spec: docs/specs/0006-ash-skill.md

## Approach

- The comet is a new projectile kind in the existing pool, so it flies, interpolates and collides like bolts. Its fuse (`life`) is set to the distance to the aim point divided by its speed, so it bursts exactly there when nothing is hit first.
- A burst is a pure area query (`combat/burst.ts`): enemies whose hurtbox center is within radius plus hurtbox radius. It reuses `applyDamage` with the burst center as the source, so guards, knockback, flashes and numbers work unchanged.
- The player gets a `skill` component (kind, element, cooldown). `systems/skill.ts` handles input and casting; the projectile system calls the burst when a comet ends for any reason.
- Bursts are a third impact kind with a larger flash. The HUD draws the cooldown with a CSS conic gradient.

## Changes

| File                                                                  | Change                            |
| --------------------------------------------------------------------- | --------------------------------- |
| `src/game/config.ts`, `components.ts`                                 | Comet tunables; `skill` component |
| `src/game/combat/projectiles.ts`, `burst.ts`                          | Comet kind; burst area query      |
| `src/game/systems/skill.ts`, `projectiles.ts`, `projectile-render.ts` | Cast, burst on end, render        |
| `src/game/entities/player.ts`, `systems/restart.ts`                   | Skill state on spawn and reset    |
| `src/game/ui/hud.ts`, `index.html`, `style.css`                       | Skill icon with cooldown sweep    |
| `tests/e2e/skill.spec.ts`, `visual.spec.ts`                           | Skill tests and baseline          |

## Tests

| Acceptance criterion | Test                                               |
| -------------------- | -------------------------------------------------- |
| One cast, cooldown   | `skill.spec.ts` › "right click hurls one comet"    |
| Group burst          | `skill.spec.ts` › "a burst hits the whole group"   |
| Ground burst         | `skill.spec.ts` › "comets burst at the aimed spot" |
| Cover                | `skill.spec.ts` › "cover stops comets"             |
| Not mid-dodge        | `skill.spec.ts` › "no comet mid-roll"              |
| HUD                  | `skill.spec.ts` › "the icon shows the cooldown"    |
| Unit                 | `burst.test.ts`                                    |
| Visual               | `visual.spec.ts` › "comet burst"                   |

## Changes during build

- `advanceUntil` predicates run in the page, so they cannot use test-file constants; the comet tests inline the projectile kind.
- The HUD gained a row for flasks and the skill icon, so every visual baseline changed in the HUD only (checked in the diff) and was re-recorded.
