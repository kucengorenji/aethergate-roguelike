import type { CoreComponents } from '@engine/ecs';

/** All components in the demo. Add new optional fields here as the game grows. */
export interface Entity extends CoreComponents {
  player?: true;
  gem?: { baseY: number; phase: number };
}
