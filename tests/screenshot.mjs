// Renders real frames headlessly to PNG so the art can be reviewed without a
// browser. Dev-only helper: `node tests/screenshot.mjs`
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Game } from '../src/game.js';
import { Renderer } from '../src/render.js';
import { TILE } from '../src/world.js';

const W = 1280, H = 800;
globalThis.window = { innerWidth: W, innerHeight: H, devicePixelRatio: 1 };
globalThis.document = {
  createElement(tag) {
    const c = createCanvas(16, 16);
    c.style = {};
    return c;
  }
};

const canvas = createCanvas(W, H);
canvas.style = {};

mkdirSync('shots', { recursive: true });

async function renderScene(name, setup, seconds = 1) {
  const g = new Game();
  g.paused = false;
  const r = new Renderer(canvas);
  r.setWorld(g.world);
  setup(g, r);
  for (let i = 0; i < 60 * seconds; i++) {
    g.update(1 / 60, { action: () => false });
    r.draw(g, 1 / 60);
  }
  r.draw(g, 1 / 60);
  writeFileSync(`shots/${name}.png`, await canvas.encode('png'));
  console.log('wrote shots/' + name + '.png');
}

function stand(g, tx, ty) {
  const t = g.world.nearestFree(tx, ty);
  g.player.x = t.x * TILE + TILE / 2;
  g.player.y = t.y * TILE + TILE / 2;
}

// 1. morning in the cell block
await renderScene('01-cell-day', (g) => {
  g.minutes = 7 * 60 + 5;
  stand(g, 11, 12);
  g.inventory = ['spoon', 'sheet', 'sheet'];
}, 0.5);

// 2. corridor with guards and inmates during the work period
await renderScene('02-corridor', (g) => {
  g.minutes = 10 * 60;
  stand(g, 26, 21);
  g.guards.forEach((gd, i) => { gd.actor.x = (18 + i * 3) * TILE; gd.actor.y = 20.5 * TILE; });
  g.inmates.forEach((inm, i) => { inm.actor.x = (12 + i * 4) * TILE; inm.actor.y = 22.5 * TILE; });
}, 0.4);

// 3. canteen at breakfast with tables, counter and inmates
await renderScene('03-canteen', (g) => {
  g.minutes = 8 * 60 + 20;
  stand(g, 64, 17);
  g.inmates.forEach((inm, i) => { inm.actor.x = (58 + (i % 4) * 4) * TILE; inm.actor.y = (12 + Math.floor(i / 4) * 4) * TILE; });
  g.guards[1].actor.x = 60 * TILE; g.guards[1].actor.y = 10.5 * TILE;
  g.guards[1].actor.facing = 'right';
}, 0.4);

// 4. workshop, vent and benches
await renderScene('04-workshop', (g) => {
  g.minutes = 11 * 60;
  stand(g, 60, 32);
  g.inventory = ['crowbar', 'rope'];
  g.guards[4].actor.x = 56 * TILE; g.guards[4].actor.y = 31 * TILE;
  g.guards[4].actor.facing = 'right';
}, 0.4);

// 5. yard at night, lamps lit
await renderScene('05-yard-night', (g) => {
  g.minutes = 22 * 60 + 40;
  stand(g, 52, 64);
  g.inventory = ['cutters'];
}, 0.5);

// 6. digging in the cell at night (particles + hole prompt)
await renderScene('06-digging-night', (g, r) => {
  g.minutes = 23 * 60;
  stand(g, 9, 14);
  g.inventory = ['shovel'];
  g.digProgress = 62;
  g.prompt = g.describeInteraction(g.world.objects.find(o => o.type === 'toilet' && o.own));
  g.action = { type: 'dig', progress: 0, rate: 0, obj: g.prompt.obj };
  for (let i = 0; i < 20; i++) r.spawnDirt(g.player.x + 4, g.player.y);
}, 0.35);

// 7. commissary / security area in daylight
await renderScene('07-compound', (g) => {
  g.minutes = 14 * 60;
  stand(g, 52, 40);
  g.guards[3].actor.x = 50 * TILE; g.guards[3].actor.y = 43 * TILE;
  g.guards[3].actor.facing = 'down';
  g.guards[5].actor.x = 60 * TILE; g.guards[5].actor.y = 44 * TILE;
}, 0.4);

// 8. dusk in the yard
await renderScene('08-dusk', (g) => {
  g.minutes = 19 * 60 + 30;
  stand(g, 40, 62);
  g.guards[2].actor.x = 48 * TILE; g.guards[2].actor.y = 60 * TILE;
  g.guards[2].actor.facing = 'left';
}, 0.4);
