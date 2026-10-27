/**
 * Tunables. Everything a designer might want to tweak lives here, and the debug
 * panel (backquote key) edits these values live.
 */
export const config = {
  player: {
    /** Capsule: total height is 2 * (halfHeight + radius). */
    radius: 0.35,
    halfHeight: 0.55,
    walkSpeed: 5.5,
    /** Multiplier when the input points backward. */
    backSpeedFactor: 0.7,
    /** m/s^2 toward the target velocity. High values feel snappy. */
    acceleration: 45,
    gravity: 25,
    maxFallSpeed: 30,
    stepHeight: 0.35,
    respawnBelowY: -10,
  },
  look: {
    /** Radians per pixel of mouse movement. */
    sensitivity: 0.0022,
    minPitch: -0.75,
    maxPitch: 0.9,
  },
  camera: {
    fov: 65,
    /** Distance behind the shoulder pivot. */
    distance: 4.2,
    /** Sideways offset of the pivot (positive is right shoulder). */
    shoulder: 1.05,
    /** Pivot height above the capsule center. */
    height: 0.95,
    /** Gap kept between the camera and a wall it pushes in front of. */
    wallMargin: 0.25,
  },
  animation: {
    /** Speed (m/s) at which the run clip plays at normal rate. */
    runClipSpeed: 5.5,
    /** Below this horizontal speed the character counts as standing. */
    idleBelowSpeed: 0.4,
    fadeSeconds: 0.15,
  },
  footsteps: { strideMeters: 1.55, volume: 0.35 },
  colors: {
    skyZenith: 0x8c8f99,
    skyHorizon: 0xe9cf9b,
    fog: 0xc9b48c,
    floor: 0x8d8478,
    wall: 0xb2a894,
    pillar: 0xc4b89c,
    cover: 0x9c917f,
    trim: 0x7f776b,
    sun: 0xffdcaa,
    tree: 0xf7d98a,
    robe: 0x5b4f66,
    hood: 0x3d3446,
    skin: 0xc7a984,
    accent: 0xd8a548,
  },
};

export type Config = typeof config;
