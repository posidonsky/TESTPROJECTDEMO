// IRONWOOD PENITENTIARY - world layout, tiles and interaction objects.
// All layout authored by hand for this game; no third-party assets.

export const TILE = 16;
export const WORLD_W = 104;
export const WORLD_H = 76;

export const T = {
  GRASS: 0,
  PAVE: 1,
  FLOOR: 2,
  TILE: 3,
  WALL: 4,
  FENCE: 5,
  GATE: 6,
  DOOR: 7
};

export function isSolidTile(t) {
  return t === T.WALL || t === T.FENCE || t === T.GATE;
}
export function blocksSight(t) {
  return t === T.WALL || t === T.GATE;
}

export function cellRect(world, tx, ty) { return { x: tx, y: ty, w: 1, h: 1 }; }

export function createWorld() {
  const w = WORLD_W, h = WORLD_H;
  const tiles = new Uint8Array(w * h);
  const objects = [];
  const solidObj = new Uint8Array(w * h);

  const setTile = (x, y, t) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    tiles[y * w + x] = t;
  };
  const fill = (x, y, fw, fh, t) => {
    for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) setTile(x + i, y + j, t);
  };
  const outline = (x, y, fw, fh, t) => {
    for (let i = 0; i < fw; i++) { setTile(x + i, y, t); setTile(x + i, y + fh - 1, t); }
    for (let j = 0; j < fh; j++) { setTile(x, y + j, t); setTile(x + fw - 1, y + j, t); }
  };
  const building = (x, y, bw, bh, floor = T.FLOOR) => {
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const edge = i === 0 || j === 0 || i === bw - 1 || j === bh - 1;
      setTile(x + i, y + j, edge ? T.WALL : floor);
    }
  };
  const door = (x, y, dw = 1, dh = 1) => fill(x, y, dw, dh, T.DOOR);

  const addObj = (type, tx, ty, tw, th, opts = {}) => {
    const o = Object.assign({
      type, x: tx, y: ty, w: tw, h: th, solid: true, interact: null, name: null
    }, opts);
    objects.push(o);
    if (o.solid) {
      for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
        const px = tx + i, py = ty + j;
        if (px >= 0 && py >= 0 && px < w && py < h) solidObj[py * w + px] = 1;
      }
    }
    return o;
  };

  // ---------------------------------------------------------------- ground
  fill(4, 4, 96, 68, T.PAVE);          // compound concrete
  fill(24, 54, 73, 17, T.GRASS);       // exercise yard
  outline(3, 3, 98, 70, T.FENCE);      // perimeter chain-link
  fill(48, 72, 6, 1, T.GATE);          // main gate (south)

  // ---------------------------------------------------------------- buildings
  building(7, 6, 42, 28, T.FLOOR);     // A cell block
  building(52, 6, 28, 16, T.TILE);     // B canteen
  building(79, 6, 21, 16, T.TILE);     // C kitchen
  building(52, 25, 21, 14, T.FLOOR);   // D workshop
  building(75, 25, 25, 14, T.FLOOR);   // E laundry
  building(7, 38, 16, 12, T.TILE);     // F showers
  building(26, 38, 15, 12, T.TILE);    // G infirmary
  building(44, 41, 17, 13, T.FLOOR);   // H security office
  building(64, 41, 13, 10, T.FLOOR);   // I segregation
  building(80, 44, 18, 9, T.TILE);     // J commissary

  // ---------------------------------------------------------------- doorways
  door(48, 20); door(48, 21);          // cell block -> yard side lane
  door(64, 21); door(65, 21);          // canteen south
  door(79, 13); door(79, 14);          // canteen <-> kitchen
  door(88, 21); door(89, 21);          // kitchen south
  door(61, 38); door(62, 38);          // workshop south
  door(52, 31); door(52, 32);          // workshop west
  door(86, 38); door(87, 38);          // laundry south
  door(22, 43); door(22, 44);          // showers east
  door(32, 49); door(33, 49);          // infirmary south
  door(51, 41); door(52, 41);          // security north
  door(69, 41); door(70, 41);          // segregation north
  door(88, 52); door(89, 52);          // commissary south

  // ---------------------------------------------------------------- cell block
  // top row of cells, corridor at y 18..23, bottom row of cells
  const cellXs = [8, 14, 20, 26, 32, 38];
  for (const cx of cellXs) {
    fill(cx, 7, 1, 11, T.WALL);
    fill(cx + 2, 17, 2, 1, T.DOOR);
    fill(cx, 24, 1, 10, T.WALL);
    fill(cx + 2, 24, 2, 1, T.DOOR);
  }
  fill(44, 7, 1, 11, T.WALL);
  fill(44, 24, 1, 10, T.WALL);
  fill(8, 17, 36, 1, T.WALL);
  fill(8, 24, 36, 1, T.WALL);
  // re-carve the cell door gaps over the horizontal walls
  for (const cx of cellXs) {
    fill(cx + 2, 17, 2, 1, T.DOOR);
    fill(cx + 2, 24, 2, 1, T.DOOR);
  }

  const cells = [];
  for (let i = 0; i < cellXs.length; i++) {
    const cx = cellXs[i];
    // top cell
    cells.push({ id: 'A' + i, x: cx + 1, y: 7, w: 4, h: 10, row: 'top', index: i });
    addObj('bed', cx + 1, 8, 2, 1, { name: 'Bunk', interact: 'bed', own: i === 0 });
    addObj('toilet', cx + 1, 15, 1, 1, {
      name: 'Toilet', interact: 'toilet', own: i === 0, dig: i === 0
    });
    addObj('desk', cx + 4, 15, 1, 1, { name: 'Desk', interact: 'desk', own: i === 0 });
    // bottom cell
    cells.push({ id: 'B' + i, x: cx + 1, y: 25, w: 4, h: 8, row: 'bottom', index: i });
    addObj('bed', cx + 1, 31, 2, 1, { name: 'Bunk', interact: 'bed', own: false });
    addObj('toilet', cx + 1, 25, 1, 1, { name: 'Toilet', interact: 'toilet', own: false });
    addObj('desk', cx + 4, 25, 1, 1, { name: 'Desk', interact: 'desk', own: false });
  }
  addObj('board', 45, 8, 2, 1, { name: 'Notice Board', interact: 'board', solid: false });
  addObj('tv', 45, 29, 2, 1, { name: 'Common Room TV', interact: null });
  addObj('bench', 30, 18, 2, 1, { name: 'Corridor Bench' });
  addObj('bench', 24, 23, 2, 1, { name: 'Corridor Bench' });
  addObj('fountain', 20, 23, 1, 1, { name: 'Water Fountain', interact: 'drink' });
  addObj('phone', 46, 11, 1, 1, { name: 'Payphone', interact: 'phone' });
  addObj('trash', 34, 23, 1, 1, { name: 'Trash Bin' });
  addObj('trash', 16, 18, 1, 1, { name: 'Trash Bin' });

  // ---------------------------------------------------------------- canteen
  addObj('counter', 58, 7, 13, 1, { name: 'Serving Hatch', interact: 'serve' });
  for (const ty of [11, 15, 19]) {
    for (const tx of [56, 62, 68, 74]) {
      addObj('table', tx, ty, 2, 1, { name: 'Canteen Table', solid: true });
    }
  }

  // ---------------------------------------------------------------- kitchen
  addObj('counter', 82, 7, 10, 1, { name: 'Prep Counter', solid: true });
  addObj('stove', 90, 15, 2, 1, {
    name: 'Kitchen Range', interact: 'work', job: 'Kitchen'
  });
  addObj('shelf', 96, 18, 2, 1, { name: 'Pantry Shelf' });

  // ---------------------------------------------------------------- workshop
  for (const [tx, ty] of [[56, 29], [61, 29], [66, 29], [56, 34], [61, 34]]) {
    addObj('workbench', tx, ty, 3, 1, {
      name: 'Workshop Bench', interact: 'work', job: 'Workshop'
    });
  }
  addObj('crate', 69, 36, 2, 1, { name: 'Supply Crate' });
  addObj('vent', 72, 30, 1, 2, {
    name: 'Roof Vent', interact: 'vent', solid: false, mounted: true, dir: 'east'
  });

  // ---------------------------------------------------------------- laundry
  for (const tx of [79, 84, 89, 94]) {
    addObj('bin', tx, 29, 2, 1, {
      name: 'Laundry Bin', interact: 'work', job: 'Laundry'
    });
  }
  for (let tx = 79; tx <= 84; tx++) {
    addObj('machine', tx, 37, 1, 1, { name: 'Washer' });
  }
  addObj('shelf', 96, 26, 2, 1, { name: 'Linen Shelf' });

  // ---------------------------------------------------------------- showers
  for (const tx of [10, 13, 16, 19]) {
    addObj('shower', tx, 39, 1, 1, { name: 'Shower Head', solid: false, mounted: true, dir: 'north' });
  }
  addObj('bench', 10, 46, 3, 1, { name: 'Changing Bench' });

  // ---------------------------------------------------------------- infirmary
  addObj('infBed', 28, 40, 2, 1, { name: 'Infirmary Cot', interact: 'heal' });
  addObj('infBed', 33, 40, 2, 1, { name: 'Infirmary Cot', interact: 'heal' });
  addObj('infBed', 28, 45, 2, 1, { name: 'Infirmary Cot', interact: 'heal' });
  addObj('infBed', 33, 45, 2, 1, { name: 'Infirmary Cot', interact: 'heal' });
  addObj('medcab', 39, 43, 1, 1, { name: 'Medicine Cabinet', interact: 'medcab', mounted: true, dir: 'east' });
  addObj('desk', 37, 47, 2, 1, { name: "Nurse's Desk" });

  // ---------------------------------------------------------------- security
  addObj('desk', 52, 44, 3, 2, { name: 'Guard Desk' });
  addObj('locker', 45, 46, 1, 3, { name: 'Evidence Locker', interact: 'locker' });
  addObj('filing', 58, 50, 1, 2, { name: 'Filing Cabinet' });

  // ---------------------------------------------------------------- segregation
  addObj('infBed', 66, 43, 2, 1, { name: 'Bare Cot' });
  addObj('infBed', 70, 43, 2, 1, { name: 'Bare Cot' });
  addObj('infBed', 74, 43, 2, 1, { name: 'Bare Cot' });

  // ---------------------------------------------------------------- commissary
  addObj('shopcounter', 86, 48, 4, 1, { name: 'Commissary Counter', interact: 'shop' });
  addObj('shelf', 81, 45, 1, 2, { name: 'Goods Shelf' });
  addObj('shelf', 95, 45, 1, 2, { name: 'Goods Shelf' });

  // ---------------------------------------------------------------- yard
  addObj('bench', 34, 60, 3, 1, { name: 'Yard Bench' });
  addObj('bench', 60, 66, 3, 1, { name: 'Yard Bench' });
  addObj('bench', 86, 62, 3, 1, { name: 'Yard Bench' });
  addObj('hoop', 30, 56, 1, 1, { name: 'Basketball Hoop', solid: false });
  addObj('hoop', 92, 56, 1, 1, { name: 'Basketball Hoop', solid: false });
  addObj('pullup', 74, 58, 2, 1, { name: 'Pull-up Bars', solid: false });
  addObj('bench', 44, 56, 3, 1, { name: 'Yard Bench' });
  addObj('trash', 36, 57, 1, 1, { name: 'Yard Bin' });
  addObj('fencecut', 66, 72, 1, 1, {
    name: 'Perimeter Fence', interact: 'fence', solid: false
  });
  addObj('board', 42, 55, 2, 1, { name: 'Yard Board', interact: 'board', solid: false });

  // ---------------------------------------------------------------- lamps
  const lamps = [
    [50, 20], [50, 36], [50, 52], [22, 52], [70, 56], [90, 40],
    [40, 20], [12, 36], [90, 68], [58, 70], [22, 20], [64, 10],
    [88, 10], [62, 28], [87, 28], [14, 43], [32, 42], [52, 46],
    [70, 45], [88, 46], [68, 32], [16, 8], [84, 34]
  ];
  for (const [lx, ly] of lamps) {
    addObj('lamp', lx, ly, 1, 1, { name: 'Lamp Post', solid: false, lamp: { x: lx + 0.5, y: ly + 0.5, r: 4.5 } });
  }

  const areas = {
    cellblock: { x: 8, y: 7, w: 40, h: 26 },
    canteen: { x: 53, y: 7, w: 26, h: 14 },
    kitchen: { x: 80, y: 7, w: 19, h: 14 },
    workshop: { x: 53, y: 26, w: 19, h: 12 },
    laundry: { x: 76, y: 26, w: 23, h: 12 },
    showers: { x: 8, y: 39, w: 14, h: 10 },
    infirmary: { x: 27, y: 39, w: 13, h: 10 },
    security: { x: 45, y: 42, w: 15, h: 11 },
    solitary: { x: 65, y: 42, w: 11, h: 8 },
    commissary: { x: 81, y: 45, w: 16, h: 7 },
    yard: { x: 26, y: 56, w: 68, h: 14 },
    compound: { x: 5, y: 34, w: 94, h: 19 }
  };

  const world = {
    w, h, tiles, objects, solidObj, cells, areas,
    playerCell: { x: 9, y: 7, w: 4, h: 10, id: 'A0' },
    spawn: { x: 11.5 * TILE, y: 12 * TILE },
    digSite: { x: 9, y: 15 },
    fenceSite: { x: 66, y: 72 },
    ventSite: { x: 71.5, y: 30.5 },
    solitarySpot: { x: 70.5 * TILE, y: 46.5 * TILE },
    gate: { x: 48, y: 72, w: 6, h: 1 }
  };

  world.tileAt = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return T.WALL;
    return tiles[ty * w + tx];
  };
  world.solidAt = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return true;
    return isSolidTile(tiles[ty * w + tx]) || solidObj[ty * w + tx] === 1;
  };
  world.sightBlocked = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return true;
    return blocksSight(tiles[ty * w + tx]);
  };
  world.areaAt = (tx, ty) => {
    for (const key in areas) {
      const a = areas[key];
      if (tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h) return key;
    }
    return 'outdoors';
  };
  world.randomWalkable = (tx, ty, tw, th, rng = Math.random) => {
    for (let tries = 0; tries < 60; tries++) {
      const x = tx + Math.floor(rng() * tw);
      const y = ty + Math.floor(rng() * th);
      if (!world.solidAt(x, y)) return { x, y };
    }
    return { x: Math.round(tx + tw / 2), y: Math.round(ty + th / 2) };
  };
  world.nearestFree = (tx, ty) => {
    if (!world.solidAt(tx, ty)) return { x: tx, y: ty };
    for (let r = 1; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (!world.solidAt(tx + dx, ty + dy)) return { x: tx + dx, y: ty + dy };
      }
    }
    return { x: tx, y: ty };
  };

  return world;
}

