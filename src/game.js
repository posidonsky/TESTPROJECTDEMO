// IRONWOOD PENITENTIARY - simulation: clock, routine, guards, items, escaping.
import { createWorld, PATROLS, TILE } from './world.js';
import { Actor, makePlayer } from './entities.js';
import { ITEMS, findRecipe, SHOP_STOCK, isContraband } from './items.js';

export const MIN_PER_SEC = 5;              // 1 real second = 5 prison minutes
export const NIGHT_PATROL_FROM = 1260;     // 21:00
export const DAY_PATROL_FROM = 390;        // 06:30
export const REACH = 26;                   // interaction reach in px

export const SCHEDULE = [
  { start: 0, end: 390, key: 'lockdown', name: 'Lockdown' },
  { start: 390, end: 420, key: 'wake', name: 'Wake-up' },
  { start: 420, end: 450, key: 'rollcall', name: 'Roll Call' },
  { start: 450, end: 480, key: 'free', name: 'Free Time' },
  { start: 480, end: 540, key: 'breakfast', name: 'Breakfast' },
  { start: 540, end: 720, key: 'work', name: 'Work Period' },
  { start: 720, end: 780, key: 'lunch', name: 'Lunch' },
  { start: 780, end: 1020, key: 'free', name: 'Free Time' },
  { start: 1020, end: 1080, key: 'dinner', name: 'Dinner' },
  { start: 1080, end: 1260, key: 'free', name: 'Free Time' },
  { start: 1260, end: 1440, key: 'lockdown', name: 'Lockdown' }
];

export const MEAL_WINDOWS = [
  { start: 480, end: 540, name: 'breakfast' },
  { start: 720, end: 780, name: 'lunch' },
  { start: 1020, end: 1080, name: 'dinner' }
];

const FACING_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function normalRegime() { return 'normal'; }

const INMATE_NAMES = ['Marlow', 'Cutter', 'Sable', 'Rook', 'Vance', 'Nix', 'Ostrander', 'Pike'];
const INMATE_LOOKS = ['inmateA', 'inmateB', 'inmateC', 'inmateD'];
const INMATE_LINES = [
  'That toilet backs onto the old drain line. I would not know about digging.',
  'Guards swap at 21:00. The yard man walks the fence twice an hour after that.',
  'Bolt cutters? Scrap metal and duct tape. Workshop bins are full of both.',
  'Laundry has spare sheets if you know who to ask. Ask nicely.',
  'Keep your desk clean. They toss cells right after the 10:00 count.',
  'Fog mornings are gold. You can walk right past a guard and he will not see you.',
  'The workshop vent is four bolts and a bad attitude. A crowbar hates bolts.',
  'Rowe in the workshop owes me money. Tell him I sent you, see what happens.',
  'You hear about the last guy who tried the fence? He is in seg. Cut it at night.',
  'Two sheets make a rope. Everyone knows that. Not everyone can climb.'
];

const GUARD_LINES = [
  'Nothing to see here. Move along.',
  'Hey! Hands where I can see them.',
  'What are you doing out here?',
  'On your way, inmate.'
];

