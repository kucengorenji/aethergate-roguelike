/**
 * Tunables for the demo. Everything a designer might want to tweak lives here,
 * and the debug panel (backquote key) edits these values live.
 */
export const config = {
  arena: { halfSize: 14, wallHeight: 1.2, wallThickness: 0.5 },
  player: {
    radius: 0.5,
    rollForce: 14,
    maxSpeed: 9,
    jumpImpulse: 4.5,
    respawnBelowY: -10,
  },
  gems: { count: 10, pickupRadius: 1.1, height: 0.9, spinSpeed: 2, bobAmplitude: 0.15 },
  obstacles: { count: 6 },
  camera: { offsetY: 10, offsetZ: 11, stiffness: 5 },
  colors: {
    sky: 0x1b2433,
    ground: 0x3a4a5e,
    wall: 0x55677f,
    obstacle: 0x7a8ba3,
    player: 0xf2b134,
    playerStripe: 0x2b2b2b,
    gem: 0x4fd1c5,
  },
};

export type Config = typeof config;
