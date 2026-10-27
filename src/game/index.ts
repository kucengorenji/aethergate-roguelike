import { installDebugOverlay } from '@engine/debug/overlay';
import { Game } from '@engine/game';
import type { LaunchParams } from '@engine/params';
import { noiseBurst, sweep } from '@engine/synth';
import { installTestHook } from '@engine/test-hook';
import { grayboxArena } from './arenas/graybox';
import type { Entity } from './components';
import { config } from './config';
import { aimAnglesAt } from './combat/camera-rig';
import { ProjectileKind, Team } from './combat/projectiles';
import { spawnDummy } from './entities/dummy';
import { ENEMY_KINDS, spawnEnemy } from './entities/enemy';
import { spawnArena, spawnEnvironment } from './entities/level';
import { resetPlayer, spawnPlayer } from './entities/player';
import { spawnTotem } from './entities/totem';
import { createState, type GameState, type Mode } from './state';
import { actionsSystem } from './systems/actions';
import { castSystem, focusSystem } from './systems/cast';
import { skillSystem } from './systems/skill';
import { deathSystem } from './systems/death';
import { dummySystem } from './systems/dummy';
import { enemyAiSystem } from './systems/enemy-ai';
import { enemyAttackSystem } from './systems/enemy-attack';
import { enemyDeathSystem } from './systems/enemy-death';
import { createEnemyMotionSystem } from './systems/enemy-motion';
import { enemyPoseSystem } from './systems/enemy-pose';
import { feedbackSystem } from './systems/feedback';
import { footstepsSystem } from './systems/footsteps';
import { locomotionSystem } from './systems/locomotion';
import { lookSystem } from './systems/look';
import { playerAnimationSystem } from './systems/player-animation';
import { playerFacingSystem } from './systems/player-facing';
import { createProjectileRenderSystem } from './systems/projectile-render';
import { projectilesSystem } from './systems/projectiles';
import { restartEncounter, restartSystem } from './systems/restart';
import { timerSystem } from './systems/timer';
import { totemSystem } from './systems/totem';
import { startWave, wavesSystem } from './systems/waves';
import { interactSystem } from './systems/interact';
import { roomPropsSystem } from './systems/room-props';
import { enterRoom, runSystem, startRun } from './systems/run';
import { tpsCameraSystem } from './systems/tps-camera';
import { createDamageNumbersSystem } from './ui/damage-numbers';
import { createHudSystem } from './ui/hud';

