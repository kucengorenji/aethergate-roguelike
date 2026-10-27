/**
 * Keyboard input keyed by `KeyboardEvent.code` (layout independent, e.g. 'KeyW').
 * `wasPressed` reports edges and is cleared after each fixed step, so a tap is
 * seen exactly once by game logic.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly controller = new AbortController();

  constructor(target: Window = window) {
    const { signal } = this.controller;
    target.addEventListener(
      'keydown',
      (e) => {
        if (!this.down.has(e.code)) this.pressed.add(e.code);
        this.down.add(e.code);
        if (GAME_KEYS.has(e.code)) e.preventDefault();
      },
      { signal },
    );
    target.addEventListener('keyup', (e) => this.down.delete(e.code), { signal });
    // Releasing keys while the window is unfocused would otherwise leave them stuck.
    target.addEventListener(
      'blur',
      () => {
        this.down.clear();
      },
      { signal },
    );
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

  /** Called by the engine after each fixed step. */
  endStep(): void {
    this.pressed.clear();
  }

  dispose(): void {
    this.controller.abort();
  }
}

/** Keys whose browser default (scrolling) should be suppressed. */
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
