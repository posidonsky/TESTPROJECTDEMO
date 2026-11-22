// Headless simulation tests for the game logic (no DOM required).
import { Game, REACH } from '../src/game.js';
import { createWorld, PATROLS, TILE, T } from '../src/world.js';
import { findPath } from '../src/path.js';
import { ITEMS, RECIPES } from '../src/items.js';

let pass = 0;
const failures = [];
function ok(cond, label, extra) {
  if (cond) { pass++; return true; }
  failures.push(label + (extra ? ' :: ' + extra : ''));
  return false;
}
function eq(a, b, label) { return ok(a === b, label, `${a} !== ${b}`); }

const idleInput = { action: () => false };
const holdInput = { action: (n) => n === 'interact' };

function tick(game, seconds, input = idleInput) {
  const dt = 1 / 60;
  const steps = Math.ceil(seconds / dt);
  for (let i = 0; i < steps; i++) game.update(dt, input);
}

function quietGame() {
  const g = new Game();
  g.paused = false;
  g.guards = [];      // isolate systems that are not under test
  return g;
}

function standAtTile(g, tx, ty) {
  const t = g.world.nearestFree(tx, ty);
  g.player.x = t.x * TILE + TILE / 2;
  g.player.y = t.y * TILE + TILE / 2;
}

function objByType(world, type, own) {
  return world.objects.find(o => o.type === type && (own === undefined || o.own === own));
}

// ---------------------------------------------------------------- world tests
{
  const w = createWorld();
  ok(!w.solidAt(Math.floor(w.spawn.x / TILE), Math.floor(w.spawn.y / TILE)), 'spawn tile is walkable');
  ok(w.playerCell && w.cells.length === 12, '12 cells built');

  // all gates / doors / fences block or pass as expected
  ok(w.solidAt(-1, -1), 'out of bounds is solid');
  ok(w.solidAt(3, 10), 'perimeter fence is solid');
  ok(!w.sightBlocked(3, 10), 'fence does not block sight');

  // every patrol waypoint walkable
  for (const def of PATROLS.guards) {
    for (const routeKey of ['day', 'night']) {
      for (const [x, y] of def[routeKey]) {
        ok(!w.solidAt(x, y), `patrol waypoint ${def.name} ${routeKey} ${x},${y} walkable`);
      }
    }
  }

  // patrol leg connectivity
  const blocked = (x, y) => w.solidAt(x, y);
  for (const def of PATROLS.guards) {
    for (const routeKey of ['day', 'night']) {
      const r = def[routeKey];
      for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        const p = findPath(a[0], a[1], b[0], b[1], w.w, w.h, blocked);
        ok(!!p, `path ${def.name} ${routeKey} ${a}->${b}`);
      }
    }
  }

  // each cell reachable from the corridor
  for (const c of w.cells) {
    const p = findPath(20, 21, c.x + 1, c.y + 2, w.w, w.h, blocked, 20000);
    ok(!!p, `cell ${c.id} reachable from corridor`);
  }

  // every interactable has a walkable tile within reach
  for (const o of w.objects) {
    if (!o.interact) continue;
    let reachable = false;
    for (let y = o.y - 2; y <= o.y + o.h + 2 && !reachable; y++) {
      for (let x = o.x - 2; x <= o.x + o.w + 2 && !reachable; x++) {
        if (w.solidAt(x, y)) continue;
        const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
        const x0 = o.x * TILE, y0 = o.y * TILE, x1 = x0 + o.w * TILE, y1 = y0 + o.h * TILE;
        const px = Math.max(x0, Math.min(cx, x1));
        const py = Math.max(y0, Math.min(cy, y1));
        if (Math.hypot(cx - px, cy - py) <= REACH) reachable = true;
      }
    }
    ok(reachable, `interactable ${o.type}@${o.x},${o.y} reachable`);
  }

  // key sites land on walkable-adjacent tiles
  ok(!w.solidAt(w.fenceSite.x, w.fenceSite.y - 1), 'fence cut spot has standing room');
  ok(!w.solidAt(w.ventSite.x - 1.5 | 0, w.ventSite.y | 0), 'vent has standing room');
}