/** Composition root: spawn entities, register sounds and systems in order. */
export async function createGame(
  canvas: HTMLCanvasElement,
  params: LaunchParams,
): Promise<Game<Entity, GameState>> {
  const mode = readMode();
  const game = await Game.create<Entity, GameState>({
    canvas,
    params,
    state: createState(
      mode,
      mode === 'encounter' ? config.encounter.waves : [],
      config.encounter.startDelay,
    ),
  });
  const { ctx } = game;

  ctx.camera.fov = config.camera.fov;
  ctx.camera.updateProjectionMatrix();
  registerSounds(ctx.audio);

  spawnEnvironment(ctx);
  if (mode !== 'run') spawnArena(ctx, grayboxArena);
  const player = spawnPlayer(ctx, grayboxArena);
  if (mode === 'run') startRun(ctx, params.seed);
  // Training mode keeps the M2 practice courtyard; the encounter has waves instead.
  const dummy = mode === 'training' ? spawnDummy(ctx, 1.2, 5) : null;
  if (mode === 'training') spawnTotem(ctx, -2.5, 0.3, -8);
  const enemyController = ctx.physics.world.createCharacterController(0.02);
  enemyController.enableAutostep(config.player.stepHeight, 0.2, false);
  enemyController.enableSnapToGround(0.3);

  game
    .addFixedSystem(restartSystem)
    .addFixedSystem(wavesSystem)
    .addFixedSystem(runSystem)
    .addFixedSystem(interactSystem)
    .addFixedSystem(lookSystem)
    .addFixedSystem(actionsSystem)
    .addFixedSystem(locomotionSystem)
    .addFixedSystem(castSystem)
    .addFixedSystem(skillSystem)
    .addFixedSystem(focusSystem)
    .addFixedSystem(totemSystem)
    .addFixedSystem(enemyAiSystem)
    .addFixedSystem(createEnemyMotionSystem(enemyController))
    .addFixedSystem(enemyAttackSystem)
    .addFixedSystem(projectilesSystem)
    .addFixedSystem(dummySystem)
    .addFixedSystem(enemyDeathSystem)
    .addFixedSystem(deathSystem)
    .addFixedSystem(feedbackSystem)
    .addFixedSystem(playerAnimationSystem)
    .addFixedSystem(footstepsSystem)
    .addFixedSystem(timerSystem)
    .addFrameSystem(createProjectileRenderSystem(ctx))
    .addFrameSystem(playerFacingSystem)
    .addFrameSystem(enemyPoseSystem)
    .addFrameSystem(roomPropsSystem)
    .addFrameSystem(tpsCameraSystem)
    .addFrameSystem(createDamageNumbersSystem())
    .addFrameSystem(createHudSystem());

  installDebugOverlay(game, ({ gui }) => {
    const p = gui.addFolder('Player');
    p.add(config.player, 'walkSpeed', 1, 12);
    p.add(config.player, 'acceleration', 5, 120);
    p.add(config.player, 'backSpeedFactor', 0.3, 1);
    const combat = gui.addFolder('Combat');
    combat.add(config.bolt, 'damage', 1, 50);
    combat.add(config.bolt, 'interval', 0.05, 1);
    combat.add(config.bolt, 'speed', 10, 80);
    combat.add(config.bolt, 'cost', 0, 30);
    combat.add(config.focus, 'regenPerSecond', 5, 100);
    combat.add(config.dodge, 'distance', 1, 10);
    combat.add(config.totem, 'enabled').name('training totem');
    combat.add(config.enemy, 'frozen').name('freeze enemies');
    combat.add(config.feedback, 'hitstopSteps', 0, 10, 1);
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
      const { body, look, locomotion, animator, health, caster, action, flask } = player;
      const p = body!.translation();
      const c = ctx.camera.position;
      const d = dummy?.body!.translation();
      return {
        phase: ctx.state.phase,
        elapsed: ctx.state.elapsed,
        locked: ctx.input.locked,
        player: { x: p.x, y: p.y, z: p.z },
        look: { ...look! },
        grounded: locomotion!.grounded,
        speed: locomotion!.speed,
        animation: animator!.current,
        camera: { x: c.x, y: c.y, z: c.z },
        health: health!.current,
        invulnerable: health!.invulnerable > 0,
        focus: caster!.focus,
        flasks: flask!.charges,
        skillCooldown: player.skill!.cooldown,
        action: action!.kind,
        dummy:
          dummy && d
            ? { health: dummy.health!.current, x: d.x, z: d.z, down: dummy.dummy!.downTime > 0 }
            : null,
        mode: ctx.state.mode,
        layout: ctx.state.layout.id,
        run: {
          seed: ctx.state.run.plan?.seed ?? null,
          index: ctx.state.run.index,
          status: ctx.state.run.status,
          kind: ctx.state.run.plan?.rooms[ctx.state.run.index]?.kind ?? null,
          reward: ctx.state.run.reward,
          boons: ctx.state.run.boons,
          shards: ctx.state.run.shards,
          time: ctx.state.run.time,
          layouts: ctx.state.run.plan?.rooms.map((r) => r.layout) ?? [],
          offers: ctx.state.run.plan?.offers[ctx.state.run.index] ?? [],
        },
        doors: [...ctx.world.with('door', 'object3d')].map(({ door, object3d }) => ({
          index: door.index,
          offer: door.offer,
          open: door.open,
          x: object3d.position.x,
          z: object3d.position.z,
        })),
        pickups: [...ctx.world.with('pickup')].map(({ pickup }) => ({ ...pickup })),
        bodies: ctx.physics.world.bodies.len(),
        encounter: { ...ctx.state.encounter },
        enemies: [...ctx.world.with('enemy', 'body', 'health')].map(({ enemy, body, health }) => {
          const t = body.translation();
          return {
            kind: enemy.kind,
            state: enemy.state,
            x: t.x,
            z: t.z,
            health: health.current,
            facing: enemy.facing,
          };
        }),
        projectiles: ctx.state.projectiles.count,
        projectileList: aliveProjectiles(ctx.state.projectiles),
        damageNumbers: ctx.state.damageNumbers.length,
        timeScale: ctx.timeScale,
        stats: { ...ctx.state.stats },
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
      /** Points the crosshair at a world point (e.g. the dummy's chest). */
      aimAt: (x, y, z) => {
        Object.assign(player.look!, aimAnglesAt(player.body!.translation(), { x, y, z }));
      },
      resetPlayer: () => {
        resetPlayer(ctx, player, grayboxArena);
      },
      restart: () => {
        restartEncounter(ctx);
      },
      totem: (on = 1) => {
        config.totem.enabled = on !== 0;
      },
      setHealth: (value) => {
        player.health!.current = value;
      },
      setDummyHealth: (value) => {
        if (dummy) dummy.health!.current = value;
      },
      /** Spawns ENEMY_KINDS[kind] at (x, z), already risen unless `rising` is 1. */
      spawnEnemy: (kind, x, z, rising = 0) => {
        spawnEnemy(ctx, ENEMY_KINDS[kind] ?? 'soldier', x, z, rising === 0);
      },
      killAllEnemies: () => {
        for (const { health } of ctx.world.with('enemy', 'health')) health.current = 0;
      },
      freezeEnemies: (on = 1) => {
        config.enemy.frozen = on !== 0;
      },
      setEnemyFacing: (index, yaw) => {
        const e = [...ctx.world.with('enemy')][index];
        if (e) e.enemy.facing = yaw;
      },
      newRun: (seed) => {
        startRun(ctx, seed);
      },
      /** Jumps the run to room `index` with a reward, skipping the rooms before it. */
      goToRoom: (index, reward = 0) => {
        enterRoom(ctx, index, (['boon', 'shards', 'heal', 'flask'] as const)[reward] ?? null);
        Object.assign(ctx.state.run, { status: 'fighting', timer: 0 });
      },
      /** Puts the player in front of door `index`. */
      teleportToDoor: (index) => {
        const door = [...ctx.world.with('door', 'object3d')].find((d) => d.door.index === index);
        if (!door) return;
        const { x, z } = door.object3d.position;
        player.body!.setTranslation({ x, y: 0.9, z: z + 1.4 }, true);
        player.body!.setNextKinematicTranslation({ x, y: 0.9, z: z + 1.4 });
        ctx.snap(player);
      },
      teleportToPickup: () => {
        const pickup = ctx.world.with('pickup').first?.pickup;
        if (!pickup) return;
        player.body!.setTranslation({ x: pickup.x, y: 0.9, z: pickup.z + 0.5 }, true);
        player.body!.setNextKinematicTranslation({ x: pickup.x, y: 0.9, z: pickup.z + 0.5 });
        ctx.snap(player);
      },
      startWave: (index) => {
        startWave(ctx, index);
      },
      setFocus: (value) => {
        player.caster!.focus = value;
      },
      /** Fires a totem orb from (x, y, z) straight at the player. */
      fireOrbAtPlayer: (x, y, z) => {
        const p = player.body!.translation();
        const dx = p.x - x;
        const dy = p.y - y;
        const dz = p.z - z;
        const len = Math.hypot(dx, dy, dz);
        const speed = config.totem.orbSpeed;
        ctx.state.projectiles.spawn({
          kind: ProjectileKind.Orb,
          team: Team.Enemy,
          x,
          y,
          z,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          vz: (dz / len) * speed,
          radius: config.totem.orbRadius,
          damage: config.totem.orbDamage,
          life: config.totem.orbLife,
        });
      },
      /** Load test: `count` slow bolts drifting high above the arena. */
      spawnProjectiles: (count) => {
        for (let i = 0; i < count; i++) {
          const angle = ctx.rng.range(0, Math.PI * 2);
          ctx.state.projectiles.spawn({
            kind: i % 2 === 0 ? ProjectileKind.Bolt : ProjectileKind.Orb,
            team: i % 2 === 0 ? Team.Player : Team.Enemy,
            x: ctx.rng.range(-12, 12),
            y: ctx.rng.range(7, 12),
            z: ctx.rng.range(-12, 12),
            vx: Math.cos(angle) * 0.5,
            vy: 0,
            vz: Math.sin(angle) * 0.5,
            radius: 0.15,
            damage: 1,
            life: 60,
          });
        }
      },
    },
  });

  return game;
}

