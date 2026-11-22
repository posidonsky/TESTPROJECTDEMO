// Small grid A* used by guards and inmates.
// The world is static apart from object states, so we take a blocked() callback.

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      const t = a[p]; a[p] = a[i]; a[i] = t; i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        const t = a[m]; a[m] = a[i]; a[i] = t; i = m;
      }
    }
    return top;
  }
}

/**
 * @param {number} sx start tile x
 * @param {number} sy start tile y
 * @param {number} gx goal tile x
 * @param {number} gy goal tile y
 * @param {number} w world width
 * @param {number} h world height
 * @param {(x:number,y:number)=>boolean} blocked
 * @param {number} maxNodes safety limit
 * @returns {Array<[number,number]>|null} path excluding start, including goal
 */
export function findPath(sx, sy, gx, gy, w, h, blocked, maxNodes = 9000) {
  sx |= 0; sy |= 0; gx |= 0; gy |= 0;
  if (sx === gx && sy === gy) return [];
  if (gx < 0 || gy < 0 || gx >= w || gy >= h) return null;
  if (blocked(gx, gy)) {
    // snap goal to a neighbour that is free
    let best = null, bestD = 1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (blocked(nx, ny)) continue;
      const d = Math.abs(nx - sx) + Math.abs(ny - sy);
      if (d < bestD) { bestD = d; best = [nx, ny]; }
    }
    if (!best) return null;
    gx = best[0]; gy = best[1];
    if (sx === gx && sy === gy) return [];
  }

  const size = w * h;
  const gScore = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = new MinHeap();
  const startI = sy * w + sx;
  const goalI = gy * w + gx;
  const heur = (x, y) => (Math.abs(x - gx) + Math.abs(y - gy)) * 1.001;

  gScore[startI] = 0;
  open.push({ i: startI, x: sx, y: sy, f: heur(sx, sy) });
  let expanded = 0;

  while (open.size) {
    if (++expanded > maxNodes) return null;
    const cur = open.pop();
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    if (cur.i === goalI) {
      const out = [];
      let i = cur.i;
      while (i !== startI && i !== -1) {
        out.push([i % w, (i / w) | 0]);
        i = came[i];
      }
      out.reverse();
      return out;
    }
    const cx = cur.x, cy = cur.y;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (closed[ni]) continue;
        if (blocked(nx, ny)) continue;
        // do not slip diagonally through a corner
        if (dx && dy && (blocked(cx + dx, cy) || blocked(cx, cy + dy))) continue;
        const step = (dx && dy) ? 1.41421 : 1;
        const ng = gScore[cur.i] + step;
        if (ng < gScore[ni]) {
          gScore[ni] = ng;
          came[ni] = cur.i;
          open.push({ i: ni, x: nx, y: ny, f: ng + heur(nx, ny) });
        }
      }
    }
  }
  return null;
}