// ---------------------------------------------------------------- movement
{
  const g = quietGame();
  const x0 = g.player.x, y0 = g.player.y;
  const right = { action: (n) => n === 'right' };
  tick(g, 1.0, right);
  ok(g.player.x > x0 + 20, 'player walks right');
  ok(Math.abs(g.player.y - y0) < 2, 'player does not drift on y');
  ok(g.minutes > 406, 'clock advances during movement');

  // wall collision: walk into the cell wall above the player
  standAtTile(g, 11, 9);
  const up = { action: (n) => n === 'up' };
  tick(g, 2.0, up);
  ok(!g.world.solidAt(g.player.tileX, g.player.tileY), 'player is never inside a wall');

  // diagonals do not slip through corners
  const dl = { action: (n) => n === 'left' || n === 'down' };
  standAtTile(g, 12, 8);
  tick(g, 2.0, dl);
  ok(!g.world.solidAt(g.player.tileX, g.player.tileY), 'diagonal movement stays out of walls');
}

// ---------------------------------------------------------------- needs, meals, rest
{
  const g = quietGame();
  g.hunger = 40;
  g.minutes = 500;               // breakfast
  const counter = objByType(g.world, 'counter');
  standAtTile(g, counter.x + 1, counter.y + 1);
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'serve', 'serving hatch prompt at breakfast');
  g.pressInteract();
  ok(g.hunger > 90, 'meal restores hunger', String(g.hunger));
  ok(g.flags.meals.breakfast, 'meal marked eaten');
  g.updatePrompt();
  ok(!g.prompt.enabled, 'second meal at same sitting is blocked');

  // nap and night sleep
  const bed = objByType(g.world, 'bed', true);
  standAtTile(g, bed.x, bed.y + 1);
  g.minutes = 700;
  g.energy = 20;
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'bed', 'bed prompt');
  g.pressInteract();
  ok(g.minutes > 700 && g.minutes < 800, 'nap advances 90 minutes', String(g.minutes));
  ok(g.energy > 40, 'nap restores some energy');
  tick(g, 1.2);                      // let the nap fade finish

  g.minutes = 1320;
  g.energy = 10;
  g.updatePrompt();
  g.pressInteract();
  ok(g.day === 2 && Math.abs(g.minutes - 390) < 2, 'night sleep runs to 06:30 next day', `${g.day}/${g.minutes}`);
  ok(g.energy > 80, 'full night restores energy');
}

// ---------------------------------------------------------------- work & money
{
  const g = quietGame();
  g.minutes = 600;
  g.cash = 0;
  const bench = g.world.objects.find(o => o.interact === 'work' && o.job === 'Workshop');
  standAtTile(g, bench.x, bench.y + 1);
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'work', 'workshop prompt during work hours');
  g.pressInteract();
  ok(g.action && g.action.type === 'work', 'work action starts');
  tick(g, 3.0, holdInput);
  eq(g.cash, 10, 'shift pays $10');
  ok(g.flags.worked[g.action ? g.action.key : ''] || Object.keys(g.flags.worked).length === 1, 'station marked worked');
  ok(g.energy < 100, 'work costs energy');

  // closed outside work hours
  g.minutes = 800;
  g.updatePrompt();
  ok(g.prompt && !g.prompt.enabled, 'work station closed outside work period');
}

// ---------------------------------------------------------------- crafting & shop
{
  const g = quietGame();
  g.inventory = ['sheet', 'sheet'];
  const res = g.craft('sheet', 'sheet');
  ok(res.ok && g.inventory.includes('rope'), 'sheets craft into rope');

  g.inventory = ['spoon', 'metal'];
  const res2 = g.craft('spoon', 'metal');
  ok(res2.ok && g.inventory.includes('shovel'), 'spoon + metal craft into shovel');

  g.inventory = [];
  g.cash = 200;
  const before = g.cash;
  ok(g.buy('crowbar'), 'can buy crowbar with cash');
  eq(g.cash, before - 120, 'purchase deducts price');
  g.cash = 3;
  ok(!g.buy('crowbar'), 'purchase blocked without cash');

  // every recipe output exists in the item table
  for (const r of RECIPES) ok(!!ITEMS[r.out], `recipe output ${r.out} exists`);
}

