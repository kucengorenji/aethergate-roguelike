# Workflow: write a plan

Goal: turn an approved spec into `docs/plans/NNNN-short-name.md`, using `docs/plans/_template.md`.

1. Read the spec, `AGENTS.md` and `docs/architecture.md`, then read the code the change touches.
2. Design with the existing patterns: components as data, one system per job, tunables in `config.ts`, determinism via `ctx.rng` and fixed steps.
3. List every file to create or change, the order systems run in, and the tests (unit and E2E) that prove each acceptance criterion.
4. Note risks: performance (allocations, draw calls, bundle size), determinism, and overlap with other open plans.
5. Stop and ask the human to approve the plan. Small, low-risk plans may proceed if the human said so.
