# Workflow: write a spec

Goal: turn a request into `docs/specs/NNNN-short-name.md`, using `docs/specs/_template.md`.

1. Read `AGENTS.md` and skim existing specs to avoid duplicates and pick the next number.
2. If the request is ambiguous, ask the human up to five focused questions before writing. Prefer offering a recommended default for each.
3. Write the spec. Keep it about the player experience and the rules, not the code.
4. Acceptance criteria must each be checkable by a test or by looking at the game.
5. Set status to `draft` and stop. Ask the human to approve it (status `approved`) before planning.
