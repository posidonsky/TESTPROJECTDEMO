// Actors: shared movement, collision and path-following.
import { TILE } from './world.js';
import { findPath } from './path.js';

export const DIR_VEC = {
  down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0]
};

function boxBlocked(world, cx, cy, hw, hh) {
  const x0 = Math.floor((cx - hw) / TILE), x1 = Math.floor((cx + hw) / TILE);
  const y0 = Math.floor((cy - hh) / TILE), y1 = Math.floor((cy + hh) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (world.solidAt(tx, ty)) return true;
    }
  }
  return false;
}

export class Actor {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.speed = opts.speed || 44;
    this.name = opts.name || '';
    this.kind = opts.kind || 'inmate';
    this.palette = opts.palette || 'inmate';
    this.facing = 'down';
    this.moving = false;
    this.anim = 0;
    this.walked = 0;
    this.path = null;
    this.hw = 5;
    this.hh = 4;
    this.stuck = 0;
    this.repathTimer = 0;
    this.busy = 0;
    this.say = '';
    this.sayTimer = 0;
  }

  get tileX() { return Math.floor(this.x / TILE); }
  get tileY() { return Math.floor(this.y / TILE); }
  get cx() { return this.x; }
  get cy() { return this.y; }

  isFree(world, tx, ty) { return !world.solidAt(tx, ty); }

  setPath(path) { this.path = path && path.length ? path : null; this.stuck = 0; }

  goTo(world, tx, ty, maxNodes = 9000) {
    const p = findPath(this.tileX, this.tileY, tx, ty, world.w, world.h,
      (x, y) => world.solidAt(x, y), maxNodes);
    if (p) this.setPath(p);
    return !!p;
  }

  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  moveDir(world, dx, dy, dt) {
    const len = Math.hypot(dx, dy);
    if (!len) { this.moving = false; return; }
    dx /= len; dy /= len;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const step = this.speed * dt;
    let moved = 0;
    // axis separated so we slide along walls
    if (dx) {
      const nx = this.x + dx * step;
      if (!boxBlocked(world, nx, this.y, this.hw, this.hh)) { this.x = nx; moved += Math.abs(dx * step); }
    }
    if (dy) {
      const ny = this.y + dy * step;
      if (!boxBlocked(world, this.x, ny, this.hw, this.hh)) { this.y = ny; moved += Math.abs(dy * step); }
    }
    this.walked += moved;
    this.moving = moved > 0.05;
    if (this.moving) this.anim += moved / 10;
  }

  followPath(world, dt) {
    if (!this.path || !this.path.length) { this.moving = false; return false; }
    const [tx, ty] = this.path[0];
    const gx = tx * TILE + TILE / 2;
    const gy = ty * TILE + TILE / 2;
    const dx = gx - this.x, dy = gy - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2.2) {
      this.x = gx; this.y = gy;
      this.path.shift();
      if (!this.path.length) { this.moving = false; return true; }
      return false;
    }
    const before = this.x + this.y;
    this.moveDir(world, dx, dy, dt);
    if (Math.abs(this.x + this.y - before) < 0.02) this.stuck += dt;
    else this.stuck = 0;
    return false;
  }

  updateTimers(dt) {
    this.anim += 0;
    if (this.sayTimer > 0) {
      this.sayTimer -= dt;
      if (this.sayTimer <= 0) this.say = '';
    }
    if (this.busy > 0) this.busy -= dt;
  }
}

export function makePlayer(x, y) {
  const a = new Actor(x, y, { speed: 86, kind: 'player', palette: 'player', name: 'You' });
  return a;
}
