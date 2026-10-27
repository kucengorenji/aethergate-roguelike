/**
 * Keyboard and mouse input. Keys are keyed by `KeyboardEvent.code` (layout
 * independent, e.g. 'KeyW'), mouse buttons as 'Mouse0' (left), 'Mouse1'
 * (middle) and 'Mouse2' (right), so both work with `isDown` and `wasPressed`.
 *
 * Edges (`wasPressed`) and mouse look are per fixed step: the engine calls
 * `beginStep()` before game systems and `endStep()` after them, so a tap or a
 * mouse movement is seen exactly once by game logic.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly controller = new AbortController();
  private pendingX = 0;
  private pendingY = 0;
  private pointerLocked = false;
  private pendingLockLoss = false;
  /** Mouse movement in pixels for the current fixed step. */
  readonly look = { x: 0, y: 0 };
  /**
   * True for the one fixed step after the browser or the player took the pointer
   * lock away (Esc, alt-tab). `releasePointer` (the game freeing it for a menu)
   * does not count.
   */
  lockLost = false;

  constructor(target: EventTarget = window) {
    const { signal } = this.controller;
    const on = (type: string, handler: (e: Event) => void) => {
      target.addEventListener(type, handler, { signal });
    };
    on('keydown', (e) => {
      const { code } = e as KeyboardEvent;
      this.press(code);
      // Menus need Space and the arrows for their buttons and sliders.
      if (GAME_KEYS.has(code) && !isFormControl(e.target)) e.preventDefault();
    });
    on('keyup', (e) => this.down.delete((e as KeyboardEvent).code));
    on('mousemove', (e) => {
      if (!this.pointerLocked) return;
      const { movementX, movementY } = e as MouseEvent;
      this.pendingX += movementX;
      this.pendingY += movementY;
    });
    // The click that acquires pointer lock must not also fire a spell.
    on('mousedown', (e) => {
      if (this.pointerLocked) this.press(`Mouse${(e as MouseEvent).button}`);
    });
    on('mouseup', (e) => this.down.delete(`Mouse${(e as MouseEvent).button}`));
    // Releasing keys while the window is unfocused would otherwise leave them stuck.
    on('blur', () => {
      this.down.clear();
    });
  }

  /** True while the pointer is locked to the game (mouse look active). */
  get locked(): boolean {
    return this.pointerLocked;
  }

  setPointerLocked(locked: boolean): void {
    if (this.pointerLocked && !locked) this.pendingLockLoss = true;
    this.pointerLocked = locked;
    if (!locked) {
      for (const code of [...this.down]) if (code.startsWith('Mouse')) this.down.delete(code);
      this.pendingX = 0;
      this.pendingY = 0;
    }
  }

  /**
   * Requests pointer lock when `element` is clicked and tracks lock state. Esc
   * releases the lock (browser behavior).
   */
  attachPointerLock(element: HTMLElement): void {
    const { signal } = this.controller;
    element.addEventListener(
      'mousedown',
      () => {
        // Older browsers return undefined instead of a promise.
        if (!this.pointerLocked)
          void Promise.resolve(element.requestPointerLock()).catch(() => undefined);
      },
      { signal },
    );
    element.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault();
      },
      { signal },
    );
    document.addEventListener(
      'pointerlockchange',
      () => {
        this.setPointerLocked(document.pointerLockElement === element);
      },
      { signal },
    );
  }

  /** Gives the pointer back to the page (menus). Clicking the game locks it again. */
  releasePointer(): void {
    if (document.pointerLockElement) document.exitPointerLock();
    this.setPointerLocked(false);
    this.pendingLockLoss = false;
  }

  /** Adds mouse movement as if the pointer were locked. For tests and replays. */
  injectLook(dx: number, dy: number): void {
    this.pendingX += dx;
    this.pendingY += dy;
  }

  /**
   * Movement not yet consumed by a fixed step. The camera adds it when rendering
   * so mouse look has no extra step of latency.
   */
  get pendingLook(): { readonly x: number; readonly y: number } {
    return { x: this.pendingX, y: this.pendingY };
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  /** -1, 0 or 1 from a pair of key groups. */
  axis(negative: string[], positive: string[]): number {
    return (this.isDown(...positive) ? 1 : 0) - (this.isDown(...negative) ? 1 : 0);
  }

  /** Called by the engine before each fixed step. */
  beginStep(): void {
    this.look.x = this.pendingX;
    this.look.y = this.pendingY;
    this.pendingX = 0;
    this.pendingY = 0;
    this.lockLost = this.pendingLockLoss;
    this.pendingLockLoss = false;
  }

  /** Called by the engine after each fixed step. */
  endStep(): void {
    this.pressed.clear();
    this.lockLost = false;
    this.look.x = 0;
    this.look.y = 0;
  }

  dispose(): void {
    this.controller.abort();
  }

  private press(code: string): void {
    if (!this.down.has(code)) this.pressed.add(code);
    this.down.add(code);
  }
}

/** Keys whose browser default (scrolling) should be suppressed. */
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const isFormControl = (target: EventTarget | null): boolean =>
  typeof Element !== 'undefined' &&
  target instanceof Element &&
  target.closest('button, input, select, textarea') !== null;
