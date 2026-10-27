import * as THREE from 'three/webgpu';
import { config } from '../config';
import type { GameSystem } from '../types';

const POOL = 24;
const v = new THREE.Vector3();

/** Floating damage numbers, projected to the screen from world positions (frame system). */
export function createDamageNumbersSystem(): GameSystem {
  const root = document.getElementById('numbers')!;
  const spans = Array.from({ length: POOL }, () => {
    const span = document.createElement('span');
    span.hidden = true;
    root.appendChild(span);
    return span;
  });

  return ({ state, camera }) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const numbers = state.damageNumbers;
    const first = Math.max(0, numbers.length - POOL);
    for (let i = 0; i < POOL; i++) {
      const n = numbers[first + i];
      const span = spans[i]!;
      if (!n) {
        span.hidden = true;
        continue;
      }
      const t = n.age / config.feedback.numberSeconds;
      v.set(n.x, n.y + t * 0.8, n.z).project(camera);
      if (v.z > 1) {
        span.hidden = true;
        continue;
      }
      span.hidden = false;
      span.textContent = String(Math.round(n.value));
      span.style.transform = `translate(${((v.x + 1) / 2) * width}px, ${((1 - v.y) / 2) * height}px) translate(-50%, -50%) scale(${1.25 - Math.min(1, t * 4) * 0.25})`;
      span.style.opacity = String(Math.min(1, 2 - t * 2));
    }
  };
}
