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
  comet: {
    speed: 22,
    damage: 35,
    /** Burst radius, m. */
    radius: 3,
    knockback: 8,
    cooldown: 6,
    /** Collision radius of the comet itself. */
    size: 0.3,
    maxRange: 40,
    castKick: 0.035,
    burstShake: 0.16,
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
  enemies: {
    soldier: {
      health: 40,
      radius: 0.35,
      halfHeight: 0.5,
      speed: 3.6,
      reach: 1.7,
      windup: 0.5,
      attack: 0.18,
      recover: 0.7,
      damage: 12,
      lunge: 6,
    },
    caster: {
      health: 30,
      radius: 0.33,
      halfHeight: 0.55,
      speed: 3.2,
      minRange: 8,
      maxRange: 13,
      windup: 0.7,
      attack: 0.1,
      recover: 0.4,
      cooldown: 2.4,
      damage: 10,
      orbSpeed: 13,
    },
    knight: {
      health: 120,
      radius: 0.45,
      halfHeight: 0.6,
      speed: 2.3,
      reach: 2.6,
      windup: 0.85,
      attack: 0.15,
      recover: 1,
      damage: 22,
      slamDistance: 1.6,
      slamRadius: 2,
      guardArcDegrees: 120,
      guardBreak: 1.6,
    },
    hound: {
      health: 25,
      radius: 0.3,
      halfHeight: 0.15,
      speed: 7,
      flankRadius: 5,
      reach: 6,
      windup: 0.4,
      attack: 0.35,
      recover: 0.8,
      damage: 8,
      leapSpeed: 15,
    },
  },
  enemy: {
    /** Debug: enemies stop thinking and moving. */
    frozen: false,
    riseSeconds: 0.9,
    staggerSeconds: 0.6,
    dyingSeconds: 1.2,
    /** Push from a bolt hit, m/s. */
    flinchPush: 2.5,
    /** Extra gap kept between enemies, m. */
    separation: 0.5,
    /** Radians per second enemies turn toward their target. */
    turnRate: 8,
  },
  run: {
    /** Seconds between the fade-in and the first wave in later rooms. */
    startDelay: 1.5,
    fadeSeconds: 0.35,
    baseBudget: 3,
    budgetPerDepth: 1.2,
    rewardPool: ['boon', 'shards', 'heal', 'flask'] as const,
    shards: 25,
    /** Fraction of max health a Heal restores. */
    heal: 0.3,
    /** Placeholders until spec 0008 brings the real mini-boss and boss. */
    eliteWaves: [
      { knight: 1, soldier: 3 },
      { knight: 2, caster: 2 },
    ] as Partial<Record<'soldier' | 'caster' | 'knight' | 'hound', number>>[],
    bossWaves: [
      { knight: 2, soldier: 4, caster: 2, hound: 2 },
      { knight: 3, hound: 3, caster: 2 },
    ] as Partial<Record<'soldier' | 'caster' | 'knight' | 'hound', number>>[],
    pickupRadius: 1.3,
    doorRadius: 2.4,
  },
  status: {
    chill: { slowPerStack: 0.2, maxStacks: 3, duration: 3, freezeSeconds: 1.5 },
    weight: { maxStacks: 3, duration: 4, crushDamage: 25 },
    rot: {
      perStackPerSecond: 3,
      maxStacks: 5,
      festerMaxStacks: 8,
      festerBonus: 0.6,
      duration: 4,
      tick: 0.5,
    },
  },
  boons: {
    coldHeart: 0.25,
    novaRadius: 2.5,
    pullRadius: 6,
    pullSpeed: 14,
    meteorDamage: 15,
    arcRange: 5,
    arcFraction: 0.5,
    thunderRange: 8,
    thunderDamage: 20,
    staticRange: 7,
    staticDamage: 15,
    thunderheadEvery: 5,
  },
  encounter: {
    startDelay: 2,
    intermission: 2,
    minSpawnDistance: 9,
    waves: [
      { soldier: 4, caster: 1 },
      { soldier: 3, hound: 2, caster: 1 },
      { knight: 1, soldier: 2, caster: 2, hound: 2 },
    ] as Partial<Record<'soldier' | 'caster' | 'knight' | 'hound', number>>[],
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
    comet: 0xffa04a,
    dummy: 0xb08d5b,
    soldier: 0x5d5148,
    caster: 0x3f4a3a,
    knight: 0x6f6a63,
    hound: 0x4a3b33,
    enemyGlow: 0xff7a3d,
    casterGlow: 0x9be05a,
    marker: 0xff5a2a,
    totem: 0x6b6458,
  },
};

export type Config = typeof config;
