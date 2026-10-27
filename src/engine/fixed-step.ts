/**
 * Fixed-timestep accumulator. Game logic and physics advance in constant steps
 * regardless of display refresh rate, which keeps simulation deterministic.
 */
export class FixedStep {
  private accumulator = 0;

  constructor(
    readonly stepSeconds: number,
    /** Caps catch-up work after a stall (tab switch, breakpoint) to avoid a spiral of death. */
    readonly maxStepsPerFrame = 5,
  ) {}

  /** Returns how many fixed steps to run for a frame that took `frameSeconds`. */
  consume(frameSeconds: number): number {
    this.accumulator += Math.max(0, frameSeconds);
    let steps = Math.floor(this.accumulator / this.stepSeconds);
    this.accumulator -= steps * this.stepSeconds;
    if (steps > this.maxStepsPerFrame) {
      steps = this.maxStepsPerFrame;
      this.accumulator = 0;
    }
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
