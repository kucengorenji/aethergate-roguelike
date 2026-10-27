export const ProjectileKind = { Bolt: 0, Orb: 1, Comet: 2 } as const;
export type ProjectileKind = (typeof ProjectileKind)[keyof typeof ProjectileKind];

export const Team = { Player: 0, Enemy: 1 } as const;
export type Team = (typeof Team)[keyof typeof Team];

/**
 * Fixed-capacity pool of projectiles as struct-of-arrays. Projectiles are too
 * many and too short-lived to be ECS entities: no allocation per shot, one
 * instanced draw call per kind.
 */
export class ProjectilePool {
  readonly alive: Uint8Array;
  readonly kind: Uint8Array;
  readonly team: Uint8Array;
  /** Position now and at the previous step (for swept hits and interpolation). */
  readonly pos: Float32Array;
  readonly prev: Float32Array;
  readonly vel: Float32Array;
  readonly radius: Float32Array;
  readonly damage: Float32Array;
  readonly life: Float32Array;
  private readonly free: number[] = [];
  private live = 0;

  constructor(readonly capacity: number) {
    this.alive = new Uint8Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.team = new Uint8Array(capacity);
    this.pos = new Float32Array(capacity * 3);
    this.prev = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.radius = new Float32Array(capacity);
    this.damage = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
  }

  get count(): number {
    return this.live;
  }

  /** Returns the slot index, or -1 when the pool is full (the shot is dropped). */
  spawn(p: {
    kind: ProjectileKind;
    team: Team;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    radius: number;
    damage: number;
    life: number;
  }): number {
    const i = this.free.pop();
    if (i === undefined) return -1;
    this.alive[i] = 1;
    this.kind[i] = p.kind;
    this.team[i] = p.team;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.prev.set([p.x, p.y, p.z], i * 3);
    this.vel.set([p.vx, p.vy, p.vz], i * 3);
    this.radius[i] = p.radius;
    this.damage[i] = p.damage;
    this.life[i] = p.life;
    this.live++;
    return i;
  }

  release(i: number): void {
    if (!this.alive[i]) return;
    this.alive[i] = 0;
    this.free.push(i);
    this.live--;
  }

  clear(): void {
    for (let i = 0; i < this.capacity; i++) this.release(i);
  }
}
