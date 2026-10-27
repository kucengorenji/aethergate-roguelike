import { config } from '../config';
import type { Ctx } from '../types';
import { OFFER_INFO, type Reward } from './rewards';

/** Gives the player a room's reward and says so on screen. */
export function applyReward(ctx: Ctx, reward: Reward): void {
  const { run } = ctx.state;
  const player = ctx.world.with('player', 'health', 'flask').first;
  let text = OFFER_INFO[reward].label;
  switch (reward) {
    case 'boon':
      // Counted until spec 0007 adds the choice of blessings.
      run.boons++;
      text = 'Blessing received';
      break;
    case 'shards':
      run.shards += config.run.shards;
      text = `+${config.run.shards} Lumen shards`;
      break;
    case 'heal':
      if (player) {
        const { health } = player;
        const amount = Math.min(
          health.max - health.current,
          Math.round(health.max * config.run.heal),
        );
        health.current += amount;
        text = `Healed ${amount}`;
      }
      break;
    case 'flask':
      if (player) {
        player.flask.charges = Math.min(player.flask.max, player.flask.charges + 1);
        text = 'Flask charge restored';
      }
      break;
  }
  ctx.state.message = { text, age: 0 };
  ctx.audio.play('pickup', { volume: 0.6 });
}