function fmtTime(minutes) {
  const m = Math.floor(minutes % 1440);
  const hh = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

function objDist(px, py, o) {
  const x0 = o.x * TILE, y0 = o.y * TILE;
  const x1 = x0 + o.w * TILE, y1 = y0 + o.h * TILE;
  const cx = Math.max(x0, Math.min(px, x1));
  const cy = Math.max(y0, Math.min(py, y1));
  return Math.hypot(px - cx, py - cy);
}

export class Game {
  constructor(opts = {}) {
    this.world = createWorld();
    this.player = makePlayer(this.world.spawn.x, this.world.spawn.y);
    this.inventory = [];
    this.stash = [];
    this.cash = 25;
    this.heat = 0;
    this.energy = 100;
    this.hunger = 88;
    this.health = 100;
    this.minutes = 6 * 60 + 45;   // wake-up, a few minutes before count
    this.day = 1;
    this.state = 'playing';
    this.paused = false;
    this.messages = [];
    this.events = [];
    this.holdSeconds = 0;
    this.action = null;
    this.prompt = null;
    this.holdE = false;
    this.digProgress = 0;
    this.escapeType = null;
    this.fx = null;
    this.aiClock = 0;
    this.detectClock = 0;
    this.curfewClock = 0;
    this.cooldowns = 0;
    this.flags = {
      worked: {}, meals: {}, medcabDay: 0, locker: false,
      rollcallDay: 0, searchDay: 0, warnedCurfew: false
    };
    this.stats = { caught: 0, shifts: 0, meals: 0, daysInSolitary: 0 };
    this.job = 'Laundry';
    this.regime = 'normal';
    this.drinkCd = 0;
    this.phoneIndex = 0;
    this.guards = [];
    this.inmates = [];
    this.setupGuards();
    this.setupInmates();
    this.inventory.push('spoon');
    this.log('Day 1. Roll Call in a few minutes - stand in your cell.', 'good');
    this.log('Last occupant left a bent spoon under the bunk. It is yours now.', 'info');
  }

  // ------------------------------------------------------------- setup
  setupGuards() {
    for (const def of PATROLS.guards) {
      const route = def.day;
      const a = new Actor(route[0][0] * TILE + 8, route[0][1] * TILE + 8, {
        speed: def.speed, kind: 'guard', palette: 'guard', name: def.name
      });
      this.guards.push({
        actor: a, day: def.day, night: def.night, routeIndex: 0,
        mode: 'patrol', alert: 0, wait: 0, repath: 0, target: null,
        lastSeen: 0, lastLine: -1, seeing: false
      });
    }
  }

  setupInmates() {
    const others = this.world.cells.filter(c => c.id !== 'A0');
    for (let i = 0; i < Math.min(INMATE_NAMES.length, others.length); i++) {
      const cell = others[i];
      const a = new Actor(
        (cell.x + 1.5) * TILE, (cell.y + cell.h / 2) * TILE,
        { speed: 38 + (i % 3) * 3, kind: 'inmate', palette: INMATE_LOOKS[i % 4], name: INMATE_NAMES[i] }
      );
      this.inmates.push({ actor: a, cell, wait: 1 + Math.random() * 3, repath: 0 });
    }
  }

  // ------------------------------------------------------------- helpers
  emit(type) {
    this.events.push(type);
    if (this.events.length > 40) this.events.shift();
  }

  log(text, kind = 'info') {
    this.messages.push({ text, kind, ttl: 7 });
    if (this.messages.length > 60) this.messages.shift();
  }

  get activity() {
    const m = this.minutes;
    for (const b of SCHEDULE) if (m >= b.start && m < b.end) return b;
    return SCHEDULE[0];
  }

  timeString() { return fmtTime(this.minutes); }

  isNight() { return this.minutes >= 1290 || this.minutes < 390; }

  isLockdown() {
    const a = this.activity;
    return a.key === 'lockdown';
  }

  isMealTime() {
    return MEAL_WINDOWS.find(w => this.minutes >= w.start && this.minutes < w.end) || null;
  }

  isWorkTime() {
    return this.minutes >= 540 && this.minutes < 720;
  }

  inOwnCell(x = this.player.x, y = this.player.y) {
    const c = this.world.playerCell;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    return tx >= c.x && tx < c.x + c.w && ty >= c.y && ty < c.y + c.h;
  }

  inSolitaryArea() {
    const a = this.world.areas.solitary;
    const tx = this.player.tileX, ty = this.player.tileY;
    return tx >= a.x && ty >= a.y && tx < a.x + a.w && ty < a.y + a.h;
  }

  countItem(id) { return this.inventory.filter(x => x === id).length; }
  hasItem(id) { return this.inventory.includes(id); }

  hasTool(kind) {
    return this.inventory.some(id => ITEMS[id] && ITEMS[id].tool === kind);
  }

  bestDigPower() {
    let p = 0;
    for (const id of this.inventory) {
      const it = ITEMS[id];
      if (it && it.tool === 'dig') p = Math.max(p, it.power || 1);
    }
    return p;
  }

  addItem(id) {
    if (this.inventory.length >= 10) {
      this.log('Your pockets are full (10 items max).', 'bad');
      return false;
    }
    this.inventory.push(id);
    return true;
  }

  removeItem(id) {
    const i = this.inventory.indexOf(id);
    if (i === -1) return false;
    this.inventory.splice(i, 1);
    return true;
  }

  useItem(id) {
    const it = ITEMS[id];
    if (!it) return false;
    if (it.use) {
      if (it.use.energy) this.energy = Math.min(100, this.energy + it.use.energy);
      this.removeItem(id);
      this.log(`You use the ${it.name}.`, 'good');
      return true;
    }
    this.log(`${it.name} can't be used directly.`, 'info');
    return false;
  }

  dropItem(id) {
    if (this.removeItem(id)) this.log(`Dropped ${ITEMS[id].name}.`, 'info');
  }

  stashItem(id) {
    if (!this.inOwnCell()) { this.log('You need to be at your desk.', 'bad'); return false; }
    if (this.stash.length >= 6) { this.log('Your desk drawer is full.', 'bad'); return false; }
    if (this.removeItem(id)) { this.stash.push(id); this.log(`Stashed ${ITEMS[id].name} in your desk.`, 'good'); return true; }
    return false;
  }

  takeStashItem(index) {
    const id = this.stash[index];
    if (!id) return;
    if (this.inventory.length >= 10) { this.log('Pockets full.', 'bad'); return; }
    this.stash.splice(index, 1);
    this.inventory.push(id);
  }

  craft(a, b) {
    const r = findRecipe(a, b);
    if (!r) return { ok: false, msg: 'Those two will not go together.' };
    if (!this.hasItem(a) || !this.hasItem(b)) return { ok: false, msg: 'Missing ingredients.' };
    if (a === b && this.countItem(a) < 2) return { ok: false, msg: 'Need two of those.' };
    this.removeItem(a);
    this.removeItem(b);
    this.addItem(r.out);
    this.emit('craft');
    this.log(`Crafted ${ITEMS[r.out].name}.`, 'good');
    return { ok: true, item: r.out };
  }

  buy(id) {
    const stock = SHOP_STOCK.find(s => s.id === id);
    if (!stock) return false;
    if (this.cash < stock.price) { this.log('Not enough cash.', 'bad'); return false; }
    if (this.inventory.length >= 10) { this.log('Pockets full.', 'bad'); return false; }
    this.cash -= stock.price;
    this.inventory.push(id);
    this.emit('buy');
    this.log(`Bought ${ITEMS[id].name} for $${stock.price}.`, 'good');
    return true;
  }

  // ------------------------------------------------------------- main tick
  update(dt, input) {
    if (this.state !== 'playing' || this.paused) return;
    this.holdE = !!(input && input.action('interact'));
    if (this.fx) {
      this.fx.t -= dt;
      if (this.fx.t <= 0) this.fx = null;
      return; // freeze during cut-scene fades
    }
    dt = Math.min(dt, 0.05);
    this.advanceMinutes(dt * MIN_PER_SEC);
    this.updateNeeds(dt);
    this.updatePlayer(dt, input);
    this.updateGuards(dt);
    this.updateInmates(dt);
    this.updateAction(dt);
    this.updateSchedule(dt);
    this.updatePrompt();

    if (this.drinkCd > 0) this.drinkCd -= dt;
    this.heat = Math.max(0, this.heat - dt * 0.55);
    if (this.heat >= 100) this.sendToSolitary();

    for (const m of this.messages) m.ttl -= dt;
    this.messages = this.messages.filter(m => m.ttl > 0);
    if (this.messages.length > 8) this.messages.splice(0, this.messages.length - 8);
  }

  advanceMinutes(delta) {
    this.minutes += delta;
    while (this.minutes >= 1440) {
      this.minutes -= 1440;
      this.day++;
      this.onNewDay();
    }
  }

  onNewDay() {
    this.flags.worked = {};
    this.flags.meals = {};
    this.flags.rollcallDay = 0;
    this.flags.searchDay = 0;
    this.flags.search2Day = 0;
    const regimes = [
      ['normal', 'Normal regime. Nothing unusual on the board.'],
      ['fog', 'Morning fog rolls over the yard. Guards cannot see far today.'],
      ['overtime', 'Overtime regime: work shifts pay double today.'],
      ['shakedown', 'Shakedown notice: extra cell search at 15:00 today.'],
      ['heatwave', 'Heatwave. The food line runs short and everyone is hungry.']
    ];
    this.heat = Math.max(0, this.heat - 25);
    this.energy = Math.max(15, this.energy - 8);
    this.digProgress = Math.max(0, this.digProgress - 10); // rain collapses loose dirt
    if (this.day === 1) {
      this.regime = 'normal';
    } else {
      const pick = regimes[Math.floor(Math.random() * regimes.length)];
      this.regime = pick[0];
      this.log(pick[1], this.regime === 'normal' ? 'info' : 'good');
    }
    if (this.regime === 'fog') {
      // fog burns off by mid-morning
      this.fogUntil = 660;
    }
    this.log(`Day ${this.day}. Wake up - count is at 07:00.`, 'good');
  }

  updateNeeds(dt) {
    const sec = dt;
    const act = this.activity.key;
    if (act === 'lockdown') {
      this.energy = Math.min(100, this.energy + sec * 0.9);
    } else {
      this.energy -= sec * 0.30;
    }
    this.hunger -= sec * (this.regime === 'heatwave' ? 0.34 : 0.22);
    if (this.hunger <= 0) {
      this.hunger = 0;
      this.health -= sec * 0.55;
    }
    if (this.energy <= 0) {
      this.energy = 0;
      this.health -= sec * 0.22;
    }
    if (this.health <= 0) this.hospitalize('You collapse from exhaustion.');
    this.health = Math.max(1, this.health);
    this.energy = Math.max(0, Math.min(100, this.energy));
    this.hunger = Math.max(0, Math.min(100, this.hunger));
  }

  updatePlayer(dt, input) {
    if (this.action) return;
    let dx = 0, dy = 0;
    if (input) {
      if (input.action('up')) dy -= 1;
      if (input.action('down')) dy += 1;
      if (input.action('left')) dx -= 1;
      if (input.action('right')) dx += 1;
    }
    this.player.moveDir(this.world, dx, dy, dt);
    this.player.updateTimers(dt);
  }

  // ------------------------------------------------------------- interactions
  findInteraction() {
    if (this.state !== 'playing') return null;
    let best = null, bestD = REACH;
    for (const o of this.world.objects) {
      if (!o.interact) continue;
      const d = objDist(this.player.x, this.player.y, o);
      if (d < bestD) { bestD = d; best = o; }
    }
    if (!best) return null;
    const p = this.describeInteraction(best);
    return p;
  }

  describeInteraction(o) {
    const act = this.activity;
    const base = { obj: o, type: o.interact, label: '', enabled: false, hint: '' };
    switch (o.interact) {
      case 'bed':
        if (o.own) {
          base.label = this.isLockdown() || this.isNight() ? 'Sleep until morning' : 'Take a nap';
          base.enabled = true;
          base.hint = this.isLockdown() ? 'Lights out - recover energy.' : 'Skip 90 minutes, recover some energy.';
        } else {
          base.label = "Someone else's bunk";
          base.enabled = false;
          base.hint = 'Not your bunk. Use the one in your own cell.';
        }
        break;
      case 'toilet':
        base.type = 'dig';
        if (!o.dig) {
          base.label = 'Toilet';
          base.enabled = false;
          base.hint = 'Digging your way out here would be noticed.';
          break;
        }
        if (this.digProgress >= 100) {
          base.label = 'Squeeze into the tunnel';
          base.enabled = true;
          base.hint = 'Leave Ironwood behind.';
        } else {
          base.label = 'Dig tunnel';
          base.enabled = this.bestDigPower() > 0;
          if (this.digProgress > 0) base.label = `Dig tunnel (${Math.floor(this.digProgress)}%)`;
          base.hint = this.bestDigPower() > 0
            ? 'Hold E to dig. Guards must not see you.'
            : 'You need something to dig with: a spoon, or better.';
          base.rate = (100 / 45) * this.bestDigPower();
        }
        break;
      case 'desk':
        if (o.own) {
          base.label = 'Search your desk';
          base.enabled = true;
          base.hint = 'Stash contraband here. Guards search cells.';
        } else {
          base.label = "Another inmate's desk";
          base.enabled = false;
          base.hint = 'Not yours. Hands off.';
        }
        break;
      case 'serve': {
        const meal = this.isMealTime();
        base.label = meal ? 'Collect your meal' : 'Serving hatch (closed)';
        base.enabled = !!meal && !this.flags.meals[meal.name];
        base.hint = meal
          ? (this.flags.meals[meal.name] ? 'You already ate this sitting.' : 'Hot food restores hunger and a little energy.')
          : 'Meals are served at 08:00, 12:00 and 17:00.';
        break;
      }
      case 'work': {
        const key = o.job + ':' + o.x + ',' + o.y;
        const worked = this.flags.worked[key];
        base.label = this.isWorkTime() ? `Work: ${o.job} station` : `${o.job} station (closed)`;
        base.enabled = this.isWorkTime() && !worked;
        base.hint = this.isWorkTime()
          ? (worked ? 'Already done your shift at this station today.' : 'Hold E for a shift. Pays $10, costs energy.')
          : 'Work period is 09:00 - 12:00.';
        base.key = key;
        base.rate = 100 / 2.4;
        break;
      }
      case 'shop':
        base.label = 'Browse the commissary';
        base.enabled = true;
        base.hint = 'Spend cash on tools and supplies.';
        break;
      case 'locker':
        base.label = 'Evidence locker';
        base.enabled = !this.flags.locker && this.hasTool('pick');
        base.hint = this.flags.locker ? 'Picked clean.'
          : (this.hasTool('pick') ? 'Hold E to pick the lock.' : 'Locked. A lockpick would help.');
        base.rate = 100 / 2.2;
        break;
      case 'vent':
        base.label = 'Roof vent';
        if (this.flags.ventOpen) {
          base.enabled = this.hasTool('climb');
          base.label = 'Climb out through the vent';
          base.hint = this.hasTool('climb')
            ? 'Rope secured. Climb down the outer wall and run.'
            : 'The drop is too far. You need rope.';
          base.nightOnly = true;
        } else {
          base.enabled = this.hasTool('pry');
          const pry = Math.floor(this.flags.ventPry || 0);
          base.label = pry > 0 ? `Pry vent cover (${pry}%)` : 'Pry vent cover';
          base.hint = this.hasTool('pry')
            ? 'Hold E to pry the cover. Do it at night; the workshop is patrolled.'
            : 'The cover is bolted on. A crowbar could pry it.';
          base.rate = 100 / 5;
          base.nightOnly = true;
        }
        break;
      case 'fence': {
        base.label = 'Perimeter fence';
        const cut = Math.floor(this.flags.fenceCut || 0);
        if (cut > 0) base.label = `Cut fence (${cut}%)`;
        base.enabled = this.hasTool('cut');
        base.hint = this.hasTool('cut')
          ? 'Hold E to cut the chain-link. Best done after lights out.'
          : 'Too strong for bare hands. Bolt cutters would do it.';
        base.rate = 100 / 7;
        base.nightOnly = true;
        break;
      }
      case 'heal':
        base.label = 'Rest on the cot';
        base.enabled = this.health < 100;
        base.hint = this.health < 100 ? 'One hour of rest. Restores health.' : 'You feel fine.';
        break;
      case 'medcab':
        base.enabled = this.flags.medcabDay !== this.day;
        base.label = 'Take medicine';
        base.hint = base.enabled ? 'Restores 35 health. One dose per day.' : 'Empty for today.';
        break;
      case 'board':
        base.label = 'Read the notice board';
        base.enabled = true;
        base.hint = 'Routine, rules and release conditions.';
        break;
      case 'drink':
        base.label = 'Drink from the fountain';
        base.enabled = true;
        base.hint = 'Cold water and a moment to think. Lowers heat by 5.';
        break;
      case 'phone':
        base.label = 'Use the payphone';
        base.enabled = true;
        base.hint = 'Your outside man always has something to say.';
        break;
      default:
        break;
    }
    return base;
  }

  nearestInmate() {
    let best = null, bestD = 26;
    for (const inm of this.inmates) {
      const d = Math.hypot(inm.actor.x - this.player.x, inm.actor.y - this.player.y);
      if (d < bestD) { bestD = d; best = inm; }
    }
    return best;
  }

  updatePrompt() {
    let p = this.findInteraction();
    if (!p) {
      const inm = this.nearestInmate();
      if (inm) {
        p = {
          obj: null, actor: inm.actor, type: 'talk', enabled: true,
          label: `Talk to ${inm.actor.name}`,
          hint: 'Inmates hear things. Some of it is even true.'
        };
      }
    }
    this.prompt = p;
    if (this.action && p && p.type !== this.action.type) this.cancelAction(true);
    if (this.action && p && p.obj && this.action.obj && p.obj !== this.action.obj) this.cancelAction(true);
  }

  pressInteract() {
    if (this.state !== 'playing' || this.fx) return;
    const p = this.prompt;
    if (!p) return;
    if (p.type === 'talk') {
      const inm = this.inmates.find(i => i.actor === p.actor);
      if (!inm || Math.hypot(inm.actor.x - this.player.x, inm.actor.y - this.player.y) > 30) {
        this.prompt = null;
        return;
      }
      const line = INMATE_LINES[(this.phoneIndex + this.day + inm.actor.name.length) % INMATE_LINES.length];
      inm.actor.say = line.length > 58 ? 'Ask me about the fence sometime.' : line;
      inm.actor.sayTimer = 4.5;
      this.emit('ui');
      this.log(`${inm.actor.name}: "${line}"`, 'info');
      return;
    }
    if (!p.obj) return;
    if (objDist(this.player.x, this.player.y, p.obj) > REACH) { this.prompt = null; return; }
    if (!p.enabled) {
      this.emit('deny');
      if (p.hint) this.log(p.hint, 'bad');
      return;
    }
    if (p.nightOnly && !this.isNight()) {
      this.log('Too exposed in daylight. Try again after lights out (21:30-05:00).', 'bad');
      return;
    }
    if (p.type === 'bed') return this.sleepInBed(p.obj.own);
    if (p.type === 'serve') return this.collectMeal();
    if (p.type === 'shop') { this.paused = true; this.requestPanel = 'shop'; return; }
    if (p.type === 'desk') { this.paused = true; this.requestPanel = 'stash'; return; }
    if (p.type === 'board') { this.paused = true; this.requestPanel = 'help'; return; }
    if (p.type === 'heal') return this.restAtCot();
    if (p.type === 'medcab') return this.takeMedicine();
    if (p.type === 'drink') {
      if (this.drinkCd > 0) { this.log('You just drank. Give it a minute.', 'info'); return; }
      this.drinkCd = 20;
      this.emit('drink');
      this.heat = Math.max(0, this.heat - 5);
      this.log('Cold water. You feel a little calmer. Heat -5.', 'good');
      return;
    }
    if (p.type === 'phone') {
      const lines = [
        'Your brother: "The workshop vent is held on with four bolts. A crowbar would do it."',
        'Your brother: "Two sheets make a rope. Ask the laundry boys for spares."',
        'Your brother: "The yard fence is chain-link over a steel rail. Bolt cutters or nothing."',
        'Your brother: "They search cells after the 10:00 count. Keep the desk clean."'
      ];
      this.log(lines[this.phoneIndex % lines.length], 'info');
      this.phoneIndex++;
      return;
    }
    if (p.type === 'vent' && this.flags.ventOpen) {
      if (p.nightOnly && !this.isNight()) { this.log('The workshop is watched. Wait for lights out.', 'bad'); return; }
      return this.escape('vent');
    }
    // hold-to-complete actions
    if (['dig', 'work', 'locker', 'vent', 'fence'].includes(p.type)) {
      if (p.type === 'dig' && this.digProgress >= 100) return this.escape('tunnel');
      let start = 0;
      if (p.type === 'vent') start = this.flags.ventPry || 0;
      if (p.type === 'fence') start = this.flags.fenceCut || 0;
      const hold = { type: p.type, obj: p.obj, label: p.label, progress: start, rate: p.rate || 40, key: p.key };
      this.action = hold;
      return;
    }
  }

  cancelAction(quiet) {
    if (!this.action) return;
    if (!quiet) this.log('Stopped.', 'info');
    this.action = null;
  }

  updateAction(dt) {
    const a = this.action;
    if (!a) return;
    if (!this.holdE) { this.cancelAction(true); return; }
    const p = this.prompt;
    if (!p || p.obj !== a.obj) { this.cancelAction(true); return; }
    if (a.type === 'dig' && this.bestDigPower() <= 0) { this.cancelAction(true); return; }

    if (a.type === 'dig') {
      if (this.energy <= 1) { this.log('You are too exhausted to dig.', 'bad'); this.cancelAction(true); return; }
      this.digProgress += dt * a.rate;
      this.energy -= dt * 1.1;
      this.hunger -= dt * 0.35;
      const milestones = [25, 50, 75];
      for (const m of milestones) {
        if (this.digProgress >= m && !this.flags['dig' + m]) {
          this.flags['dig' + m] = true;
          this.log(`Tunnel ${m}% - keep the dirt hidden under your bunk.`, 'good');
        }
      }
      this.digNoise = (this.digNoise || 0) + dt;
      if (this.digNoise > 3.2) {
        this.digNoise = 0;
        for (const g of this.guards) {
          if (g.mode !== 'alert' && Math.hypot(g.actor.x - this.player.x, g.actor.y - this.player.y) < 10 * TILE) {
            if (Math.random() < 0.6) {
              g.mode = 'alert';
              g.alert = 5;
              g.target = { x: 10, y: 18 };
              g.actor.say = 'What is that scraping?';
              g.actor.sayTimer = 2.5;
              this.log('Boots in the corridor. Someone heard the scraping.', 'bad');
              break;
            }
          }
        }
      }
      if (this.digProgress >= 100) {
        this.digProgress = 100;
        this.action = null;
        this.log('The tunnel breaks through. You can hear the road outside.', 'good');
        this.emit('craft');
      }
      return;
    }

    a.progress += dt * a.rate;
    if (a.type === 'vent') this.flags.ventPry = a.progress;
    if (a.type === 'fence') this.flags.fenceCut = a.progress;
    if (a.type === 'work') this.energy -= dt * 1.6;
    if (a.progress >= 100) {
      this.action = null;
      this.completeHold(a);
    }
  }

  completeHold(a) {
    if (a.type === 'work') {
      this.flags.worked[a.key] = true;
      const pay = this.regime === 'overtime' ? 20 : 10;
      this.cash += pay;
      this.energy = Math.max(0, this.energy - 8);
      this.hunger = Math.max(0, this.hunger - 6);
      this.stats.shifts++;
      this.emit('work');
      this.log(`Shift done. +$${pay} (cash $${this.cash}).`, 'good');
    } else if (a.type === 'locker') {
      this.flags.locker = true;
      this.addItem('crowbar');
      this.emit('pickup');
      this.log('Inside the evidence locker: a crowbar. It is yours now.', 'good');
      this.heat += 12;
    } else if (a.type === 'vent') {
      this.flags.ventOpen = true;
      this.flags.ventPry = 100;
      this.log('The vent cover clatters to the floor. You need rope to get down.', 'good');
    } else if (a.type === 'fence') {
      this.flags.fenceCut = 100;
      this.escape('fence');
    }
  }

  sleepInBed(own) {
    if (!own) return;
    const night = this.isLockdown() || this.isNight();
    let target;
    if (night) {
      target = this.minutes < 390 ? 390 : 390 + 1440;
    } else {
      target = this.minutes + 90;
    }
    const span = target - this.minutes;
    this.advanceMinutes(span);
    this.energy = Math.min(100, this.energy + (night ? 85 : 35));
    this.health = Math.min(100, this.health + (night ? 8 : 3));
    this.hunger = Math.max(0, this.hunger - span * 0.012);
    this.emit('sleep');
    this.fx = { t: 0.8, kind: 'sleep', text: night ? 'You sleep until morning.' : 'You nap for 90 minutes.' };
    this.log(night ? 'You sleep through the night.' : 'You nap for 90 minutes.', 'good');
  }

  restAtCot() {
    this.advanceMinutes(60);
    this.health = Math.min(100, this.health + 35);
    this.energy = Math.min(100, this.energy + 15);
    this.hunger = Math.max(0, this.hunger - 5);
    this.fx = { t: 0.7, kind: 'sleep', text: 'The nurse lets you rest for an hour.' };
    this.log('Rested. Health +35.', 'good');
  }

  takeMedicine() {
    if (this.flags.medcabDay === this.day) return;
    this.flags.medcabDay = this.day;
    this.emit('pickup');
    this.health = Math.min(100, this.health + 35);
    this.log('You pocket a couple of painkillers. Health +35.', 'good');
  }

  collectMeal() {
    const meal = this.isMealTime();
    if (!meal || this.flags.meals[meal.name]) return;
    this.flags.meals[meal.name] = true;
    this.hunger = Math.min(100, this.hunger + 58);
    this.energy = Math.min(100, this.energy + 6);
    this.stats.meals++;
    this.emit('eat');
    this.log(`You eat ${meal.name}. Hunger restored.`, 'good');
  }

  hospitalize(reason) {
    this.health = 55;
    this.hunger = 60;
    this.energy = 50;
    this.cash = Math.max(0, this.cash - 15);
    this.advanceMinutes(120);
    this.player.x = this.world.spawn.x;
    this.player.y = this.world.spawn.y;
    this.fx = { t: 1.2, kind: 'sleep', text: reason || 'You wake up in the infirmary.' };
    this.log('You wake up in the infirmary. $15 medical fee.', 'bad');
  }

  // ------------------------------------------------------------- schedule events
  updateSchedule(dt) {
    const m = this.minutes;
    // roll call check at 07:15
    if (m >= 435 && m < 436 && this.flags.rollcallDay !== this.day) {
      this.flags.rollcallDay = this.day;
      if (this.inOwnCell()) {
        this.log('Count passed. The officer marks you present.', 'good');
      } else {
        this.heat += 18;
        this.log('You missed roll call. An officer is writing you up.', 'bad');
      }
    }
    // extra shakedown
    if (m >= 900 && m < 901 && this.regime === 'shakedown' && this.flags.search2Day !== this.day) {
      this.flags.search2Day = this.day;
      const bad2 = this.stash.filter(isContraband);
      if (bad2.length) {
        this.heat += 20;
        this.stash = this.stash.filter(x => !isContraband(x));
        this.log(`Shakedown! ${bad2.length} contraband item(s) taken from your desk.`, 'bad');
      } else {
        this.log('Shakedown - your desk is clean.', 'info');
      }
    }
    // cell search at 10:00
    if (m >= 600 && m < 601 && this.flags.searchDay !== this.day) {
      this.flags.searchDay = this.day;
      const bad = this.stash.filter(isContraband);
      if (bad.length) {
        this.heat += 20;
        this.stash = this.stash.filter(x => !isContraband(x));
        this.log(`Cell search! ${bad.length} contraband item(s) confiscated.`, 'bad');
      } else if (this.stash.length) {
        this.log('Cell search - nothing incriminating in your desk.', 'info');
      }
    }
  }

  // ------------------------------------------------------------- guard AI
  canSee(guardActor, tx, ty, rangeTiles = 10) {
    const gx = guardActor.x / TILE, gy = guardActor.y / TILE;
    const dx = tx - gx, dy = ty - gy;
    const dist = Math.hypot(dx, dy);
    let range = rangeTiles;
    if (this.regime === 'fog' && this.minutes < (this.fogUntil || 0)) range *= 0.55;
    if (dist > range) return false;
    if (dist > 2.4) {
      const [fx, fy] = FACING_VEC[guardActor.facing] || [0, 1];
      const dot = (dx * fx + dy * fy) / (dist || 1);
      if (dot < 0.30) return false;
    }
    return this.lineOfSight(gx, gy, tx, ty);
  }

  lineOfSight(x0, y0, x1, y1) {
    let x = Math.floor(x0), y = Math.floor(y0);
    const tx = Math.floor(x1), ty = Math.floor(y1);
    const dx = Math.abs(tx - x), dy = Math.abs(ty - y);
    const sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
    let err = dx - dy;
    let guard = 0;
    while ((x !== tx || y !== ty) && guard++ < 200) {
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if ((x !== tx || y !== ty) && this.world.sightBlocked(x, y)) return false;
    }
    return true;
  }

  illegalActivity() {
    if (this.action) {
      if (['dig', 'vent', 'fence', 'locker'].includes(this.action.type)) return this.action.type;
      return null;
    }
    if (this.isLockdown() && !this.inOwnCell()) return 'curfew';
    return null;
  }

  updateGuards(dt) {
    const p = this.player;
    const night = this.minutes >= NIGHT_PATROL_FROM || this.minutes < DAY_PATROL_FROM;
    for (const g of this.guards) {
      const a = g.actor;
      a.updateTimers(dt);
      g.repath -= dt;
      g.wait -= dt;

      const illegal = this.illegalActivity();
      const sees = this.canSee(a, p.tileX, p.tileY, illegal ? 11 : 9);
      g.seeing = sees;

      if (sees && illegal) {
        if (g.mode !== 'alert') {
          g.mode = 'alert';
          g.alert = 7;
          g.lastLine = (g.lastLine + 1) % GUARD_LINES.length;
          a.say = GUARD_LINES[g.lastLine];
          a.sayTimer = 3;
          this.heat += 9;
          this.emit('alert');
          this.log(`${a.name} spots you: "${a.say}"`, 'bad');
        } else {
          g.alert = Math.max(g.alert, 3);
        }
        this.heat += dt * 5;
        g.target = { x: p.tileX, y: p.tileY };
        if (g.repath <= 0) { a.goTo(this.world, p.tileX, p.tileY); g.repath = 0.6; }
        g.catchCd = Math.max(0, (g.catchCd || 0) - dt);
        if (a.distanceTo(p) < TILE * 1.5 && g.catchCd <= 0) {
          g.catchCd = 4;
          this.caught(g);
        }
      } else if (g.mode === 'alert') {
        g.alert -= dt;
        if (g.alert <= 0) { g.mode = 'patrol'; g.target = null; }
        else {
          if (g.repath <= 0 && g.target) { a.goTo(this.world, g.target.x, g.target.y); g.repath = 1.2; }
        }
      }

      if (g.mode === 'patrol') {
        const route = night ? g.night : g.day;
        if (!a.path && g.wait <= 0) {
          g.wait = 1.1;
          g.routeIndex = (g.routeIndex + 1) % route.length;
          const wp = route[g.routeIndex];
          if (!a.goTo(this.world, wp[0], wp[1])) g.repath = 2;
        }
      }
      if (a.stuck > 1.4) {
        a.stuck = 0;
        if (g.mode === 'patrol') {
          const route = night ? g.night : g.day;
          const wp = route[g.routeIndex];
          a.goTo(this.world, wp[0], wp[1]);
        } else if (g.target) a.goTo(this.world, g.target.x, g.target.y);
      }
      a.followPath(this.world, dt);
    }
  }

  caught(g) {
    this.cancelAction(true);
    this.heat += 20;
    this.stats.caught++;
    this.emit('caught');
    g.actor.say = 'That is enough out of you.';
    g.actor.sayTimer = 2.5;
    g.alert = 2;
    this.log(`${g.actor.name} grabs your shoulder. Heat +20.`, 'bad');
    this.player.x -= Math.sign(this.player.x - g.actor.x) * 6;
    this.player.y -= Math.sign(this.player.y - g.actor.y) * 6;
    if (this.heat >= 100) this.sendToSolitary();
  }

  sendToSolitary() {
    const smuggled = this.inventory.filter(isContraband);
    this.inventory = this.inventory.filter(x => !isContraband(x));
    this.stash = this.stash.filter(x => !isContraband(x));
    this.heat = 22;
    this.advanceMinutes(150);
    this.stats.daysInSolitary++;
    this.player.x = this.world.spawn.x;
    this.player.y = this.world.spawn.y;
    this.energy = Math.max(10, this.energy - 20);
    this.hunger = Math.max(0, this.hunger - 25);
    this.emit('jail');
    this.fx = { t: 2.4, kind: 'solitary', text: '150 minutes in solitary. Contraband seized.' };
    this.log(`Solitary confinement! ${smuggled.length} contraband item(s) seized.`, 'bad');
    this.action = null;
  }

  // ------------------------------------------------------------- inmates
  updateInmates(dt) {
    const act = this.activity.key;
    for (const inm of this.inmates) {
      const a = inm.actor;
      a.updateTimers(dt);
      inm.wait -= dt;
      if (!a.path) {
        if (inm.wait <= 0) {
          const t = this.inmateTarget(inm, act);
          a.goTo(this.world, t.x, t.y);
          inm.wait = 3 + Math.random() * 7;
        }
      }
      a.followPath(this.world, dt);
      if (a.stuck > 1.5) {
        a.stuck = 0;
        const t = this.inmateTarget(inm, act);
        a.goTo(this.world, t.x, t.y);
      }
    }
  }

  inmateTarget(inm, act) {
    const w = this.world;
    let area;
    if (act === 'lockdown' || act === 'wake') {
      const c = inm.cell;
      return w.randomWalkable(c.x, c.y, c.w, c.h);
    }
    if (act === 'breakfast' || act === 'lunch' || act === 'dinner') {
      return w.randomWalkable(56, 9, 20, 10);
    }
    if (act === 'work') {
      area = Math.random() < 0.5 ? w.areas.workshop : w.areas.laundry;
      return w.randomWalkable(area.x + 1, area.y + 1, area.w - 2, area.h - 2);
    }
    if (act === 'rollcall') {
      const c = inm.cell;
      return w.randomWalkable(c.x, c.y, c.w, c.h);
    }
    if (Math.random() < 0.55) {
      area = w.areas.yard;
      return w.randomWalkable(area.x + 2, area.y + 2, area.w - 4, area.h - 4);
    }
    area = w.areas.canteen;
    return w.randomWalkable(area.x + 1, area.y + 1, area.w - 2, area.h - 2);
  }

  // ------------------------------------------------------------- escaping
  escape(kind) {
    if (this.state !== 'playing') return;
    this.state = 'won';
    this.escapeType = kind;
    this.action = null;
    this.emit('win');
    const text = {
      tunnel: 'You drop into the tunnel, pull the bunk over the hole and crawl into the dark. Ironwood is behind you.',
      vent: 'Rope anchored, you swing down the outer wall and sprint for the tree line. The sirens start too late.',
      fence: 'The chain-link peels open. You are through and running before the tower lights sweep the yard.'
    }[kind] || 'You are out.';
    this.log(text, 'good');
    this.escapeText = text;
  }

  // ------------------------------------------------------------- serialization
  serialize() {
    return {
      v: 1,
      day: this.day,
      minutes: this.minutes,
      cash: this.cash,
      heat: this.heat,
      energy: this.energy,
      hunger: this.hunger,
      health: this.health,
      inventory: this.inventory.slice(),
      stash: this.stash.slice(),
      digProgress: this.digProgress,
      regime: this.regime,
      flags: JSON.parse(JSON.stringify(this.flags)),
      stats: JSON.parse(JSON.stringify(this.stats)),
      px: this.player.x,
      py: this.player.y,
      state: this.state,
      escapeType: this.escapeType
    };
  }

  restore(data) {
    if (!data || data.v !== 1) return false;
    this.day = Math.max(1, Math.round(data.day) || 1);
    this.minutes = Math.min(1439.9, Math.max(0, Number(data.minutes) || 0));
    this.cash = Math.max(0, Math.round(Number(data.cash) || 0));
    this.heat = Math.min(100, Math.max(0, Number(data.heat) || 0));
    this.energy = Math.min(100, Math.max(0, Number(data.energy) || 0));
    this.hunger = Math.min(100, Math.max(0, Number(data.hunger) || 0));
    this.health = Math.min(100, Math.max(1, Number(data.health) || 1));
    this.inventory = (data.inventory || []).slice();
    this.stash = (data.stash || []).slice();
    this.digProgress = data.digProgress || 0;
    this.regime = data.regime || normalRegime();
    this.flags = Object.assign(this.flags, data.flags || {});
    this.stats = Object.assign(this.stats, data.stats || {});
    if (data.px && data.py) {
      const t = this.world.nearestFree(Math.floor(data.px / TILE), Math.floor(data.py / TILE));
      this.player.x = t.x * TILE + TILE / 2;
      this.player.y = t.y * TILE + TILE / 2;
    }
    this.log('Sentence resumed. Read the board if you are lost.', 'info');
    return true;
  }

  objective() {
    if (this.state === 'won') return 'You are free.';
    if (this.digProgress > 0 && this.digProgress < 100) {
      return `Tunnel ${Math.floor(this.digProgress)}% under your toilet. Keep digging.`;
    }
    if (this.hasTool('dig')) return 'Dig out under your cell toilet (best during lockdown).';
    if (this.hasTool('cut')) return 'Cut the yard fence after lights out.';
    if (this.hasTool('pry')) return 'Pry the workshop vent open, then climb out.';
    return 'Escape plan: get a tool. Spoon + Scrap Metal = shovel. Two sheets = rope.';
  }
}
