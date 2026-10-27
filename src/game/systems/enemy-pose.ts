import { stateDuration } from '../ai/brains';
import { config } from '../config';
import type { GameSystem } from '../types';

/**
 * Presents AI state (frame system): rising out of the ground, leaning back in
 * a wind-up, lunging, wobbling when staggered, sinking when dying; eye glow
 * ramps up through a wind-up; ground markers show spawn points and area attacks.
 */
export const enemyPoseSystem: GameSystem = ({ world }) => {
  for (const { enemy, model, object3d } of world.with('enemy', 'model', 'object3d')) {
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

    const marker = enemy.marker;
    const pos = object3d.position;
    if (enemy.state === 'rising') {
      marker.visible = true;
      marker.position.set(pos.x, 0.02, pos.z);
      marker.scale.setScalar(0.9);
    } else if (enemy.state === 'windup' && (enemy.kind === 'knight' || enemy.move === 'slam')) {
      const kn = enemy.kind === 'knight' ? config.enemies.knight : config.enemies.captain;
      const windup = stateDuration(enemy.kind, 'windup', enemy.move, enemy.phase);
      marker.visible = true;
      marker.position.set(
        pos.x + enemy.aimX * kn.slamDistance,
        0.02,
        pos.z + enemy.aimZ * kn.slamDistance,
      );
      marker.scale.setScalar(kn.slamRadius * Math.min(1, 0.3 + t / windup));
    } else if (enemy.move === 'well' && (enemy.state === 'windup' || enemy.state === 'attack')) {
      marker.visible = true;
      marker.position.set(pos.x, 0.02, pos.z);
      marker.scale.setScalar(config.enemies.starfallen.wellRadius);
    } else {
      marker.visible = false;
    }

    // Boss telegraphs: the charge path and the sweep cone, shown through the wind-up.
    const shapes = enemy.shapes;
    if (shapes) {
      const winding = enemy.state === 'windup';
      shapes.line.visible = winding && enemy.move === 'charge';
      shapes.cone.visible = winding && enemy.move === 'sweep';
      if (shapes.line.visible) {
        const c = config.enemies.captain;
        shapes.line.position.set(pos.x, 0.03, pos.z);
        shapes.line.rotation.y = enemy.facing;
        shapes.line.scale.set(c.radius * 2.4, 1, c.chargeSpeed * c.chargeTime);
      }
      if (shapes.cone.visible) {
        shapes.cone.position.set(pos.x, 0.03, pos.z);
        shapes.cone.rotation.y = enemy.facing;
        shapes.cone.scale.setScalar(config.enemies.starfallen.sweepRadius);
      }
    }
  }
};
