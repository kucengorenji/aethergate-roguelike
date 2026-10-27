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
    /** Multiplier while bashing or drinking. */
    actionSpeedFactor: 0.35,
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
  health: { player: 100 },
  bolt: {
    speed: 40,
    damage: 10,
    /** Focus per cast. */
    cost: 6,
    /** Seconds between casts while the button is held. */
    interval: 0.2,
    radius: 0.12,
    life: 1.6,
    /** Drawn size relative to the hit radius, so bolts read at range. */
    visualScale: 2,
  },
  /** Staff tip relative to the capsule center, in the look frame. */
  muzzle: { right: 0.42, up: 0.55, forward: 0.6 },
  aim: { maxDistance: 120 },
  focus: { max: 100, regenPerSecond: 32, regenDelay: 0.6 },
  dodge: { duration: 0.42, distance: 5, invulnerable: 0.3, cooldown: 0.35 },
  bash: { duration: 0.42, hitAt: 0.14, range: 2.1, arcDegrees: 110, damage: 15, knockback: 7 },
  flask: { charges: 3, heal: 40, duration: 0.9, healAt: 0.55 },
  dummy: { health: 300, radius: 0.4, halfHeight: 0.55, respawnSeconds: 2, spring: 40, damping: 9 },
  totem: {
    enabled: true,
    interval: 3.5,
    chargeSeconds: 0.9,
    orbSpeed: 9,
    orbDamage: 20,
    orbRadius: 0.32,
    orbLife: 6,
  },
  feedback: {
    hitstopSteps: 4,
    hitstopTimeScale: 0.05,
    flashSeconds: 0.1,
    numberSeconds: 0.8,
    castKick: 0.01,
    kickRecover: 14,
    hurtShake: 0.22,
    shakeRecover: 5,
  },
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
    bolt: 0x7cc8ff,
    orb: 0xff8a3d,
    dummy: 0xb08d5b,
    totem: 0x6b6458,
  },
};

export type Config = typeof config;
