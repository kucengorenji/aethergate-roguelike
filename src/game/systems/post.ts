import type { PostPipeline } from '@engine/post';
import { config } from '../config';
import { effectsProfile } from '../quality';
import type { GameSystem } from '../types';

/**
 * Keeps bloom and the color grade in step with the quality setting and the
 * tunables (frame system, last). The engine renders the frame through the
 * chain afterwards (`Game.setRenderPass`).
 */
export function createPostSystem(post: PostPipeline): GameSystem {
  return ({ state }) => {
    post.apply(config.vfx.post, effectsProfile(state.save.settings.quality).bloom);
  };
}
