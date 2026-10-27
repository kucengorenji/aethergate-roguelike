export type Phase = 'playing' | 'won';

export interface GameState {
  phase: Phase;
  score: number;
  total: number;
  /** Seconds of play in the current round. */
  elapsed: number;
}

export function createState(): GameState {
  return { phase: 'playing', score: 0, total: 0, elapsed: 0 };
}
