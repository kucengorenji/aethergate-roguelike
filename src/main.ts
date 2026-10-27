import { readLaunchParams } from '@engine/params';
import { createDemoGame } from '@game/index';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;

createDemoGame(canvas, readLaunchParams())
  .then((game) => {
    game.start();
  })
  .catch((error: unknown) => {
    console.error(error);
    const message = document.getElementById('fatal')!;
    message.hidden = false;
    message.querySelector('pre')!.textContent = String(error);
  });
