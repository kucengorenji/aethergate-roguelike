import { readLaunchParams } from '@engine/params';
import { createGame } from '@game/index';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;

createGame(canvas, readLaunchParams())
  .then((game) => {
    game.start();
  })
  .catch((error: unknown) => {
    console.error(error);
    const message = document.getElementById('fatal')!;
    message.hidden = false;
    message.querySelector('pre')!.textContent = String(error);
  });
