import { installDebugOverlay } from '@engine/debug/overlay';
import { Game } from '@engine/game';
import type { LaunchParams } from '@engine/params';
import { installTestHook } from '@engine/test-hook';
import type { Entity } from './components';
import { config } from './config';
import { spawnGems } from './entities/gem';
import { spawnLevel } from './entities/level';
import { spawnPlayer } from './entities/player';
import { createState, type GameState } from './state';
import { cameraFollowSystem } from './systems/camera-follow';
import { collectSystem } from './systems/collect';
import { gemAnimationSystem } from './systems/gem-animation';
import { playerControlSystem } from './systems/player-control';
import { restartSystem } from './systems/restart';
import { timerSystem } from './systems/timer';
import { createHudSystem } from './ui/hud';

/** Composition root of the demo: spawn entities, register systems in order. */
export async function createDemoGame(
  canvas: HTMLCanvasElement,
  params: LaunchParams,
): Promise<Game<Entity, GameState>> {
  const game = await Game.create<Entity, GameState>({ canvas, params, state: createState() });
  const { ctx } = game;

  spawnLevel(ctx);
  spawnPlayer(ctx);
  spawnGems(ctx);
  ctx.camera.position.set(0, config.camera.offsetY, config.camera.offsetZ);
  ctx.camera.lookAt(0, 0, 0);

  game
    .addFixedSystem(restartSystem)
    .addFixedSystem(playerControlSystem)
    .addFixedSystem(collectSystem)
    .addFixedSystem(timerSystem)
    .addFixedSystem(gemAnimationSystem)
    .addFixedSystem(cameraFollowSystem)
    .addFrameSystem(createHudSystem());

  installDebugOverlay(game, ({ gui }) => {
    const player = gui.addFolder('Player');
    player.add(config.player, 'rollForce', 2, 40);
    player.add(config.player, 'maxSpeed', 2, 20);
    player.add(config.player, 'jumpImpulse', 0, 12);
    const camera = gui.addFolder('Camera');
    camera.add(config.camera, 'offsetY', 2, 30);
    camera.add(config.camera, 'offsetZ', 2, 30);
    camera.add(config.camera, 'stiffness', 0.5, 20);
  });

  installTestHook(game, {
    inspect: () => {
      const p = ctx.world.with('player', 'body').first?.body.translation();
      return {
        ...ctx.state,
        gemsLeft: ctx.world.with('gem').size,
        player: p ? { x: p.x, y: p.y, z: p.z } : null,
        gems: [...ctx.world.with('gem', 'object3d')].map(({ object3d: o }) => ({
          x: o.position.x,
          z: o.position.z,
        })),
      };
    },
    actions: {
      teleportPlayer: (x, y, z) => {
        const body = ctx.world.with('player', 'body').first?.body;
        body?.setTranslation({ x, y, z }, true);
        body?.setLinvel({ x: 0, y: 0, z: 0 }, true);
      },
    },
  });

  return game;
}
