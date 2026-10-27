# AI-agent SDLC: Spec, Plan, Build, Verify

This is how features get from an idea to `main` when most code is written by AI agents.
Humans own the **what** and the **approval**, agents own the **how**, and the quality gate (`pnpm verify`) is the referee.

## Why this flow

Vibe coding without structure tends to drift: agents solve the wrong problem, change unrelated code, or declare victory without checking.
Each phase below produces a small written artifact, so intent is reviewable before code exists and "done" is checkable after.
The artifacts also give the next agent (or teammate) the context a cold start would lack.

## Phases

| Phase  | Input                              | Output                                      | Who approves       | Suggested model class     |
| ------ | ---------------------------------- | ------------------------------------------- | ------------------ | ------------------------- |
| Spec   | An idea, bug report or design note | `docs/specs/NNNN-name.md`                   | Human              | Strongest reasoning model |
| Plan   | Approved spec                      | `docs/plans/NNNN-name.md`                   | Human (quick skim) | Strongest reasoning model |
| Build  | Approved plan                      | Code, tests, small commits on a branch      | `pnpm verify`      | Fast implementation model |
| Verify | Built branch                       | Ticked acceptance criteria, screenshots, PR | Human code review  | Strongest reasoning model |

Use the cheapest model that can do the job: specs and plans need judgment, building from a clear plan does not.
Escalate to a stronger model after two failed attempts instead of retrying the same one.

### 1. Spec (`docs/workflows/spec.md`)

Describe the feature from the player's point of view.
Acceptance criteria must be observable and testable ("pressing Space mid-air does nothing"), not implementation details.
Numbering: next free four-digit number in `docs/specs/`.

### 2. Plan (`docs/workflows/plan.md`)

Map the spec onto the architecture: which components, systems, entities, config values and tests.
List the files that will change, which tells reviewers and other teammates where conflicts could happen.
Call out risks and open questions instead of guessing.

### 3. Build (`docs/workflows/build.md`)

Follow the plan.
If the plan turns out wrong, update the plan file first and say why, then continue.
Commit in small Conventional Commits.
Tests are written with the code, not afterwards.

### 4. Verify (`docs/workflows/verify.md`)

Run `pnpm verify`.
Then look at the game: run it, take screenshots of the new behavior, and check the console.
Tick each acceptance criterion in the spec with how it was verified.
Open the PR using the template in `docs/workflows/pull-request.md`.

### 5. Progress (`docs/workflows/progress.md`)

After every phase and every build step, update `docs/milestones.md` and `docs/progress/log.md`, then run `pnpm progress`.
The dashboard at `docs/progress/dashboard.html` is how the human sees where things stand.

## Small changes

A typo or a one-line fix with an obvious cause can skip Spec and Plan.
Bugs still start by reproducing them, ideally as a failing E2E test, before fixing.
Verify is never skipped.

## Running agents in parallel

Each agent works on its own branch and its own spec.
Use `git worktree add ../aethergate-<name> -b <branch>` so agents don't share a working directory.
Plans list the files they touch, so two plans touching the same system are a signal to sequence them.
E2E and perf suites are CPU-bound (software rendering), so two agents running them at once slow each other down and make perf numbers meaningless.
Run `pnpm perf` (and the final `pnpm verify`) when no other agent is running a suite, and treat a perf failure measured under load as unproven until rerun alone.
