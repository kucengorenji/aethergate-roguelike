# Team workflow

## Branching

Trunk-based: `main` is always green and playable.
Work on short-lived branches (`feat/0007-boost-pad`, `fix/jump-double-trigger`) and merge within a few days.
Rebase on `main` before opening a PR.

## Commits

Conventional Commits, checked by commitlint on every commit: `feat:`, `fix:`, `perf:`, `refactor:`, `test:`, `docs:`, `chore:`, `build:`, `ci:`.
Git hooks (lefthook) run format, lint and typecheck on commit, and unit plus E2E tests on push.
Never bypass them with `--no-verify`; fix the cause.

## Reviews

Every PR is reviewed by a human, even when written by an agent.
Reviewers read the spec and plan first, then the diff.
Look for: does it meet the acceptance criteria, does it follow the architecture rules, is anything unrelated changed, are tests meaningful.

## Avoiding conflicts

- One system per file, one feature per spec, so most PRs touch different files.
- `src/game/index.ts`, `components.ts` and `config.ts` are shared hot spots. Keep edits there small and additive.
- Plans list the files they touch. Check open plans before starting one that overlaps.

## Setup for a new teammate

```bash
nvm use            # Node 24, from .nvmrc
corepack enable    # uses the pnpm version pinned in package.json
pnpm install       # also installs git hooks
pnpm exec playwright install chromium
pnpm dev
```

## When CI is added

`pnpm verify` is the whole gate, so a CI job only needs Node 24, `pnpm install --frozen-lockfile`, `pnpm exec playwright install --with-deps chromium` and `pnpm verify`.
Visual baselines are rendered on Linux. Generate and update them on Linux (or in the CI container) so pixels match.
