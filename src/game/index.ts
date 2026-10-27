import { installDebugOverlay } from '@engine/debug/overlay';
import { Game } from '@engine/game';
import type { LaunchParams } from '@engine/params';
import { noiseBurst } from '@engine/synth';
import { installTestHook } from '@engine/test-hook';
import { grayboxArena } from './arenas/graybox';
import type { Entity } from './components';
import { config } from './config';
import { spawnArena } from './entities/level';
import { resetPlayer, spawnPlayer } from './entities/player';
import { createState, type GameState } from './state';
import { footstepsSystem } from './systems/footsteps';
import { locomotionSystem } from './systems/locomotion';
import { lookSystem } from './systems/look';
import { playerAnimationSystem } from './systems/player-animation';
import { playerFacingSystem } from './systems/player-facing';
import { restartSystem } from './systems/restart';
import { timerSystem } from './systems/timer';
import { tpsCameraSystem } from './systems/tps-camera';
import { createHudSystem } from './ui/hud';

/** Composition root: spawn entities, register sounds and systems in order. */
export async function createGame(
  canvas: HTMLCanvasElement,
  params: LaunchParams,
): Promise<Game<Entity, GameState>> {
  const game = await Game.create<Entity, GameState>({ canvas, params, state: createState() });
  const { ctx } = game;

  ctx.camera.fov = config.camera.fov;
  ctx.camera.updateProjectionMatrix();
  ctx.audio.register('step', noiseBurst({ duration: 0.11, decay: 38, smoothing: 0.88, gain: 0.6 }));

  spawnArena(ctx, grayboxArena);
  const player = spawnPlayer(ctx, grayboxArena);

  game
    .addFixedSystem(restartSystem)
    .addFixedSystem(lookSystem)
    .addFixedSystem(locomotionSystem)
    .addFixedSystem(playerAnimationSystem)
    .addFixedSystem(footstepsSystem)
    .addFixedSystem(timerSystem)
    .addFrameSystem(playerFacingSystem)
    .addFrameSystem(tpsCameraSystem)
    .addFrameSystem(createHudSystem());

  installDebugOverlay(game, ({ gui }) => {
    const p = gui.addFolder('Player');
    p.add(config.player, 'walkSpeed', 1, 12);
    p.add(config.player, 'acceleration', 5, 120);
    p.add(config.player, 'backSpeedFactor', 0.3, 1);
    const look = gui.addFolder('Look');
    look.add(config.look, 'sensitivity', 0.0005, 0.006);
    const cam = gui.addFolder('Camera');
    cam.add(config.camera, 'distance', 1.5, 8);
    cam.add(config.camera, 'shoulder', -1.5, 1.5);
    cam.add(config.camera, 'height', 0, 1.5);
    cam.add(config.camera, 'fov', 40, 100).onChange((fov: number) => {
      ctx.camera.fov = fov;
      ctx.camera.updateProjectionMatrix();
    });
  });

  installTestHook(game, {
    inspect: () => {
      const { body, look, locomotion, animator } = player;
      const p = body!.translation();
      const c = ctx.camera.position;
      return {
        elapsed: ctx.state.elapsed,
        locked: ctx.input.locked,
        player: { x: p.x, y: p.y, z: p.z },
        look: { ...look! },
        grounded: locomotion!.grounded,
        speed: locomotion!.speed,
        animation: animator!.current,
        camera: { x: c.x, y: c.y, z: c.z },
      };
    },
    actions: {
      teleportPlayer: (x, y, z) => {
        player.body!.setTranslation({ x, y, z }, true);
        player.body!.setNextKinematicTranslation({ x, y, z });
        Object.assign(player.locomotion!.velocity, { x: 0, y: 0, z: 0 });
        ctx.snap(player);
      },
      setLook: (yaw, pitch = 0) => {
        Object.assign(player.look!, { yaw, pitch });
      },
      resetPlayer: () => {
        resetPlayer(ctx, player, grayboxArena);
      },
    },
  });

  return game;
}