// Guard patrol loops. Day routes are busy, night routes cover the corridors.
export const PATROLS = {
  guards: [
    {
      name: 'Officer Hale', day: [[10, 20], [45, 20], [45, 22], [10, 22]],
      night: [[10, 20], [43, 20], [43, 22], [10, 22]], speed: 46
    },
    {
      name: 'Officer Brandt', day: [[58, 19], [72, 19], [90, 18], [90, 10], [60, 10]],
      night: [[54, 8], [76, 8], [76, 19], [54, 19]], speed: 44
    },
    {
      name: 'Officer Pike', day: [[30, 58], [60, 58], [90, 58], [90, 68], [40, 68]],
      night: [[30, 60], [90, 60], [90, 68], [30, 68]], speed: 48
    },
    {
      name: 'Officer Reyes', day: [[10, 35], [48, 35], [50, 39], [50, 52], [42, 52], [28, 52], [24, 45], [24, 39]],
      night: [[50, 34], [50, 52], [30, 52], [24, 45], [24, 34]], speed: 45
    },
    {
      name: 'Officer Lang', day: [[6, 4], [50, 4], [98, 4]],
      night: [[6, 4], [50, 4], [98, 4]], speed: 42
    },
    {
      name: 'Officer Doyle', day: [[48, 68], [60, 68], [66, 68], [60, 60], [48, 64]],
      night: [[64, 70], [48, 70], [40, 66], [64, 66]], speed: 46
    }
  ]
};