// ---------------------------------------------------------------- tunnel escape
{
  const g = quietGame();
  g.inventory = ['spoon'];
  const toilet = objByType(g.world, 'toilet', true);
  standAtTile(g, toilet.x, toilet.y - 1);
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'dig', 'dig prompt at own toilet');
  ok(g.prompt.enabled, 'dig enabled with spoon');
  g.pressInteract();
  ok(g.action && g.action.type === 'dig', 'dig action starts');
  tick(g, 55, holdInput);
  ok(g.digProgress >= 100, 'tunnel reaches 100% after a long dig', String(g.digProgress));
  eq(g.state, 'playing', 'tunnel completion does not auto-escape');
  g.updatePrompt();
  ok(g.prompt && g.prompt.enabled, 'tunnel offers the squeeze prompt');
  g.pressInteract();
  eq(g.state, 'won', 'squeezing into the tunnel wins the game');
  eq(g.escapeType, 'tunnel', 'tunnel escape recorded');
}

{
  const g = quietGame();
  g.inventory = [];
  const toilet = objByType(g.world, 'toilet', true);
  standAtTile(g, toilet.x, toilet.y - 1);
  g.updatePrompt();
  ok(g.prompt && !g.prompt.enabled, 'digging blocked with no tool');
  g.pressInteract();
  ok(!g.action, 'no dig action without a tool');
}

// ---------------------------------------------------------------- fence escape
{
  const g = quietGame();
  g.inventory = ['cutters'];
  g.minutes = 1320;                    // night
  standAtTile(g, g.world.fenceSite.x, g.world.fenceSite.y - 1);
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'fence', 'fence prompt in the yard');
  ok(g.prompt.enabled, 'fence cuttable with bolt cutters');
  g.pressInteract();
  tick(g, 9, holdInput);
  eq(g.state, 'won', 'fence escape wins');
  eq(g.escapeType, 'fence', 'fence escape recorded');

  // daylight rejection
  const g2 = quietGame();
  g2.inventory = ['cutters'];
  g2.minutes = 800;
  standAtTile(g2, g2.world.fenceSite.x, g2.world.fenceSite.y - 1);
  g2.updatePrompt();
  g2.pressInteract();
  ok(!g2.action, 'fence cutting refused in daylight');
}

// ---------------------------------------------------------------- vent escape
{
  const g = quietGame();
  g.inventory = ['crowbar', 'rope'];
  g.minutes = 1320;
  standAtTile(g, 71, 30);
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'vent', 'vent prompt in workshop');
  g.pressInteract();
  tick(g, 6, holdInput);
  ok(g.flags.ventOpen, 'vent pried open');
  eq(g.state, 'playing', 'prying vent does not instantly escape');
  g.updatePrompt();
  g.pressInteract();
  eq(g.state, 'won', 'climbing the vent escapes');
  eq(g.escapeType, 'vent', 'vent escape recorded');
}

{
  const g = quietGame();
  g.inventory = ['crowbar'];
  g.minutes = 1320;
  standAtTile(g, 71, 30);
  g.updatePrompt();
  g.pressInteract();
  tick(g, 6, holdInput);
  ok(g.flags.ventOpen, 'vent pries without rope so far');
  g.updatePrompt();
  ok(!g.prompt.enabled, 'climb blocked without rope');
}

// ---------------------------------------------------------------- locker loot
{
  const g = quietGame();
  g.inventory = ['lockpick'];
  g.minutes = 800;                     // free time, security is open
  standAtTile(g, 46, 46);
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'locker', 'locker prompt');
  g.pressInteract();
  tick(g, 3, holdInput);
  ok(g.flags.locker && g.inventory.includes('crowbar'), 'locker yields a crowbar');
  ok(g.heat > 0, 'lockpicking raises heat');
}

// ---------------------------------------------------------------- stash & search
{
  const g = quietGame();
  g.inventory = ['spoon'];
  const desk = objByType(g.world, 'desk', true);
  standAtTile(g, desk.x - 1, desk.y);
  ok(g.stashItem('spoon'), 'can stash an item at own desk');
  ok(g.stash.includes('spoon') && !g.inventory.includes('spoon'), 'item moved to stash');
  // cell search at 10:00 seizes contraband
  g.minutes = 599.9;
  g.flags.searchDay = 0;
  g.advanceMinutes(1);
  // the schedule check runs in update, not advanceMinutes
  for (let i = 0; i < 40; i++) g.update(0.016, idleInput);
  ok(!g.stash.includes('spoon'), 'cell search seizes stashed contraband');
  ok(g.heat > 0, 'cell search raises heat');
}

