import { World } from 'miniplex';
import * as THREE from 'three/webgpu';
import type { CoreComponents } from './ecs';
import { FixedStep } from './fixed-step';
import { Input } from './input';
import { RollingStats } from './metrics';
import type { LaunchParams } from './params';
import { Physics } from './physics';
import { createRenderer, type RendererBackend } from './renderer';
import { Rng } from './rng';

export interface GameContext<E extends CoreComponents, S> {
  readonly world: World<E>;
  /** Game-wide data that is not tied to an entity (score, phase, timers). */
  readonly state: S;
  readonly input: Input;
  readonly physics: Physics;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly rng: Rng;
  /** Seconds this system call covers: the fixed step for fixed systems, the frame time for frame systems. */
  dt: number;
  /** Number of fixed steps simulated so far. */
  tick: number;
}

/**
 * A system is a plain function over the context. Keep one system per file, each
 * doing one job; order of registration is order of execution.
 */
export type System<E extends CoreComponents, S> = (ctx: GameContext<E, S>) => void;

export interface GameOptions<S> {
  canvas: HTMLCanvasElement;
  params: LaunchParams;
  state: S;
  stepSeconds?: number;
}

export class Game<E extends CoreComponents, S> {
  readonly ctx: GameContext<E, S>;
  readonly renderer: THREE.WebGPURenderer;
  readonly backend: RendererBackend;
  readonly params: LaunchParams;
  /** CPU time per fixed step (game systems + physics), in ms. Feeds the perf budget. */
  readonly stepTimes = new RollingStats();
  /** When true, fixed systems only run through `advance()`. Rendering continues. */
  paused: boolean;

  private readonly fixedSystems: System<E, S>[] = [];
  private readonly frameSystems: System<E, S>[] = [];
  private readonly fixedStep: FixedStep;
  private readonly clock = new THREE.Timer();
  private readonly afterRender: (() => void)[] = [];

  private constructor(
    renderer: THREE.WebGPURenderer,
    backend: RendererBackend,
    physics: Physics,
    options: GameOptions<S>,
  ) {
    this.renderer = renderer;
    this.backend = backend;
    this.params = options.params;
    this.paused = options.params.paused;
    this.fixedStep = new FixedStep(options.stepSeconds ?? 1 / 60);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
    const world = new World<E>();
    world.onEntityAdded.subscribe((e) => {
      if (e.object3d) scene.add(e.object3d);
    });
    world.onEntityRemoved.subscribe((e) => {
      if (e.object3d) scene.remove(e.object3d);
      if (e.body) physics.world.removeRigidBody(e.body);
    });

    this.ctx = {
      world,
      state: options.state,
      input: new Input(),
      physics,
      scene,
      camera,
      rng: new Rng(options.params.seed),
      dt: 0,
      tick: 0,
    };
  }

  static async create<E extends CoreComponents, S>(options: GameOptions<S>): Promise<Game<E, S>> {
    const { renderer, backend } = await createRenderer(options.canvas, options.params.forceWebGL);
    return new Game<E, S>(renderer, backend, new Physics(), options);
  }

  /** Runs every fixed step (gameplay, physics-driving logic). */
  addFixedSystem(system: System<E, S>): this {
    this.fixedSystems.push(system);
    return this;
  }

  /** Runs once per rendered frame (camera, UI, cosmetic animation). */
  addFrameSystem(system: System<E, S>): this {
    this.frameSystems.push(system);
    return this;
  }

  onAfterRender(callback: () => void): void {
    this.afterRender.push(callback);
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
    });
    void this.renderer.setAnimationLoop((time) => {
      this.frame(time);
    });
  }

  /** Simulates exactly `steps` fixed steps, used by tests and when paused. */
  advance(steps: number): void {
    for (let i = 0; i < steps; i++) this.step();
  }

  private frame(time: number): void {
    this.clock.update(time);
    const frameSeconds = this.clock.getDelta();

    const steps = this.paused ? 0 : this.fixedStep.consume(frameSeconds);
    this.advance(steps);

    this.ctx.dt = frameSeconds;
    for (const system of this.frameSystems) system(this.ctx);

    this.ctx.physics.updateDebug();
    this.renderer.render(this.ctx.scene, this.ctx.camera);
    for (const callback of this.afterRender) callback();
  }

  private step(): void {
    const start = performance.now();
    const { ctx } = this;
    ctx.dt = this.fixedStep.stepSeconds;
    for (const system of this.fixedSystems) system(ctx);
    ctx.physics.step(ctx.dt);
    syncBodiesToObjects(ctx.world);
    ctx.input.endStep();
    ctx.tick++;
    this.stepTimes.push(performance.now() - start);
  }

  private resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    this.ctx.camera.aspect = width / Math.max(1, height);
    this.ctx.camera.updateProjectionMatrix();
  }
}

function syncBodiesToObjects<E extends CoreComponents>(world: World<E>): void {
  for (const entity of world.with('body', 'object3d')) {
    // miniplex cannot narrow a generic E, so restate what with() guarantees.
    const { body, object3d } = entity as Required<CoreComponents>;
    const p = body.translation();
    const r = body.rotation();
    object3d.position.set(p.x, p.y, p.z);
    object3d.quaternion.set(r.x, r.y, r.z, r.w);
  }
}
