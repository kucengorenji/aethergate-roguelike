# Workflow: progress

Goal: the dashboard always tells the truth about where the game is.
Progress is updated after every work step, not at the end of a milestone.

## Sources of truth

| File                           | What it holds                                                 | Who writes it          |
| ------------------------------ | ------------------------------------------------------------- | ---------------------- |
| `docs/milestones.md`           | Milestones, tasks and exit checks as checkboxes               | Agents and humans      |
| `docs/progress/log.md`         | One line per work step, newest first                          | Agents and humans      |
| `docs/specs`, `docs/plans`     | Status lines (`Status: draft`, ...)                           | SDLC workflows         |
| `docs/progress/verify.json`    | Last `pnpm verify` result and budget numbers (ignored by git) | `pnpm progress:verify` |
| `docs/progress/dashboard.html` | Generated page (ignored by git), never edited by hand         | `pnpm progress`        |

## When to update

- **Start of a session:** run `pnpm progress`, read the current milestone and the last log entries, and pick up from there.
- **Starting a task:** mark it `[~]` in `docs/milestones.md`.
- **After every work step** (a spec or plan written, a plan step built, a bug fixed, a decision made): add a log line.
- **Task finished and verified:** mark it `[x]`, mention its spec (`spec 0002`) in the task text if it has one.
- **Exit check:** mark `[x]` only after actually playing the build and confirming the exit statement. Note how in the log.
- **Scope change:** add, split or move tasks in `docs/milestones.md` and log why. Never delete a done task.
- **Before handing back to the human:** run `pnpm progress:verify` (or `pnpm progress` if verify already ran on this code), and report the dashboard summary line.

## Formats

Tasks in `docs/milestones.md`:

```md
- [ ] not started
- [~] in progress (spec 0002)
- [x] done
- [ ] **Exit:** the playable statement that closes the milestone.
```

Log entries in `docs/progress/log.md`, under a `## YYYY-MM-DD` heading (newest date at the top):

```md
- M1: Mouse look works with pointer lock, spec 0002 done, verify green.
- --: Fixed a flaky visual test unrelated to any milestone.
```

Keep each entry to one line that a teammate understands without opening the code.
The parser tests in `scripts/progress/parse.test.mjs` read the real files, so `pnpm test` fails on a malformed edit.

## Commands

- `pnpm progress`: regenerate `docs/progress/dashboard.html` (fast, no tests).
- `pnpm progress:verify`: run `pnpm verify`, record the result and budget numbers, then regenerate.

The dashboard marks a verify result as stale when code or config changed after it was recorded.
