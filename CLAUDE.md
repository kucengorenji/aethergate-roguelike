# CLAUDE.md

@AGENTS.md

Claude Code specifics:

- Slash commands for each SDLC phase live in `.claude/commands/` (`/spec`, `/plan`, `/build`, `/verify`). They wrap `docs/workflows/*.md`, which other agents can read directly.
- Progress tracking uses the `progress` skill in `.claude/skills/progress/`. Run it at session start, after every work step, and before handing back.
