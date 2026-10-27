---
name: progress
description: Check and update Aethergate development progress (milestone checkboxes, progress log, verify result, HTML dashboard). Use at the start of every session to see where the project is, after every work step (spec, plan, build step, fix, decision), and before handing work back to the human. Also use when asked about progress, status, what is next, or the dashboard.
argument-hint: '[check | update <what changed> | verify]'
---

Follow `docs/workflows/progress.md` exactly. It is the agent-agnostic source; this skill only wraps it.

Modes (from the argument, default `check`):

- `check`: run `pnpm progress`, then read `docs/milestones.md` (current milestone = first one not fully `[x]`) and the newest entries of `docs/progress/log.md`. Report in 2-4 lines: current milestone and its done/total, the task in progress, the next task, and whether the last verify is passing or stale.
- `update <what changed>`: edit `docs/milestones.md` markers (`[~]` when starting, `[x]` when done and verified), add a one-line entry at the top of today's section in `docs/progress/log.md` (create `## YYYY-MM-DD` if missing), then run `pnpm progress`.
- `verify`: run `pnpm progress:verify`. If it fails, log the failure and fix it before marking anything done.

Rules:

- Never mark a task or exit check `[x]` without evidence (tests, `pnpm verify`, or playing the build). Say what the evidence was in the log entry.
- Never edit `docs/progress/dashboard.html` or `docs/progress/verify.json` by hand.
- Use today's real date. Follow the user's writing rules (no em dash, one sentence per line in long Markdown).
- After updating, give the human the summary line printed by `pnpm progress` and the dashboard path `docs/progress/dashboard.html`.