function readMode(): Mode {
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode === 'training' || mode === 'sandbox' || mode === 'encounter' ? mode : 'run';
}

function aliveProjectiles(
  pool: GameState['projectiles'],
): { x: number; y: number; z: number; kind: number }[] {
  const list = [];
  for (let i = 0; i < pool.capacity; i++) {
    if (!pool.alive[i]) continue;
    const o = i * 3;
    list.push({ x: pool.pos[o]!, y: pool.pos[o + 1]!, z: pool.pos[o + 2]!, kind: pool.kind[i]! });
  }
  return list;
}

/** Placeholder sounds, generated in code until real assets exist (M6). */
function registerSounds(audio: Game<Entity, GameState>['ctx']['audio']): void {
  audio.register('step', noiseBurst({ duration: 0.11, decay: 38, smoothing: 0.88, gain: 0.6 }));
  audio.register('cast', sweep({ duration: 0.16, from: 1500, to: 700, decay: 22, gain: 0.5 }));
  audio.register(
    'hit',
    noiseBurst({ duration: 0.14, decay: 30, smoothing: 0.55, gain: 0.8, seed: 2 }),
  );
  audio.register(
    'wall',
    noiseBurst({ duration: 0.08, decay: 50, smoothing: 0.75, gain: 0.5, seed: 3 }),
  );
  audio.register(
    'dodge',
    noiseBurst({ duration: 0.3, decay: 9, smoothing: 0.94, gain: 0.6, seed: 4 }),
  );
  audio.register(
    'swing',
    noiseBurst({ duration: 0.18, decay: 16, smoothing: 0.9, gain: 0.6, seed: 5 }),
  );
  audio.register('hurt', sweep({ duration: 0.3, from: 320, to: 110, decay: 9, gain: 0.6 }));
  audio.register('empty', sweep({ duration: 0.05, from: 2200, to: 1900, decay: 60, gain: 0.35 }));
  audio.register('flask', sweep({ duration: 0.45, from: 480, to: 960, decay: 5, gain: 0.4 }));
  audio.register('orb', sweep({ duration: 0.35, from: 180, to: 520, decay: 6, gain: 0.45 }));
  audio.register(
    'block',
    noiseBurst({ duration: 0.09, decay: 45, smoothing: 0.3, gain: 0.5, seed: 6 }),
  );
  audio.register('guardbreak', sweep({ duration: 0.4, from: 700, to: 140, decay: 7, gain: 0.55 }));
  audio.register(
    'slam',
    noiseBurst({ duration: 0.45, decay: 8, smoothing: 0.96, gain: 0.8, seed: 7 }),
  );
  audio.register('wave', sweep({ duration: 0.8, from: 110, to: 220, decay: 3, gain: 0.5 }));
  audio.register('reward', sweep({ duration: 0.6, from: 520, to: 1040, decay: 4, gain: 0.35 }));
  audio.register('pickup', sweep({ duration: 0.5, from: 660, to: 1320, decay: 5, gain: 0.45 }));
  audio.register('doors', sweep({ duration: 0.9, from: 140, to: 280, decay: 3, gain: 0.45 }));
  audio.register(
    'door',
    noiseBurst({ duration: 0.6, decay: 5, smoothing: 0.97, gain: 0.6, seed: 8 }),
  );
  audio.register('comet', sweep({ duration: 0.45, from: 260, to: 120, decay: 5, gain: 0.55 }));
  audio.register(
    'burst',
    noiseBurst({ duration: 0.7, decay: 6, smoothing: 0.93, gain: 0.9, seed: 9 }),
  );
  audio.register('cleared', sweep({ duration: 1.2, from: 330, to: 880, decay: 2.2, gain: 0.45 }));
}