// ---------------------------------------------------------------- guard detection
{
  const g = new Game();
  g.paused = false;
  const toilet = objByType(g.world, 'toilet', true);
  standAtTile(g, toilet.x, toilet.y - 1);
  g.inventory = ['spoon'];
  g.updatePrompt();
  g.pressInteract();
  const guard = g.guards[0];
  guard.actor.x = g.player.x + 10;
  guard.actor.y = g.player.y;
  guard.actor.facing = 'left';
  const heat0 = g.heat;
  tick(g, 0.5, holdInput);
  ok(g.heat > heat0, 'guard spying on digging raises heat', String(g.heat));
  ok(g.stats.caught > 0, 'guard catches an inmate in the act');
  ok(!g.action, 'getting caught interrupts the dig');
}

// ---------------------------------------------------------------- solitary
{
  const g = quietGame();
  g.heat = 99;
  g.inventory = ['spoon', 'shovel', 'snack'];
  g.heat = 120;
  g.update(0.016, idleInput);
  ok(g.stats.daysInSolitary >= 1, 'high heat sends player to solitary');
  ok(!g.inventory.some(id => ITEMS[id].tags && ITEMS[id].tags.includes('contraband')), 'solitary seizes contraband');
  ok(g.inventory.includes('snack'), 'legal items survive solitary');
  ok(g.heat <= 30, 'heat reset after solitary');
  ok(g.fx && g.fx.kind === 'solitary', 'solitary cut-scene plays');
}

// ---------------------------------------------------------------- guards & inmates patrol
{
  const g = new Game();
  g.paused = false;
  const start = g.guards.map(x => ({ x: x.actor.x, y: x.actor.y }));
  const inmStart = g.inmates.map(x => ({ x: x.actor.x, y: x.actor.y }));
  tick(g, 40);
  g.guards.forEach((guard, i) => {
    const moved = Math.hypot(guard.actor.x - start[i].x, guard.actor.y - start[i].y);
    ok(moved > 12, `guard ${guard.actor.name} patrols`, String(moved));
    ok(!g.world.solidAt(guard.actor.tileX, guard.actor.tileY), `guard ${guard.actor.name} stands on walkable ground`);
  });
  g.inmates.forEach((inm, i) => {
    const moved = Math.hypot(inm.actor.x - inmStart[i].x, inm.actor.y - inmStart[i].y);
    ok(moved > 5, `inmate ${inm.actor.name} moves on schedule`, String(moved));
    ok(!g.world.solidAt(inm.actor.tileX, inm.actor.tileY), `inmate ${inm.actor.name} not inside geometry`);
  });
}

// ---------------------------------------------------------------- inmate chatter
{
  const g = quietGame();
  const inm = g.inmates[0];
  g.player.x = inm.actor.x + 10;
  g.player.y = inm.actor.y;
  g.updatePrompt();
  eq(g.prompt && g.prompt.type, 'talk', 'inmates can be talked to');
  g.pressInteract();
  ok(!!inm.actor.say, 'talking produces a line');
  ok(g.messages.some(m => m.text.includes(inm.actor.name)), 'the line is logged');
}

// ---------------------------------------------------------------- save / restore
{
  const g = quietGame();
  g.day = 4;
  g.minutes = 812;
  g.cash = 73;
  g.inventory = ['spoon', 'sheet', 'sheet'];
  g.stash = ['metal'];
  g.digProgress = 42;
  g.flags.locker = true;
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game();
  ok(g2.restore(data), 'save data restores');
  eq(g2.day, 4, 'restored day');
  eq(g2.minutes, 812, 'restored time');
  eq(g2.cash, 73, 'restored cash');
  eq(g2.inventory.length, 3, 'restored inventory');
  eq(g2.digProgress, 42, 'restored tunnel progress');
  ok(g2.flags.locker, 'restored flags');
  ok(!g2.world.solidAt(g2.player.tileX, g2.player.tileY), 'restored player not inside a wall');
}

