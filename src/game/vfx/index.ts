import { PostPipeline } from '@engine/post';
import type * as THREE from 'three/webgpu';
import { config } from '../config';
import { effectsProfile } from '../quality';
import { createAshRenderSystem } from '../systems/ash-render';
import { createAuraRenderSystem } from '../systems/aura-render';
import { createMeteorRenderSystem } from '../systems/meteor-render';
import { createParticleRenderSystem } from '../systems/particle-render';
import { createPostSystem } from '../systems/post';
import { collectDecals, createTelegraphRenderSystem } from '../systems/telegraph-render';
import { createTrailRenderSystem } from '../systems/trail-render';
import { createVfxSystem } from '../systems/vfx';
import type { Ctx } from '../types';
import { LIGHTNING } from './lightning';
import { meteorAt } from './meteor';
import { primaryElement } from './palette';
import { PARTICLE_TAGS } from './particles';
import { DecalList } from './telegraphs';
import { trailColor, trailLength, trailSpec } from './trails';

/**
 * The effects of spec 0014, loaded as their own chunk: `createGame` starts the
 * import early and registers these systems where they belong in the order.
 */
export function createVfx(ctx: Ctx, renderer: THREE.WebGPURenderer) {
  const post = new PostPipeline(renderer, ctx.scene, ctx.camera);
  return {
    post,
    /** Fixed: emits particles; registered right before `feedbackSystem`. */
    emit: createVfxSystem(),
    /** Frame systems, after the camera. */
    telegraphs: createTelegraphRenderSystem(ctx),
    auras: createAuraRenderSystem(ctx),
    meteors: createMeteorRenderSystem(ctx),
    trails: createTrailRenderSystem(ctx),
    particles: createParticleRenderSystem(ctx),
    ash: createAshRenderSystem(ctx),
    /** Frame, last: keeps post-processing in step with quality and tunables. */
    postSettings: createPostSystem(post),
    inspect: () => inspectVfx(ctx, post),
  };
}

export type Vfx = ReturnType<typeof createVfx>;

/** What tests read about the effects (`inspect().vfx`). */
function inspectVfx(ctx: Ctx, post: PostPipeline) {
  const { state, world } = ctx;
  const { vfx } = state;
  const pool = vfx.particles;
  const live: Record<string, number> = {};
  for (const tag of PARTICLE_TAGS) live[tag] = 0;
  for (let i = 0; i < pool.capacity; i++) {
    if (!pool.alive[i] || vfx.clock - pool.born[i]! >= pool.life[i]!) continue;
    const tag = PARTICLE_TAGS[pool.tag[i]!]!;
    live[tag] = (live[tag] ?? 0) + 1;
  }
  const emitted = Object.fromEntries(PARTICLE_TAGS.map((tag, i) => [tag, vfx.emitted[i]]));
  const player = world.with('player', 'boons', 'skill').first;
  const primary = primaryElement(player?.boons.held);
  const skill = player?.skill.element ?? null;
  const projectiles = state.projectiles;
  const trails = [];
  for (let i = 0; i < projectiles.capacity; i++) {
    if (!projectiles.alive[i] || !vfx.seen[i]) continue;
    const kind = projectiles.kind[i]!;
    const look = projectiles.look[i]!;
    const spec = trailSpec(kind, look);
    trails.push({
      kind,
      look,
      length: trailLength(spec, vfx.flown[i]!, 0),
      flown: vfx.flown[i]!,
      width: spec.width,
      color: trailColor(kind, look, primary, skill),
    });
  }
  const meteor = { x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0 };
  return {
    particles: pool.count,
    live,
    emitted,
    trails,
    decals: collectDecals(state, world.with('enemy', 'object3d'), skill, new DecalList()).list(),
    ash: effectsProfile(state.save.settings.quality).ash,
    density: vfx.density,
    ice: [...world.with('status', 'hurtbox')].filter((e) => e.status.frozen > 0).length,
    meteors: state.hazards.filter((h) => meteorAt(h.x, h.z, h.time, meteor)).length,
    lightning: state.arcs.length * LIGHTNING.segments,
    bloom: post.bloom,
    palette: config.vfx.colors,
  };
}
