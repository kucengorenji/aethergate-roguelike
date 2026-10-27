# ADR 0002: Over-the-shoulder TPS roguelike in the browser

Status: accepted
Date: 2026-10-27

## Context

The brief asks for a Hades-like roguelike, a dark fantasy world reminiscent of Elden Ring, and a third-person shooter camera like Arc Raiders.
It should run on laptops that can run Hades, and it is built by one developer with AI agents in 6 to 8 weeks for the MVP.
Hades uses a fixed isometric camera, which conflicts with an over-the-shoulder shooter camera.

## Decision

- **Camera**: over-the-shoulder TPS with mouse aim and pointer lock. The run structure (rooms, rewards, boons, boss, hub) comes from Hades.
- **Platform**: browser first on this starter (Three.js, Rapier, miniplex). A desktop wrapper comes after the MVP, with no rewrite.
- **Weapons**: spells (staffs and seals) as projectiles, not guns, so the shooter fits the setting.
- **Moveset**: move, aim, cast, dodge roll with i-frames, melee bash, special skill. No jump in the MVP.
- **Input**: mouse and keyboard only in the MVP.
- **Performance target**: 60 fps at 1080p on modern iGPUs (Iris Xe, Radeon 680M).
- **Art**: stylized low-poly made in Blender, animations retargeted from a free library.
- **IP**: an original world. No names or designs from FromSoftware games.

## Alternatives considered

- **Top-down twin-stick like Hades**: smallest scope and easiest to read, but loses the TPS feel the brief wants.
- **Switchable camera**: roughly doubles level design, AI and balancing work.
- **Godot or Unity**: give animation tooling and navmesh for free, but drop the starter, its test hook and its quality gate. Revisit if animation work in M1 turns out to be blocking.
- **Jump in the MVP**: needs vertical level design and AI that handles airborne targets. Deferred.

## Consequences

- The engine needs mouse input, render interpolation, skinned animation and audio before gameplay work (M1).
- Close camera framing means character art and animation quality matter more than in a top-down game.
- Arenas stay flat, so enemy AI can use steering without a navmesh.
- Gameplay must stay deterministic: mouse look is sampled into the fixed step, not applied per rendered frame.