// ---------------------------------------------------------------- fuzz
{
  const g = new Game();
  g.paused = false;
  const keys = ['up', 'down', 'left', 'right', 'interact'];
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let held = { up: false, down: false, left: false, right: false, interact: false };
  for (let i = 0; i < 9000; i++) {
    if (i % 7 === 0) {
      const k = keys[Math.floor(rnd() * keys.length)];
      held[k] = rnd() < 0.65;
    }
    const input = { action: (n) => !!held[n] };
    if (i % 3 === 0) {
      g.updatePrompt();
      if (rnd() < 0.25) g.pressInteract();
    }
    g.update(0.05, input);
    if (!Number.isFinite(g.player.x) || !Number.isFinite(g.player.y)) {
      ok(false, 'player position stays finite');
      break;
    }
    if (g.world.solidAt(g.player.tileX, g.player.tileY)) {
      ok(false, 'player never clips into geometry during fuzz', `${g.player.tileX},${g.player.tileY} tick ${i}`);
      break;
    }
    if (g.inventory.length > 10) { ok(false, 'inventory cap respected'); break; }
    if (!Number.isFinite(g.heat) || g.heat < 0) { ok(false, 'heat stays sane'); break; }
    if (g.heat > 100.001) { ok(false, 'heat never exceeds 100'); break; }
    if (g.state === 'won') break;
  }
  ok(true, 'fuzz run completed without exceptions');
  ok(g.day >= 1, 'fuzz advanced time without corrupting the calendar');
}

// ---------------------------------------------------------------- full playthrough
{
  const g = quietGame();
  g.minutes = 540;                 // 09:00, work period
  const benches = g.world.objects.filter(o => o.interact === 'work' && o.job === 'Workshop');
  let shifts = 0;
  for (const b of benches) {
    standAtTile(g, b.x, b.y + 1);
    g.updatePrompt();
    g.pressInteract();
    if (!g.action) continue;
    tick(g, 2.6, holdInput);
    if (g.flags.worked[b.job + ':' + b.x + ',' + b.y]) shifts++;
  }
  eq(shifts, benches.length, 'every workshop station can be worked once');
  eq(g.cash, 25 + benches.length * 10, 'shifts pay out');

  // shop for the fence route
  const shop = objByType(g.world, 'shopcounter');
  standAtTile(g, shop.x + 1, shop.y - 1);
  ok(g.buy('metal') && g.buy('tape'), 'can buy the bolt-cutter parts');
  const craftRes = g.craft('metal', 'tape');
  ok(craftRes.ok && g.inventory.includes('cutters'), 'crafting bolt cutters from shop parts');
  eq(g.cash, 25 + benches.length * 10 - 50, 'shop prices deducted');

  // daytime cutting is refused, night cutting wins
  standAtTile(g, g.world.fenceSite.x, g.world.fenceSite.y - 1);
  g.minutes = 900;
  g.updatePrompt();
  g.pressInteract();
  ok(!g.action, 'cannot cut the fence in daylight');
  g.minutes = 1330;
  g.updatePrompt();
  g.pressInteract();
  tick(g, 9, holdInput);
  eq(g.state, 'won', 'planned fence escape succeeds');
  ok(g.cash >= 0, 'cash never negative after shopping');
}

{
  // tunnel route from a fresh start, only using the starting spoon
  const g = new Game();
  g.paused = false;
  standAtTile(g, 11, 12);
  ok(g.inventory.includes('spoon'), 'new sentence starts with a spoon');
  const toilet2 = objByType(g.world, 'toilet', true);
  standAtTile(g, toilet2.x, toilet2.y - 1);
  g.updatePrompt();
  g.pressInteract();
  tick(g, 30, holdInput);
  // guards may interrupt; the run must still be recoverable and never corrupt
  ok(['playing', 'won'].includes(g.state), 'tunnel run stays in a valid state');
  ok(!g.world.solidAt(g.player.tileX, g.player.tileY), 'digging keeps the player out of geometry');
}

// ---------------------------------------------------------------- long day cycle with AI
{
  const g = new Game();
  g.paused = false;
  const day0 = g.day;
  tick(g, 240);                      // 240 real seconds ~ 20 prison hours
  ok(g.day > day0, 'calendar rolls over during a long session', `${day0} -> ${g.day}`);
  ok(Number.isFinite(g.heat) && g.heat >= 0 && g.heat <= 100, 'heat stays bounded in a long session');
  for (const guard of g.guards) {
    ok(!g.world.solidAt(guard.actor.tileX, guard.actor.tileY), 'no guard ends up inside geometry');
  }
  for (const inm of g.inmates) {
    ok(!g.world.solidAt(inm.actor.tileX, inm.actor.tileY), 'no inmate ends up inside geometry');
  }
  ok(g.messages.length < 40, 'message log is trimmed');
}

// ---------------------------------------------------------------- report
console.log(`\n${pass} checks passed`);
if (failures.length) {
  console.log(`\n${failures.length} FAILURES:`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
} else {
  console.log('All simulation checks passed.');
}
