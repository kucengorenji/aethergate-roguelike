import { stateDuration } from '../ai/brains';
import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Presents AI state (frame system): rising out of the ground, leaning back in
 * a wind-up, lunging, wobbling when staggered, sinking when dying; eye glow
 * ramps up through a wind-up. Ground decals are `telegraph-render`'s job.
 */
export const enemyPoseSystem: GameSystem = ({ world }) => {
  for (const { enemy, model } of world.with('enemy', 'model')) {
    const k = config.enemies[enemy.kind];
    const t = enemy.time;
    let sink = 0;
    let lean = 0;
    let roll = 0;
    let glow = 0.4;
    switch (enemy.state) {
      case 'rising':
        sink = (1 - Math.min(1, t / config.enemy.riseSeconds)) * 2.2;
        break;
      case 'windup': {
        const progress = Math.min(
          1,
          t / stateDuration(enemy.kind, 'windup', enemy.move, enemy.phase),
        );
        lean = 0.35 * progress;
        glow = 0.6 + 3.4 * progress;
        break;
      }
      case 'attack':
        lean = -0.45;
        glow = 4;
        break;
      case 'stagger':
        roll = Math.sin(t * 30) * 0.12 * Math.max(0, 1 - t / config.enemy.staggerSeconds);
        lean = 0.15;
        glow = 0.1;
        break;
      case 'dying':
        sink = Math.min(1, t / config.enemy.dyingSeconds) * 1.6;
        lean = 1.1 * Math.min(1, t / 0.4);
        glow = 0;
        break;
      default:
        break;
    }
    model.position.y = -(k.halfHeight + k.radius) - sink;
    model.rotation.set(lean, enemy.facing, roll);
    enemy.glow.emissiveIntensity = glow;
  }
};
