# Workflow: verify

Goal: prove the change does what the spec says, and nothing else broke.

1. Run `pnpm progress:verify` (runs `pnpm verify` and records the result for the dashboard). Fix every failure, including ones that look unrelated.
2. Run the game (`pnpm dev`) or a Playwright script and look at the result. Check:
   - the new behavior from the player's point of view,
   - the console is free of errors and warnings,
   - nothing looks off: overlapping UI, clipped text, z-fighting, flicker, wrong colors, layout at narrow widths.
3. Open the debug overlay (backquote) and compare FPS, CPU and GPU time against `main` for anything render-heavy.
4. If visual baselines changed on purpose, run `pnpm e2e:update` and inspect every changed image.
5. Tick each acceptance criterion in the spec, noting how it was verified (test name or screenshot).
6. Set the spec status to `done` and open a PR using `docs/workflows/pull-request.md`.
7. Mark the milestone task `[x]` in `docs/milestones.md` with the spec number, add a log line, and run `pnpm progress`.
