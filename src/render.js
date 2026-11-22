// IRONWOOD PENITENTIARY - procedural pixel-art renderer. Everything is drawn
// in code: tiles, furniture, characters, lighting. No external art assets.
import { TILE, T, isSolidTile } from './world.js';

const PALETTES = {
  player: { h: '#2b2018', s: '#e3ab7c', e: '#1b1410', u: '#e2761f', U: '#b95c12', w: '#f2e4cc', b: '#2c2933' },
  guard: { h: '#241a14', s: '#d69c74', e: '#161010', u: '#2c4568', U: '#1d3149', w: '#0f172a', b: '#15151d', c: '#16263c', C: '#3b5a86' },
  inmateA: { h: '#1b1410', s: '#c98d63', e: '#140f0c', u: '#d9772a', U: '#b25f1d', w: '#e9dcc4', b: '#2c2933' },
  inmateB: { h: '#0f0b0a', s: '#8d5b3a', e: '#100c09', u: '#e08a34', U: '#b86c22', w: '#e9dcc4', b: '#2c2933' },
  inmateC: { h: '#5a3a22', s: '#f0c39b', e: '#1a1410', u: '#cf6a24', U: '#a7531a', w: '#e9dcc4', b: '#2c2933' },
  inmateD: { h: '#2a1d14', s: '#a9714b', e: '#120d09', u: '#e69840', U: '#bd772c', w: '#e9dcc4', b: '#2c2933' }
};

const DOWN0 = [
  '............',
  '....hhhh....',
  '...hhhhhh...',
  '...hssssh...',
  '...hseseh...',
  '...hssssh...',
  '....ssss....',
  '...uuuuuu...',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '.suuuuuuuus.',
  '.suuuuuuuus.',
  '..uuuuuuuu..',
  '..uwwwwwwu..',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '..UUU..UUU..',
  '..UUU..UUU..',
  '..UUU..UUU..',
  '..bbb..bbb..'
];
const DOWN1 = [
  '............',
  '....hhhh....',
  '...hhhhhh...',
  '...hssssh...',
  '...hseseh...',
  '...hssssh...',
  '....ssss....',
  '...uuuuuu...',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '.suuuuuuuus.',
  '.suuuuuuuus.',
  '..uuuuuuuu..',
  '..uwwwwwwu..',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '..UUU..UUU..',
  '..UUU..UUU..',
  '.UUU....UUU.',
  '.bbb....bbb.'
];
const UP0 = [
  '............',
  '....hhhh....',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hhhhhh...',
  '....hhhh....',
  '...uuuuuu...',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '.suuuuuuuus.',
  '.suuuuuuuus.',
  '..uuuuuuuu..',
  '..uwwwwwwu..',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '..UUU..UUU..',
  '..UUU..UUU..',
  '..UUU..UUU..',
  '..bbb..bbb..'
];
const UP1 = [
  '............',
  '....hhhh....',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hhhhhh...',
  '....hhhh....',
  '...uuuuuu...',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '.suuuuuuuus.',
  '.suuuuuuuus.',
  '..uuuuuuuu..',
  '..uwwwwwwu..',
  '..uuuuuuuu..',
  '..uuuuuuuu..',
  '..UUU..UUU..',
  '..UUU..UUU..',
  '.UUU....UUU.',
  '.bbb....bbb.'
];
const SIDE0 = [
  '............',
  '....hhhh....',
  '...hhhhhh...',
  '...hhssss...',
  '...hhsses...',
  '...hhssss...',
  '....ssss....',
  '...uuuuuu...',
  '..uuuuuuu...',
  '..uuuuuuu...',
  '..uuuuuuus..',
  '..uuuuuuu...',
  '..uuuuuuu...',
  '..uwwwwwu...',
  '..uuuuuuu...',
  '..uuuuuuu...',
  '...UUUUU....',
  '...UUUUU....',
  '...UU.UU....',
  '...bb.bb....'
];
const SIDE1 = [
  '............',
  '....hhhh....',
  '...hhhhhh...',
  '...hhssss...',
  '...hhsses...',
  '...hhssss...',
  '....ssss....',
  '...uuuuuu...',
  '..uuuuuuu...',
  '..uuuuuuu...',
  '..uuuuuuus..',
  '..uuuuuuu...',
  '..uuuuuuu...',
  '..uwwwwwu...',
  '..uuuuuuu...',
  '..uuuuuuu...',
  '...UUUUU....',
  '...UUUUU....',
  '...UUUU.....',
  '...bbbb.....'
];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { c, x };
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ctxStroke(ctx, style, width, draw) {
  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  draw();
  ctx.restore();
}

function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

