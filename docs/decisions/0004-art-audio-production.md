# ADR 0004: Art and audio production for M6

Status: accepted
Date: 2026-10-27

## Context

M6 replaces the graybox with real art, animation, VFX, HUD and audio, built by AI agents working in parallel.
Available tools: Blender 5.2 headless and its MCP server with the Blender skills (Claude Code), image generation built into Codex and Antigravity, and an ElevenLabs MCP server configured in the Codex profile.
The machine has 7 GB of RAM.

## Decision

- **Style:** painterly low-poly. Low-poly models (budgets per asset class in the style guide), painted gradient texture atlases, thin outlines, warm golden-hour key light, fog, bloom and a color grade.
- **Order:** concept first (style frames and turnaround sheets from image generation), a style guide from the frames Mikael approves, then production. No modeling before the style is approved.
- **3D:** headless Blender scripts in `assets-src/` are the source of truth for every model and animation; the MCP server is for inspection and quick iteration only. Humanoid animation is retargeted from the Quaternius Universal Animation Library (CC0, ADR 0003); the hound and boss specials are keyframed in the scripts.
- **Images:** built-in image generation in Codex and Antigravity. The Vertex AI path of the imgvertex skill is not available on this machine (no gcloud, no API key).
- **Audio:** ElevenLabs through the Codex profile's MCP server, on the free tier.
- **Parallelism:** at most three agents at once, each in its own Herdr pane; asset agents write only under their own `assets-src/` folder or a worktree branch; only one E2E or perf suite runs at a time.
- **Budget:** at most 40 MB of assets in the browser build, enforced by `pnpm perf`.
- **Licenses:** every asset gets a line in `assets-src/LICENSES.md` (file, source or tool, plan, date, license, commercial use).

## Consequences

- **Release blocker:** ElevenLabs free tier output is, as far as we know, not licensed for commercial use and requires attribution. Before any commercial release, the account must be upgraded and every free-tier file regenerated (or the terms confirmed otherwise). The manifest marks each such file.
- Free tier quota will throttle audio production; the audio agent prioritizes by gameplay importance and records what is left.
- Images from built-in generators can be hallucinated by the agent (claimed but not written); every image is verified on disk before it is accepted.
- Concept images are references, not shipped assets, unless the manifest says otherwise.
