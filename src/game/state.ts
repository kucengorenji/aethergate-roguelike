export interface GameState {
  /** Seconds of play since the last reset. */
  elapsed: number;
}

export function createState(): GameState {
  return { elapsed: 0 };
}
