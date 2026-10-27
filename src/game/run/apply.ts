import { offerBoons, pickGod } from '../boons/offer';
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
      openBoonChoice(ctx);
      ctx.audio.play('pickup', { volume: 0.6 });
      return;
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

/** Opens a choice of blessings from a demigod picked by the run's RNG. */
export function openBoonChoice(ctx: Ctx, god = pickGod(ctx.rng)): void {
  const held = ctx.world.with('player', 'boons').first?.boons.held;
  if (!held) return;
  const options = offerBoons(ctx.rng, held, god);
  // Every blessing of this demigod is held: nothing to offer, so the reward is spent.
  if (options.length === 0) return;
  ctx.state.choice = { god, options };
}
