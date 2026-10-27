# ADR 0001: Tech stack

Status: accepted
Date: 2026-10-27

## Context

We want a browser game starter that favors runtime performance, works for both 3D and 2.5D games, and is easy for a small team of developers working with AI agents.

## Decision

- **Three.js with `WebGPURenderer`**: a rendering library rather than a full engine, so we only ship what we use. WebGPU where available, automatic WebGL 2 fallback. Very well known to AI models.
- **Rapier (`@dimforge/rapier3d`, WASM build)**: fast, deterministic physics. The non-`compat` build ships a real `.wasm` file that browsers compile while streaming, instead of base64 inside JS (about 30% smaller over the wire).
- **miniplex ECS**: entities are plain objects, so Three.js objects and Rapier bodies attach naturally. Systems are small isolated files, which suits parallel work by people and agents and keeps merge conflicts rare.
- **TypeScript (strict), Vite, pnpm, Vitest, Playwright, ESLint, Prettier, lefthook, commitlint.**
- **TypeScript 6.0, not 7**: typescript-eslint does not support TypeScript 7 yet. Revisit when it does.

## Alternatives considered

- **Phaser**: excellent for 2D, but 2D-only and adds engine overhead.
- **PixiJS**: the fastest 2D renderer, but 2D-only.
- **Babylon.js**: a complete 3D engine with an inspector, but heavier, and we'd use less of what we ship.
- **bitECS**: faster for very large entity counts thanks to struct-of-arrays storage, but more ceremony and harder to read. Worth it only past tens of thousands of entities.

## Consequences

- We assemble features (audio, UI, scene management) ourselves or pull in focused libraries as needed.
- Rendering is not interpolated between fixed steps yet. On high-refresh displays motion is updated at 60 Hz. Add interpolation if a game needs it.