// ---------------------------------------------------------------- tile atlas
function buildAtlas() {
  const S = 16, cols = 4;
  const { c, x } = makeCanvas(S * cols, S * 8);
  x.imageSmoothingEnabled = false;

  const px = (ox, oy, i, j, col, w = 1, h = 1) => {
    x.fillStyle = col;
    x.fillRect(ox + i, oy + j, w, h);
  };

  for (let v = 0; v < cols; v++) {
    const rnd = seeded(1000 + v * 77);
    // grass
    let ox = v * S, oy = 0;
    px(ox, oy, 0, 0, '#3f5c33', S, S);
    for (let i = 0; i < 30; i++) {
      const gx = (rnd() * S) | 0, gy = (rnd() * S) | 0;
      px(ox, oy, gx, gy, rnd() < 0.5 ? '#4a6b3a' : '#36502b', 1, 1);
    }
    for (let i = 0; i < 4; i++) {
      const gx = (rnd() * (S - 3)) | 0, gy = (rnd() * (S - 3)) | 0;
      px(ox, oy, gx, gy, '#54763f', 1, 2);
      px(ox, oy, gx + 1, gy + 1, '#54763f', 1, 1);
      px(ox, oy, gx + 2, gy, '#54763f', 1, 1);
    }

    // pavement
    oy = S;
    px(ox, oy, 0, 0, '#6d6c72', S, S);
    px(ox, oy, 0, 0, '#79787e', S, 1);
    px(ox, oy, 0, 15, '#5c5b61', S, 1);
    px(ox, oy, 15, 0, '#5c5b61', 1, S);
    for (let i = 0; i < 18; i++) {
      const gx = (rnd() * S) | 0, gy = (rnd() * S) | 0;
      px(ox, oy, gx, gy, rnd() < 0.5 ? '#63626a' : '#767579');
    }
    if (v === 1) {
      px(ox, oy, 3, 4, '#565560', 4, 1);
      px(ox, oy, 6, 5, '#565560', 1, 3);
      px(ox, oy, 9, 11, '#565560', 3, 1);
    }

    // concrete floor
    oy = S * 2;
    px(ox, oy, 0, 0, '#8b8073', S, S);
    for (let i = 0; i < 40; i++) {
      const gx = (rnd() * S) | 0, gy = (rnd() * S) | 0;
      px(ox, oy, gx, gy, rnd() < 0.5 ? '#82776a' : '#948a7c');
    }
    px(ox, oy, 0, 15, '#75695e', S, 1);
    px(ox, oy, 15, 0, '#75695e', 1, S);

    // tiled floor (checker)
    oy = S * 3;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const even = ((i >> 3) + (j >> 3)) % 2 === 0;
      let col = even ? '#c7c1b2' : '#b0aa9b';
      if ((i % 8 === 0) || (j % 8 === 0)) col = '#9c968980';
      px(ox, oy, i, j, col);
    }
    px(ox, oy, 0, 0, '#a9a392', S, 1);

    // wall (brick)
    oy = S * 4;
    px(ox, oy, 0, 0, '#3d2e28', S, S);
    for (let row = 0; row < 4; row++) {
      const by = row * 4;
      const off = (row % 2) * 4;
      for (let b = -1; b < 3; b++) {
        const bx = b * 8 + off;
        px(ox, oy, Math.max(0, bx), by + 1, '#7a5345', 7, 3);
        px(ox, oy, Math.max(0, bx), by + 1, '#8e6352', 7, 1);
      }
    }
    px(ox, oy, 0, 0, '#2b201c', S, 1);
    px(ox, oy, 0, 15, '#241a17', S, 1);

    // fence (transparent + wire)
    oy = S * 5;
    x.clearRect(ox, oy, S, S);
    x.strokeStyle = '#9aa2a8';
    x.lineWidth = 1;
    x.beginPath();
    for (let i = -S; i < S * 2; i += 6) {
      x.moveTo(ox + i, oy);
      x.lineTo(ox + i + S, oy + S);
      x.moveTo(ox + i, oy + S);
      x.lineTo(ox + i + S, oy);
    }
    x.stroke();
    px(ox, oy, 0, 0, '#5c656b', 1, S);
    if (v % 2 === 0) {
      px(ox, oy, 6, 0, '#8b9298', 2, S);
      px(ox, oy, 6, 0, '#b6bec4', 2, 1);
    }

    // gate (bars)
    oy = S * 6;
    x.clearRect(ox, oy, S, S);
    for (let i = 1; i < S; i += 4) px(ox, oy, i, 0, '#79838b', 2, S);
    px(ox, oy, 0, 2, '#9aa4ac', S, 2);
    px(ox, oy, 0, 12, '#9aa4ac', S, 2);
    px(ox, oy, 0, 0, '#3b4249', S, 1);

    // door (metal double panel)
    oy = S * 7;
    x.clearRect(ox, oy, S, S);
    px(ox, oy, 0, 0, '#4d545a', S, 2);
    px(ox, oy, 0, 1, '#94a0a8', S, 1);
    px(ox, oy, 1, 2, '#7f8a92', 6, 13);
    px(ox, oy, 9, 2, '#7f8a92', 6, 13);
    px(ox, oy, 1, 2, '#6b757c', 1, 13);
    px(ox, oy, 9, 2, '#6b757c', 1, 13);
    px(ox, oy, 5, 8, '#c9b458', 2, 2);
    px(ox, oy, 9, 8, '#c9b458', 2, 2);
    px(ox, oy, 0, 15, '#3b4146', S, 1);
  }
  return c;
}

// ---------------------------------------------------------------- sprites
function guardify(map) {
  return map.map((row, j) => {
    let r = j <= 3 ? row.replace(/h/g, 'c') : row;
    if (j === 2) r = r.replace(/c/g, 'C');          // cap brim highlight
    if (j === 9) r = r.slice(0, 5) + 'w' + r.slice(6); // chest badge
    return r;
  });
}

function buildSprites() {
  const sets = {};
  const dirs = { down: [DOWN0, DOWN1], up: [UP0, UP1], side: [SIDE0, SIDE1] };
  for (const key in PALETTES) {
    const pal = PALETTES[key];
    sets[key] = {};
    for (const dir in dirs) {
      const maps = key === 'guard' ? dirs[dir].map(guardify) : dirs[dir];
      sets[key][dir] = maps.map(map => {
        const { c, x } = makeCanvas(12, 20);
        for (let j = 0; j < map.length; j++) {
          for (let i = 0; i < map[j].length; i++) {
            const ch = map[j][i];
            if (ch === '.') continue;
            const col = pal[ch];
            if (!col) continue;
            x.fillStyle = col;
            x.fillRect(i, j, 1, 1);
          }
        }
        return c;
      });
    }
  }
  return sets;
}

