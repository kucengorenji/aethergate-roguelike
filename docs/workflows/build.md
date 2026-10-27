# Workflow: build

Goal: implement an approved plan on a branch.

1. Create a branch `feat/NNNN-short-name` (or `fix/...`) from up-to-date `main`.
2. Implement step by step. After each step run the fast checks: `pnpm typecheck && pnpm lint && pnpm test`.
3. Write tests together with the code. For bugs, write the failing test first.
4. If reality differs from the plan, update the plan file with what changed and why.
5. Commit small Conventional Commits. Never commit with failing checks, and never bypass hooks.
6. After each step, update progress (`docs/workflows/progress.md`): task marker in `docs/milestones.md` and a line in `docs/progress/log.md`.
7. Do not touch code unrelated to the plan, except for fixing broken lint or flaky tests you run into (mention it in the PR).
