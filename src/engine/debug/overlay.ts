import type GUI from 'lil-gui';
import type { CoreComponents } from '../ecs';
import type { Game } from '../game';

export interface DebugOverlay {
  /** Tweak panel. Register tunables here so designers can adjust them live. */
  gui: GUI;
}

/**
 * FPS/CPU/GPU stats, a lil-gui tweak panel and physics wireframes. Toggle with
 * the backquote key or start with `?debug`. Dependencies are loaded lazily so
 * they cost nothing in the main bundle until first opened.
 */
export function installDebugOverlay<E extends CoreComponents, S>(
  game: Game<E, S>,
  configure: (overlay: DebugOverlay) => void,
): void {
  let overlay: { gui: GUI; statsDom: HTMLElement } | null = null;
  let visible = false;
  let loading: Promise<void> | null = null;

  const load = async (): Promise<void> => {
    const [{ default: Gui }, { default: Stats }] = await Promise.all([
      import('lil-gui'),
      import('stats-gl'),
    ]);
    const stats = new Stats({ trackGPU: true, horizontal: false });
    await stats.init(game.renderer);
    game.onAfterRender(() => {
      stats.update();
    });
    stats.dom.classList.add('debug-stats');
    document.body.appendChild(stats.dom);

    const gui = new Gui({ title: `Debug (${game.backend})` });
    const view = { physicsWireframe: true };
    gui
      .add(view, 'physicsWireframe')
      .name('physics wireframe')
      .onChange((on: boolean) => {
        game.ctx.physics.setDebugVisible(game.ctx.scene, on);
      });
    gui.add(game, 'paused');
    configure({ gui });
    overlay = { gui, statsDom: stats.dom };
  };

  const setVisible = async (on: boolean): Promise<void> => {
    visible = on;
    if (on && !overlay) await (loading ??= load());
    if (!overlay) return;
    overlay.gui.show(visible);
    overlay.statsDom.style.display = visible ? '' : 'none';
    const wireframe = visible && (overlay.gui.controllers[0]?.getValue() as boolean);
    game.ctx.physics.setDebugVisible(game.ctx.scene, wireframe);
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') void setVisible(!visible);
  });
  if (game.params.debug) void setVisible(true);
}