// ---------------------------------------------------------------- renderer
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.atlas = buildAtlas();
    this.sprites = buildSprites();
    this.zoom = 3;
    this.cam = { x: 0, y: 0 };
    this.dpr = 1;
    this.vw = 800; this.vh = 600;
    this.time = 0;
    this.particles = [];
    this.base = null;
    this.lamps = [];
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.showCones = true;
    this.resize();
    // soft shadow strip used under walls and tall objects
    const sh = makeCanvas(16, 12);
    const sg = sh.x.createLinearGradient(0, 0, 0, 12);
    sg.addColorStop(0, 'rgba(0,0,0,0.42)');
    sg.addColorStop(0.55, 'rgba(0,0,0,0.20)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    sh.x.fillStyle = sg;
    sh.x.fillRect(0, 0, 16, 12);
    this.wallShadow = sh.c;
  }

  setWorld(world) {
    this.world = world;
    const n = world.w * world.h;
    this.base = new Uint8Array(n);
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const t = world.tiles[y * world.w + x];
        let b = t;
        if (t === T.WALL) b = T.FLOOR;
        if (t === T.DOOR) {
          b = T.FLOOR;
          const neigh = [
            world.tileAt(x - 1, y), world.tileAt(x + 1, y),
            world.tileAt(x, y - 1), world.tileAt(x, y + 1)
          ];
          if (neigh.includes(T.TILE)) b = T.TILE;
        }
        if (t === T.FENCE || t === T.GATE) {
          b = (x >= 23 && x <= 97 && y >= 53 && y <= 71) ? T.GRASS : T.PAVE;
        }
        this.base[y * world.w + x] = b;
      }
    }
    this.lamps = world.objects.filter(o => o.lamp).map(o => o.lamp);
    this.buildDecals(world);
    this.cam.x = world.spawn.x - this.vw / this.zoom / 2;
    this.cam.y = world.spawn.y - this.vh / this.zoom / 2;
  }

  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    this.vw = vw; this.vh = vh;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(vw * this.dpr);
    this.canvas.height = Math.floor(vh * this.dpr);
    this.canvas.style.width = vw + 'px';
    this.canvas.style.height = vh + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.zoom = Math.max(2, Math.min(3, Math.round(vw / 520)));
    this.lightCanvas.width = this.canvas.width;
    this.lightCanvas.height = this.canvas.height;
    this.lightCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.world) {
      this.cam.x = Math.max(0, Math.min(this.world.w * TILE - vw / this.zoom,
        this.cam.x));
    }
  }

  sx(wx) { return (wx - this.cam.x) * this.zoom; }
  sy(wy) { return (wy - this.cam.y) * this.zoom; }

  buildDecals(world) {
    const out = [];
    const rnd = seeded(90210);
    const posterCols = ['#b8a06a', '#8fa3ad', '#b98a6a', '#9aa78a'];
    for (let y = 1; y < world.h - 1; y++) {
      for (let x = 1; x < world.w - 1; x++) {
        const t = world.tiles[y * world.w + x];
        const r = rnd();
        if (t === T.PAVE) {
          if (r < 0.05) {
            out.push({ k: 'crack', x: x * TILE + 2 + rnd() * 10, y: y * TILE + 2 + rnd() * 10, a: rnd() * Math.PI, l: 5 + rnd() * 7 });
          } else if (r < 0.075) {
            out.push({ k: 'stain', x: x * TILE + 4 + rnd() * 8, y: y * TILE + 4 + rnd() * 6, r: 3 + rnd() * 4 });
          } else if (r < 0.081) {
            out.push({ k: 'drain', x: x * TILE + 4, y: y * TILE + 5 });
          } else if (r < 0.10) {
            out.push({ k: 'weed', x: x * TILE + 3 + rnd() * 9, y: y * TILE + 4 + rnd() * 8 });
          }
        } else if (t === T.GRASS) {
          if (r < 0.12) out.push({ k: 'tuft', x: x * TILE + 3 + rnd() * 9, y: y * TILE + 3 + rnd() * 9 });
          else if (r < 0.16) out.push({ k: 'stone', x: x * TILE + 4 + rnd() * 8, y: y * TILE + 4 + rnd() * 8 });
          else if (r < 0.19) out.push({ k: 'patch', x: x * TILE + 8, y: y * TILE + 8, r: 4 + rnd() * 5 });
        } else if (t === T.WALL) {
          const below = world.tiles[(y + 1) * world.w + x];
          const walkableBelow = below !== T.WALL && below !== T.FENCE && below !== T.GATE;
          if (walkableBelow && r < 0.045) {
            out.push({ k: 'poster', x: x * TILE + 5, y: y * TILE + 3, c: posterCols[(x + y) % posterCols.length] });
          }
        }
      }
    }
    this.decals = out;
  }

  drawDecals(ctx) {
    const z = this.zoom;
    for (const d of this.decals) {
      const sx = this.sx(d.x), sy = this.sy(d.y);
      if (sx < -40 || sy < -40 || sx > this.vw + 40 || sy > this.vh + 40) continue;
      switch (d.k) {
        case 'crack':
          ctx.strokeStyle = 'rgba(20,18,16,0.30)';
          ctx.lineWidth = Math.max(1, z * 0.7);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(d.a) * d.l * z, sy + Math.sin(d.a) * d.l * z);
          ctx.lineTo(sx + Math.cos(d.a + 0.7) * d.l * 0.7 * z, sy + Math.sin(d.a + 0.7) * d.l * 0.7 * z);
          ctx.stroke();
          break;
        case 'stain':
          ctx.fillStyle = 'rgba(24,22,20,0.14)';
          ctx.beginPath();
          ctx.ellipse(sx, sy, d.r * z, d.r * 0.7 * z, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'drain':
          ctx.fillStyle = 'rgba(28,28,30,0.55)';
          ctx.fillRect(sx, sy, 8 * z, 6 * z);
          ctx.fillStyle = 'rgba(90,92,96,0.6)';
          for (let i = 0; i < 4; i++) ctx.fillRect(sx + z, sy + (i * 1.5 + 0.6) * z, 6 * z, z * 0.7);
          break;
        case 'weed':
          ctx.strokeStyle = 'rgba(96,124,74,0.75)';
          ctx.lineWidth = Math.max(1, z * 0.6);
          ctx.beginPath();
          ctx.moveTo(sx, sy + 3 * z); ctx.lineTo(sx - z, sy - z);
          ctx.moveTo(sx + 2 * z, sy + 3 * z); ctx.lineTo(sx + 2 * z, sy - 2 * z);
          ctx.moveTo(sx + 4 * z, sy + 3 * z); ctx.lineTo(sx + 5 * z, sy);
          ctx.stroke();
          break;
        case 'tuft':
          ctx.strokeStyle = 'rgba(88,120,66,0.8)';
          ctx.lineWidth = Math.max(1, z * 0.6);
          ctx.beginPath();
          ctx.moveTo(sx, sy + 2 * z); ctx.lineTo(sx - 1.5 * z, sy - 1.5 * z);
          ctx.moveTo(sx + 1.5 * z, sy + 2 * z); ctx.lineTo(sx + 1.5 * z, sy - 2.5 * z);
          ctx.moveTo(sx + 3 * z, sy + 2 * z); ctx.lineTo(sx + 4.5 * z, sy - z);
          ctx.stroke();
          break;
        case 'stone':
          ctx.fillStyle = 'rgba(150,148,138,0.35)';
          ctx.fillRect(sx, sy, 2 * z, 1.5 * z);
          break;
        case 'patch':
          ctx.fillStyle = 'rgba(104,92,58,0.16)';
          ctx.beginPath();
          ctx.ellipse(sx, sy, d.r * z, d.r * 0.6 * z, 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'poster':
          ctx.fillStyle = 'rgba(20,16,12,0.35)';
          ctx.fillRect(sx + z, sy + z, 8 * z, 9 * z);
          ctx.fillStyle = d.c;
          ctx.fillRect(sx, sy, 8 * z, 9 * z);
          ctx.fillStyle = 'rgba(40,34,26,0.5)';
          ctx.fillRect(sx + z, sy + z, 6 * z, z);
          ctx.fillRect(sx + z, sy + 3 * z, 4 * z, z);
          ctx.fillRect(sx + z, sy + 5 * z, 5 * z, z);
          break;
        default:
          break;
      }
    }
  }

  drawYardPaint(game) {
    const z = this.zoom;
    const x0 = 32 * TILE, y0 = 56 * TILE, x1 = 90 * TILE, y1 = 69 * TILE;
    ctxStroke(this.ctx, 'rgba(238,236,224,0.13)', 2 * z, () => {
      const c = this.ctx;
      c.strokeRect(this.sx(x0), this.sy(y0), (x1 - x0) * z, (y1 - y0) * z);
      c.beginPath();
      c.moveTo(this.sx((x0 + x1) / 2), this.sy(y0));
      c.lineTo(this.sx((x0 + x1) / 2), this.sy(y1));
      c.stroke();
      c.beginPath();
      c.arc(this.sx((x0 + x1) / 2), this.sy((y0 + y1) / 2), 3.2 * TILE * z, 0, Math.PI * 2);
      c.stroke();
      c.strokeRect(this.sx(x0), this.sy(y0 + 3 * TILE), 5 * TILE * z, 6 * TILE * z);
      c.strokeRect(this.sx(x1 - 5 * TILE), this.sy(y0 + 3 * TILE), 5 * TILE * z, 6 * TILE * z);
      c.beginPath();
      c.arc(this.sx(x0 + 5 * TILE), this.sy((y0 + y1) / 2), 2 * TILE * z, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(this.sx(x1 - 5 * TILE), this.sy((y0 + y1) / 2), 2 * TILE * z, 0, Math.PI * 2);
      c.stroke();
    });
  }

  updateCamera(game, dt) {
    const p = game.player;
    const targetX = p.x - this.vw / this.zoom / 2;
    const targetY = p.y - this.vh / this.zoom / 2 - 6;
    const k = 1 - Math.pow(0.0016, dt);
    this.cam.x += (targetX - this.cam.x) * k;
    this.cam.y += (targetY - this.cam.y) * k;
    const maxX = Math.max(0, this.world.w * TILE - this.vw / this.zoom);
    const maxY = Math.max(0, this.world.h * TILE - this.vh / this.zoom);
    this.cam.x = Math.max(0, Math.min(maxX, this.cam.x));
    this.cam.y = Math.max(0, Math.min(maxY, this.cam.y));
  }

  darkness(game) {
    const m = game.minutes;
    // 0 = full daylight, 1 = deep night
    const curve = (v) => Math.max(0, Math.min(1, v));
    if (m > 390 && m < 1080) return 0;
    if (m >= 1080 && m < 1290) return curve((m - 1080) / 210) * 0.6;
    if (m >= 1290 || m < 300) return 0.6;
    return curve(1 - (m - 300) / 90) * 0.6;
  }

  draw(game, dt) {
    this.time += dt;
    this.updateCamera(game, dt);
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1b1d20';
    ctx.fillRect(0, 0, this.vw, this.vh);

    const world = this.world;
    const zoom = this.zoom;
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE) - 1);
    const x1 = Math.min(world.w - 1, Math.ceil((this.cam.x + this.vw / zoom) / TILE) + 1);
    const y1 = Math.min(world.h - 1, Math.ceil((this.cam.y + this.vh / zoom) / TILE) + 1);

    // ---- ground
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.base[ty * world.w + tx];
        const variant = hash2(tx, ty) % 4;
        const sx = Math.round(this.sx(tx * TILE));
        const sy = Math.round(this.sy(ty * TILE));
        ctx.drawImage(this.atlas, variant * 16, t * 16, 16, 16,
          sx, sy, TILE * zoom + 1, TILE * zoom + 1);
      }
    }

    // ---- wall / fence overlays
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = world.tiles[ty * world.w + tx];
        if (t !== T.WALL && t !== T.FENCE && t !== T.GATE && t !== T.DOOR) continue;
        let row = 4;
        if (t === T.FENCE) row = 5;
        else if (t === T.GATE) row = 6;
        else if (t === T.DOOR) row = 7;
        const variant = hash2(tx, ty) % 4;
        const sx = Math.round(this.sx(tx * TILE));
        const sy = Math.round(this.sy(ty * TILE));
        ctx.drawImage(this.atlas, variant * 16, row * 16, 16, 16,
          sx, sy, TILE * zoom, TILE * zoom);
      }
    }

    // ---- wall drop shadows
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = world.tiles[ty * world.w + tx];
        if (t !== T.WALL && t !== T.GATE) continue;
        const below = world.tiles[(ty + 1) * world.w + tx];
        if (below === T.WALL || below === T.FENCE || below === T.GATE) continue;
        const sx = Math.round(this.sx(tx * TILE));
        const sy = Math.round(this.sy((ty + 1) * TILE));
        ctx.drawImage(this.wallShadow, 0, 0, 16, 12, sx, sy, TILE * zoom, 10 * zoom);
      }
    }

    // ---- floor decals + yard paint
    this.drawDecals(ctx);
    this.drawYardPaint(game);

    // ---- room labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    for (const L of ROOM_LABELS) {
      const sx = this.sx(L.x * TILE), sy = this.sy(L.y * TILE);
      if (sx < -120 || sy < -60 || sx > this.vw + 120 || sy > this.vh + 60) continue;
      ctx.fillStyle = 'rgba(20,16,12,0.22)';
      ctx.fillText(L.name, sx + 1, sy + 1);
      ctx.fillStyle = 'rgba(255,244,225,0.30)';
      ctx.fillText(L.name, sx, sy);
    }

    // ---- objects
    for (const o of world.objects) {
      if (o.lamp) continue;
      const sx = this.sx(o.x * TILE);
      const sy = this.sy(o.y * TILE);
      const sw = o.w * TILE * zoom;
      const sh = o.h * TILE * zoom;
      if (sx > this.vw + 80 || sy > this.vh + 80 || sx + sw < -80 || sy + sh < -80) continue;
      if (o.solid) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(sx + 2 * zoom, sy + 4 * zoom, sw, sh);
      }
      this.drawObject(ctx, o, sx, sy, sw, sh, zoom, game);
    }

    // ---- interaction highlight
    if (game.prompt && game.prompt.obj) {
      const o = game.prompt.obj;
      const pulse = 0.45 + 0.35 * Math.sin(this.time * 5);
      ctx.strokeStyle = `rgba(255,214,120,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(this.sx(o.x * TILE)) - 1,
        Math.round(this.sy(o.y * TILE)) - 1,
        o.w * TILE * zoom + 2,
        o.h * TILE * zoom + 2
      );
    }

    // ---- guard vision cones
    if (this.showCones) {
      for (const g of game.guards) {
        const a = g.actor;
        const gx = this.sx(a.x), gy = this.sy(a.y - 8);
        const [fx, fy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[a.facing];
        const angle = Math.atan2(fy, fx);
        const radius = 9.5 * TILE * zoom;
        const grad = ctx.createRadialGradient(gx, gy, 8, gx, gy, radius);
        grad.addColorStop(0, 'rgba(255,214,120,0.09)');
        grad.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.arc(gx, gy, radius, angle - 0.62, angle + 0.62);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ---- actors (sorted by y for overlap)
    const actors = [game.player, ...game.guards.map(g => g.actor), ...game.inmates.map(i => i.actor)];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) {
      const sx = Math.round(this.sx(a.x));
      const feetY = Math.round(this.sy(a.y));
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(sx, feetY, 7 * zoom * 0.9, 3.2 * zoom * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      const pal = a.kind === 'guard' ? 'guard' : (a.palette || 'inmateA');
      const set = this.sprites[pal] || this.sprites.inmateA;
      let dir = a.facing;
      if (dir === 'left') dir = 'side';
      if (dir === 'right') dir = 'side';
      const frames = set[dir] || set.down;
      const frame = a.moving ? (Math.floor(a.anim) % 2) : 0;
      const img = frames[frame];
      const dw = 12 * zoom, dh = 20 * zoom;
      const bob = a.moving ? (frame === 1 ? -1 : 0) : 0;
      ctx.save();
      if (a.facing === 'left') {
        ctx.translate(sx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-sx, 0);
      }
      ctx.drawImage(img, Math.round(sx - dw / 2), Math.round(feetY - dh + 1 + bob), dw, dh);
      ctx.restore();

      // player marker
      if (a.kind === 'player') {
        const t = this.time * 3;
        const bobM = Math.sin(t) * 2;
        ctx.fillStyle = '#ffd86b';
        ctx.beginPath();
        ctx.moveTo(sx, feetY - dh - 6 + bobM);
        ctx.lineTo(sx - 4, feetY - dh - 12 + bobM);
        ctx.lineTo(sx + 4, feetY - dh - 12 + bobM);
        ctx.closePath();
        ctx.fill();
      }

      // alert marker + speech bubbles
      if (a.kind === 'guard') {
        const g = game.guards.find(gg => gg.actor === a);
        if (g && g.mode === 'alert') {
          ctx.fillStyle = '#ff5544';
          ctx.font = 'bold 20px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', sx, feetY - dh - 12);
        }
      }
      if (a.say) this.drawBubble(ctx, a.say, sx, feetY - dh - 16);
    }

    // ---- particles
    this.updateParticles(dt);
    for (const p of this.particles) {
      ctx.fillStyle = p.col;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillRect(Math.round(this.sx(p.x)), Math.round(this.sy(p.y)), p.s * zoom, p.s * zoom);
    }
    ctx.globalAlpha = 1;

    // ---- lighting
    const dark = this.darkness(game);
    if (dark > 0.01) this.drawLighting(ctx, game, dark);

    // ---- screen edge dust/vignette
    const vg = ctx.createRadialGradient(
      this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35,
      this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.78
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // ---- fade / cut-scene overlay
    if (game.fx) {
      const f = game.fx;
      const dur = f.kind === 'solitary' ? 2.4 : 0.8;
      const p = 1 - Math.max(0, f.t) / dur;
      const a = Math.sin(Math.PI * Math.min(1, p * 1.2)) * 0.92;
      ctx.fillStyle = `rgba(8,10,14,${Math.min(0.92, a)})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
      ctx.fillStyle = `rgba(240,232,214,${Math.min(1, a * 1.3)})`;
      ctx.font = '600 16px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.text || '', this.vw / 2, this.vh / 2);
    }
  }

  drawBubble(ctx, text, sx, sy) {
    ctx.font = '600 11px ui-monospace, monospace';
    const w = ctx.measureText(text).width + 14;
    const h = 20;
    const bx = sx - w / 2, by = sy - h;
    ctx.fillStyle = 'rgba(16,14,18,0.86)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, w, h, 4); else ctx.rect(bx, by, w, h);
    ctx.fill();
    ctx.fillStyle = '#ffe9c9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, sx, by + h / 2 + 0.5);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  spawnDirt(x, y) {
    if (this.particles.length > 160) return;
    this.particles.push({
      x, y, vx: (Math.random() - 0.5) * 26, vy: -Math.random() * 30,
      life: 0.5 + Math.random() * 0.4, max: 0.9, s: 1,
      col: Math.random() < 0.5 ? '#6b4a33' : '#553a28'
    });
  }

  drawLighting(ctx, game, dark) {
    const lc = this.lightCtx;
    lc.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.vw, this.vh);
    lc.fillStyle = `rgba(9,13,26,${dark})`;
    lc.fillRect(0, 0, this.vw, this.vh);
    lc.globalCompositeOperation = 'destination-out';
    const zoom = this.zoom;

    const punch = (wx, wy, radius, strength = 1) => {
      const x = this.sx(wx), y = this.sy(wy);
      if (x < -radius || y < -radius || x > this.vw + radius || y > this.vh + radius) return;
      const g = lc.createRadialGradient(x, y, radius * 0.15, x, y, radius);
      g.addColorStop(0, `rgba(0,0,0,${0.88 * strength})`);
      g.addColorStop(0.55, `rgba(0,0,0,${0.5 * strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(x, y, radius, 0, Math.PI * 2);
      lc.fill();
    };

    // player carries a faint lantern of visibility
    punch(game.player.x, game.player.y - 6, 7.2 * TILE * zoom, 0.85);
    for (const l of this.lamps) punch(l.x * TILE, l.y * TILE, l.r * TILE * zoom, 0.95);

    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.lightCanvas, 0, 0, this.vw, this.vh);

    // warm lamp cores
    for (const l of this.lamps) {
      const x = this.sx(l.x * TILE), y = this.sy(l.y * TILE);
      if (x < -60 || y < -60 || x > this.vw + 60 || y > this.vh + 60) continue;
      const g = ctx.createRadialGradient(x, y, 1, x, y, 3.4 * TILE * zoom);
      g.addColorStop(0, 'rgba(255,205,120,0.20)');
      g.addColorStop(1, 'rgba(255,205,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 3.4 * TILE * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ------------------------------------------------------------- objects
  drawObject(ctx, o, sx, sy, sw, sh, z, game) {
    const r = (x, y, w, h, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(sx + x), Math.round(sy + y), Math.ceil(w), Math.ceil(h));
    };
    const u = z; // one world pixel in screen pixels
    switch (o.type) {
      case 'bed': {
        r(0, 0, sw, sh, '#3a2a20');
        r(u, u, sw - 2 * u, sh - 2 * u, '#6b4b33');
        r(u * 1.5, u * 1.5, sw - 3 * u, sh - 3 * u, '#d8d2c2');
        r(u * 2, u * 2, sw * 0.32, sh - 4 * u, '#efe9da'); // pillow
        r(sw * 0.5, u * 1.6, sw * 0.42, sh - 3.2 * u, '#c9712b'); // blanket
        r(sw * 0.5, u * 1.6, sw * 0.42, u, '#e08a3e');
        break;
      }
      case 'toilet': {
        if (o.own && game && game.digProgress > 0) {
          const p = Math.min(1, game.digProgress / 100);
          const cx = sx + sw * 0.5, cy = sy + sh * 0.95;
          const rad = sw * (0.55 + 0.35 * p);
          // scattered earth around the hole
          ctx.fillStyle = '#4a3524';
          for (let i = 0; i < 14; i++) {
            const a = i * 1.7;
            const rr = rad * (1.05 + (i % 3) * 0.16);
            ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55, u, u);
          }
          ctx.fillStyle = '#3a2a1c';
          ctx.beginPath();
          ctx.ellipse(cx, cy, rad * 1.25, rad * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#120c08';
          ctx.beginPath();
          ctx.ellipse(cx, cy, rad * 0.92, rad * 0.52, 0, 0, Math.PI * 2);
          ctx.fill();
          if (game.digProgress >= 60) {
            // a few exposed pipe bricks at the bottom
            ctx.fillStyle = '#5b4a3d';
            ctx.fillRect(cx - rad * 0.5, cy - rad * 0.2, rad, u * 1.4);
          }
        }
        r(0, 0, sw, sh, '#8f949a');
        r(u, u, sw - 2 * u, sh - 2 * u, '#c9ced3');
        ctx.fillStyle = '#eef1f3';
        ctx.beginPath();
        ctx.ellipse(sx + sw * 0.5, sy + sh * 0.58, sw * 0.29, sh * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aeb6bc';
        ctx.beginPath();
        ctx.ellipse(sx + sw * 0.5, sy + sh * 0.58, sw * 0.17, sh * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'desk': {
        r(0, 0, sw, sh, '#33251a');
        r(u * 0.6, u * 0.6, sw - 1.2 * u, sh - 1.2 * u, '#8a6440');
        r(u * 0.6, u * 0.6, sw - 1.2 * u, u * 0.9, '#a87f53');
        if (sh > 1.7 * u * 16) {
          // big guard desk: drawers and papers
          for (let i = 0; i < 2; i++) {
            r(sw * (0.12 + i * 0.42), sh * 0.52, sw * 0.3, sh * 0.3, '#74522f');
            r(sw * (0.2 + i * 0.42), sh * 0.62, sw * 0.12, u * 0.7, '#c9b458');
          }
          r(sw * 0.3, sh * 0.16, sw * 0.3, sh * 0.22, '#ddd2b4');
          r(sw * 0.36, sh * 0.22, sw * 0.18, u * 0.6, '#8a7a5c');
        } else {
          r(sw * 0.55, sh * 0.35, sw * 0.28, sh * 0.25, '#d9c07f');
        }
        break;
      }
      case 'table': {
        // wooden canteen table with painted benches
        r(0, 0, sw, sh, '#4a3826');
        r(0, 0, sw, sh * 0.78, '#8a6a44');
        r(0, 0, sw, u * 1.1, '#a98a5f');
        r(u, sh * 0.78, sw - 2 * u, sh * 0.22, '#5d472e');
        r(sw * 0.12, sh * 0.2, sw * 0.2, u, '#c9c2ae');   // tray
        r(sw * 0.55, sh * 0.24, sw * 0.26, u * 1.2, '#6d7f6a'); // tray 2
        break;
      }
      case 'fountain': {
        r(0, 0, sw, sh, '#5a6066');
        r(u, u * 2, sw - 2 * u, sh - 3 * u, '#c9ced2');
        ctx.fillStyle = '#5b93ad';
        ctx.beginPath();
        ctx.ellipse(sx + sw * 0.5, sy + sh * 0.45, sw * 0.26, sh * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        r(sw * 0.42, sh * 0.7, sw * 0.16, sh * 0.22, '#9aa3aa');
        break;
      }
      case 'phone': {
        r(0, 0, sw, sh, '#2c3238');
        r(u * 0.8, u, sw - 1.6 * u, sh * 0.66, '#3f4f63');
        r(u * 1.4, u * 1.4, sw - 2.8 * u, sh * 0.3, '#20303f');
        r(sw * 0.12, sh * 0.34, u * 2, sh * 0.28, '#141a1f');
        r(sw * 0.72, sh * 0.34, u * 2, sh * 0.28, '#141a1f');
        break;
      }
      case 'trash': {
        r(0, 0, sw, sh, '#2b332c');
        r(u, u * 1.4, sw - 2 * u, sh - 2 * u, '#41604a');
        r(0, 0, sw, u * 1.6, '#2b332c');
        r(sw * 0.2, u * 0.4, sw * 0.6, u, '#4d6d55');
        break;
      }
      case 'counter': {
        r(0, 0, sw, sh, '#4c5157');
        r(0, 0, sw, sh * 0.62, '#9aa1a6');
        r(0, 0, sw, u, '#c2c9cd');
        r(u, sh * 0.66, sw - 2 * u, sh * 0.3, '#737a80');
        break;
      }
      case 'stove': {
        r(0, 0, sw, sh, '#2f3338');
        r(u, u, sw - 2 * u, sh - 2 * u, '#4a4f55');
        for (let i = 0; i < 2; i++) {
          ctx.fillStyle = '#23262a';
          ctx.beginPath();
          ctx.arc(sx + sw * (0.3 + i * 0.4), sy + sh * 0.45, sh * 0.24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#d8662a';
          ctx.beginPath();
          ctx.arc(sx + sw * (0.3 + i * 0.4), sy + sh * 0.45, sh * 0.13, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'workbench': {
        r(0, 0, sw, sh, '#4a3524');
        r(u, u, sw - 2 * u, sh - 2 * u, '#9a7048');
        r(u, u, sw - 2 * u, u, '#b3895c');
        r(sw * 0.12, sh * 0.32, u * 3, sh * 0.45, '#6c7a80'); // vice
        r(sw * 0.62, sh * 0.34, u * 3, u, '#c9a227'); // tools
        r(sw * 0.62, sh * 0.52, u * 4, u, '#9aa1a6');
        break;
      }
      case 'crate': {
        r(0, 0, sw, sh, '#5a4026');
        r(u, u, sw - 2 * u, sh - 2 * u, '#8b6538');
        ctx.strokeStyle = '#6b4c28';
        ctx.lineWidth = u;
        ctx.beginPath();
        ctx.moveTo(sx + u, sy + u); ctx.lineTo(sx + sw - u, sy + sh - u);
        ctx.moveTo(sx + sw - u, sy + u); ctx.lineTo(sx + u, sy + sh - u);
        ctx.stroke();
        break;
      }
      case 'bin': {
        r(0, 0, sw, sh, '#26303a');
        r(u, u, sw - 2 * u, sh - 2 * u, '#3d5a6b');
        r(u, u, sw - 2 * u, u * 1.2, '#5b7f92');
        r(sw * 0.42, 0, sw * 0.16, sh, '#26303a');
        break;
      }
      case 'machine': {
        r(0, 0, sw, sh, '#3a4046');
        r(u, u, sw - 2 * u, sh - 2 * u, '#dfe3e6');
        ctx.fillStyle = '#8d99a3';
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sh / 2, sw * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5f6b74';
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sh / 2, sw * 0.17, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'shelf': {
        const vertical = o.h > o.w;
        r(0, 0, sw, sh, '#3b4147');
        r(u, u, sw - 2 * u, sh - 2 * u, '#6d757c');
        ctx.fillStyle = '#9aa3aa';
        if (vertical) {
          for (let i = 1; i < 4; i++) ctx.fillRect(sx + u, sy + (sh / 4) * i, sw - 2 * u, u * 0.6);
        } else {
          for (let i = 1; i < 3; i++) ctx.fillRect(sx + (sw / 3) * i, sy + u, u * 0.6, sh - 2 * u);
        }
        break;
      }
      case 'shower': {
        r(sw * 0.35, 0, u * 1.4, sh * 0.45, '#b9c2c8');
        r(sw * 0.15, sh * 0.4, sw * 0.7, u * 1.6, '#cfd8dd');
        r(sw * 0.42, sh * 0.6, u * 1.2, u * 0.6, '#8fb6c9');
        break;
      }
      case 'bench': {
        r(0, 0, sw, sh, '#3d4038');
        r(u * 0.3, u * 0.3, sw - u * 0.6, sh - u * 0.6, '#8f6c3f');
        for (let i = 0; i < 3; i++) r(u * 0.5, u * (0.5 + i * 0.9), sw - u, u * 0.55, '#b78c56');
        r(0, sh - u, sw, u, '#5c4529');
        break;
      }
      case 'infBed': {
        r(0, 0, sw, sh, '#4a4f55');
        r(u, u, sw - 2 * u, sh - 2 * u, '#e8ecef');
        r(u, u, sw * 0.3, sh - 2 * u, '#cdd7dd');
        r(sw * 0.45, u, sw * 0.5, sh - 2 * u, '#9fc0d4');
        break;
      }
      case 'medcab': {
        r(0, 0, sw, sh, '#8d949a');
        r(u, u, sw - 2 * u, sh - 2 * u, '#eef2f4');
        r(sw * 0.42, sh * 0.2, sw * 0.16, sh * 0.6, '#c0392b');
        r(sw * 0.2, sh * 0.42, sw * 0.6, sh * 0.16, '#c0392b');
        break;
      }
      case 'locker': {
        r(0, 0, sw, sh, '#39453c');
        r(u, u, sw - 2 * u, sh - 2 * u, '#5d6f5f');
        r(u, u, sw - 2 * u, u, '#7b8f7d');
        for (let i = 0; i < 4; i++) r(sw * 0.25, sh * 0.12 + i * sh * 0.06, sw * 0.5, u * 0.5, '#2c3630');
        r(sw * 0.72, sh * 0.45, u * 1.2, u * 1.6, '#c9b458');
        break;
      }
      case 'filing': {
        r(0, 0, sw, sh, '#4a5057');
        r(u, u, sw - 2 * u, sh - 2 * u, '#8a9298');
        for (let i = 0; i < 4; i++) {
          r(u * 1.4, sh * 0.12 + i * sh * 0.22, sw - 2.8 * u, sh * 0.16, '#737b81');
          r(sw * 0.4, sh * 0.18 + i * sh * 0.22, sw * 0.2, u * 0.6, '#c2cace');
        }
        break;
      }
      case 'tv': {
        r(0, 0, sw, sh, '#2a2a2e');
        r(u, u, sw - 2 * u, sh * 0.7, '#121417');
        r(u * 1.4, u * 1.4, sw - 2.8 * u, sh * 0.4, '#28455c');
        break;
      }
      case 'board': {
        r(0, 0, sw, sh, '#3f2d1d');
        r(u * 0.7, u * 0.7, sw - 1.4 * u, sh - 1.4 * u, '#9c7a4a');
        r(sw * 0.18, sh * 0.22, sw * 0.22, sh * 0.3, '#efe6cf');
        r(sw * 0.5, sh * 0.3, sw * 0.2, sh * 0.26, '#e4d8ba');
        r(sw * 0.38, sh * 0.64, sw * 0.28, sh * 0.2, '#f2e9d4');
        break;
      }
      case 'shopcounter': {
        r(0, 0, sw, sh, '#3d3a32');
        r(0, 0, sw, sh * 0.55, '#7a6a4c');
        r(0, 0, sw, u, '#a08a63');
        r(u, sh * 0.6, sw - 2 * u, sh * 0.32, '#5e5138');
        for (let i = 0; i < 4; i++) {
          r(sw * (0.08 + i * 0.23), sh * 0.12, sw * 0.13, sh * 0.28, ['#c0392b', '#2e86c1', '#c9a227', '#27ae60'][i]);
        }
        break;
      }
      case 'hoop': {
        r(sw * 0.4, 0, u * 2, sh * 1.4, '#6d757c');
        r(sw * 0.1, 0, sw * 0.7, sh * 0.5, '#e8e2d4');
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = u * 1.2;
        ctx.beginPath();
        ctx.ellipse(sx + sw * 0.45, sy + sh * 0.7, sw * 0.2, sh * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'pullup': {
        r(0, 0, u * 2, sh * 1.6, '#6d757c');
        r(sw - u * 2, 0, u * 2, sh * 1.6, '#6d757c');
        r(0, 0, sw, u * 2, '#9aa3aa');
        break;
      }
      case 'vent': {
        r(0, 0, sw, sh, '#4b5054');
        r(u, u, sw - 2 * u, sh - 2 * u, '#8b9296');
        for (let i = 0; i < 5; i++) r(u * 1.6, u * 1.6 + i * (sh - 3 * u) / 5, sw - 3.2 * u, u * 1.2, '#5f676b');
        break;
      }
      case 'fencecut': {
        ctx.save();
        ctx.strokeStyle = '#d9dde0';
        ctx.lineWidth = u;
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sh / 2, sw * 0.3, 0.2, 1.6);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'lamp': {
        r(sw * 0.4, 0, u * 2, sh, '#3f464c');
        r(sw * 0.2, 0, sw * 0.6, u * 1.6, '#c9c2a8');
        break;
      }
      default:
        break;
    }
  }
}

const ROOM_LABELS = [
  { name: 'CELL BLOCK', x: 26, y: 21 },
  { name: 'CANTEEN', x: 65, y: 13 },
  { name: 'KITCHEN', x: 89, y: 12 },
  { name: 'WORKSHOP', x: 62, y: 31 },
  { name: 'LAUNDRY', x: 87, y: 31 },
  { name: 'SHOWERS', x: 15, y: 44 },
  { name: 'INFIRMARY', x: 33, y: 44 },
  { name: 'SECURITY', x: 52, y: 47 },
  { name: 'SEGREGATION', x: 70, y: 47 },
  { name: 'COMMISSARY', x: 88, y: 49 },
  { name: 'YARD', x: 52, y: 64 },
  { name: 'MAIN GATE', x: 51, y: 69 }
];
