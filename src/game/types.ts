import type { GameContext, System } from '@engine/game';
import type { Entity } from './components';
import type { GameState } from './state';

export type Ctx = GameContext<Entity, GameState>;
export type GameSystem = System<Entity, GameState>;
