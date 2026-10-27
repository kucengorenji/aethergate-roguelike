import { World } from 'miniplex';
import * as THREE from 'three/webgpu';
import { AudioEngine } from './audio';
import type { CoreComponents } from './ecs';
import { FixedStep } from './fixed-step';
import { Input } from './input';
import { Interpolator } from './interpolation';
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
  readonly audio: AudioEngine;
  readonly physics: Physics;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly rng: Rng;
  /**
   * Seconds this system call covers: the fixed step times `timeScale` for fixed
   * systems, the frame time for frame systems.
   */
  dt: number;
  /**
   * Multiplies simulated time per fixed step (physics, systems, animators), e.g.
   * near 0 for a few steps of hitstop. Steps, ticks and input edges are unaffected.
   */
  timeScale: number;
  /**
   * While true, fixed steps only clear input and simulate nothing (pause menu).
   * Rendering continues. Separate from the test hook's `paused`, which decides
   * whether steps run at all.
   */
  suspended: boolean;
  /** Number of fixed steps simulated so far. */
  tick: number;
  /**
   * Frame systems only: how far rendering is between the last two fixed steps,
   * in [0, 1]. It is 1 while paused, so tests and screenshots see the latest step.
   */
  alpha: number;
  /** Renders the entity where its body is now on the next frame, without blending. Use after teleports. */
  snap: (entity: E) => void;
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
  private frameRequested = false;
  private readonly interpolator: Interpolator<E>;
  private renderPass: (() => void) | null = null;

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
    const interpolator = new Interpolator(world);
    this.interpolator = interpolator;
    world.onEntityAdded.subscribe((e) => {
      if (e.object3d) scene.add(e.object3d);
    });
    world.onEntityRemoved.subscribe((e) => {
      if (e.object3d) scene.remove(e.object3d);
      if (e.body) physics.world.removeRigidBody(e.body);
      interpolator.forget(e);
    });

    const input = new Input();
    input.attachPointerLock(options.canvas);

    this.ctx = {
      world,
      state: options.state,
      input,
      audio: new AudioEngine(),
      physics,
      scene,
      camera,
      rng: new Rng(options.params.seed),
      dt: 0,
      timeScale: 1,
      suspended: false,
      tick: 0,
      alpha: 1,
      snap: (entity) => {
        interpolator.snap(entity);
      },
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

  /**
   * Runs once per rendered frame (camera, UI). Frame systems must be pure
   * functions of simulation state and `ctx.alpha`, so paused screenshots stay
   * deterministic; they never change gameplay state.
   */
  addFrameSystem(system: System<E, S>): this {
    this.frameSystems.push(system);
    return this;
  }

  /**
   * Asks for one rendered frame. Test sessions opened with `?paused` only render
   * on request (see `frame`); everywhere else every animation frame renders anyway.
   */
  requestFrame(): void {
    this.frameRequested = true;
  }

  onAfterRender(callback: () => void): void {
    this.afterRender.push(callback);
  }

  /**
   * Replaces the plain scene render with `pass` (e.g. a post-processing chain);
   * null goes back to the plain render. It runs after the frame systems.
   */
  setRenderPass(pass: (() => void) | null): void {
    this.renderPass = pass;
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
    // Paused test sessions render only when a test asks for a frame: a software-
    // rendered headless frame takes ~130 ms, and rendering every animation frame
    // would starve each test round trip behind it.
    if (this.params.test && this.params.paused && this.paused && !this.frameRequested) return;
    this.frameRequested = false;

    this.ctx.dt = frameSeconds;
    this.ctx.alpha = this.paused ? 1 : this.fixedStep.alpha;
    this.interpolator.apply(this.ctx.alpha);
    for (const system of this.frameSystems) system(this.ctx);

    this.ctx.physics.updateDebug();
    if (this.renderPass) this.renderPass();
    else this.renderer.render(this.ctx.scene, this.ctx.camera);
    for (const callback of this.afterRender) callback();
  }

  private step(): void {
    const start = performance.now();
    const { ctx } = this;
    ctx.dt = this.fixedStep.stepSeconds * ctx.timeScale;
    ctx.input.beginStep();
    if (ctx.suspended) {
      ctx.input.endStep();
      return;
    }
    for (const system of this.fixedSystems) system(ctx);
    ctx.physics.step(ctx.dt);
    for (const entity of ctx.world.with('animator')) {
      (entity as Required<CoreComponents>).animator.update(ctx.dt);
    }
    this.interpolator.capture();
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
