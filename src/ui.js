// DOM HUD and menus for IRONWOOD PENITENTIARY.
import { ITEMS, RECIPES, SHOP_STOCK, itemName } from './items.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

// ---------------------------------------------------------------- item icons
export function drawIcon(ctx, id, S) {
  const k = S / 32;
  ctx.clearRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = false;
  const R = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)));
  };
  const CIRC = (x, y, r, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2);
    ctx.fill();
  };
  switch (id) {
    case 'sheet':
      R(4, 7, 24, 18, '#e7e1d0');
      R(4, 7, 24, 3, '#f6f2e6');
      R(4, 20, 24, 2, '#c9c2ae');
      R(14, 7, 2, 18, '#d3ccb9');
      break;
    case 'spoon':
      R(19, 6, 3, 12, '#b9c2c8');
      CIRC(20.5, 21, 6, '#c9d2d8');
      CIRC(20.5, 21, 4.2, '#aab4bb');
      R(9, 16, 3, 3, '#8e989e');
      break;
    case 'shovel':
      R(15, 4, 3, 16, '#8a5f36');
      R(12, 3, 9, 3, '#a97b4a');
      R(11, 19, 11, 9, '#9aa4ab');
      R(13, 21, 7, 5, '#c3ccd2');
      break;
    case 'metal':
      ctx.fillStyle = '#9aa4ab';
      ctx.beginPath();
      ctx.moveTo(5 * k, 20 * k); ctx.lineTo(9 * k, 8 * k); ctx.lineTo(16 * k, 12 * k);
      ctx.lineTo(21 * k, 5 * k); ctx.lineTo(27 * k, 15 * k); ctx.lineTo(23 * k, 26 * k);
      ctx.lineTo(11 * k, 25 * k); ctx.closePath();
      ctx.fill();
      R(10, 14, 6, 2, '#c3ccd2');
      break;
    case 'tape':
      CIRC(16, 16, 12, '#6f7a80');
      CIRC(16, 16, 5, '#20262b');
      CIRC(16, 16, 8.4, '#8b959b');
      R(6, 14, 20, 3, '#555f65');
      break;
    case 'comb':
      R(6, 8, 20, 5, '#2f3a42');
      for (let i = 0; i < 7; i++) R(7 + i * 2.6, 13, 1.6, 10, '#4a5860');
      break;
    case 'crowbar':
      R(8, 8, 4, 20, '#c0392b');
      R(8, 6, 12, 4, '#c0392b');
      R(16, 6, 4, 6, '#8e2b20');
      R(9, 9, 2, 18, '#e05a48');
      R(23, 24, 4, 3, '#8e2b20');
      break;
    case 'cutters':
      R(8, 6, 4, 12, '#9aa4ab');
      R(20, 6, 4, 12, '#9aa4ab');
      R(13, 4, 6, 5, '#c3ccd2');
      R(10, 15, 5, 12, '#c0392b');
      R(17, 15, 5, 12, '#c0392b');
      R(14, 11, 4, 4, '#7a858c');
      break;
    case 'rope':
      ctx.strokeStyle = '#c2a26a';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.arc(16 * k, 16 * k, 9 * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#a5874f';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.arc(16 * k, 16 * k, 5 * k, 0.4, Math.PI * 1.7);
      ctx.stroke();
      break;
    case 'lockpick':
      R(9, 6, 3, 18, '#c3ccd2');
      R(9, 21, 12, 3, '#c3ccd2');
      R(18, 18, 3, 4, '#8e989e');
      break;
    case 'snack':
      R(5, 10, 22, 13, '#c08a2e');
      R(5, 10, 22, 3, '#e0aa4a');
      R(11, 13, 10, 8, '#f2d79a');
      R(7, 24, 18, 2, '#8c611d');
      break;
    default:
      R(8, 8, 16, 16, '#8b8378');
  }
}

function iconCanvas(id, size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  c.className = 'icon';
  if (id) drawIcon(c.getContext('2d'), id, size);
  return c;
}

// ---------------------------------------------------------------- UI
export class UI {
  constructor(game, opts = {}) {
    this.game = game;
    this.opts = opts;
    this.panel = null;
    this.signature = '';
    this.logSig = '';
    this.slotEls = [];
    this.iconCache = new Map();
    this.buildHotbar();
    this.introOpen = false;
    this.winShown = false;
    this.bindStatic();
  }

  icon(id, size = 30) {
    // draw a fresh canvas each time: cloned canvases are not reliable everywhere
    return iconCanvas(id, size);
  }

  buildMinimapBg() {
    const w = this.game.world;
    const pad = 2;
    const c = document.createElement('canvas');
    c.width = w.w * 2;
    c.height = w.h * 2;
    const ctx = c.getContext('2d');
    const colors = {
      0: '#3f5c33', 1: '#5f5e64', 2: '#7d7468', 3: '#a49d8f',
      4: '#3a2b24', 5: '#5a636a', 6: '#8a939a', 7: '#8a939a'
    };
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        const t = w.tiles[y * w.w + x];
        ctx.fillStyle = colors[t] || '#000';
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    }
    this.mapBg = c;
    this.mapPad = pad;
  }

  drawMinimap() {
    const map = document.getElementById('minimap');
    if (!map || map.classList.contains('hidden')) return;
    if (!this.mapBg) this.buildMinimapBg();
    const ctx = map.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, map.width, map.height);
    // fit the background inside the canvas with padding
    const s = Math.min((map.width - 8) / this.mapBg.width, (map.height - 8) / this.mapBg.height);
    const dx = (map.width - this.mapBg.width * s) / 2;
    const dy = (map.height - this.mapBg.height * s) / 2;
    ctx.drawImage(this.mapBg, dx, dy, this.mapBg.width * s, this.mapBg.height * s);
    const px = (wx) => dx + (wx / 16) * 2 * s;
    const py = (wy) => dy + (wy / 16) * 2 * s;
    const g = this.game;
    // label rooms lightly
    for (const inm of g.inmates) {
      ctx.fillStyle = 'rgba(200,190,170,0.55)';
      ctx.fillRect(px(inm.actor.x) - 1, py(inm.actor.y) - 1, 2, 2);
    }
    for (const guard of g.guards) {
      ctx.fillStyle = guard.mode === 'alert' ? '#ff6a52' : 'rgba(120,170,230,0.9)';
      ctx.fillRect(px(guard.actor.x) - 1.5, py(guard.actor.y) - 1.5, 3, 3);
    }
    // player
    const blink = 0.6 + 0.4 * Math.sin(performance.now() / 220);
    ctx.fillStyle = `rgba(255,214,107,${blink})`;
    ctx.beginPath();
    ctx.arc(px(g.player.x), py(g.player.y), 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,16,12,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  buildHotbar() {
    const bar = $('#hotbar');
    bar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const slot = el('button', 'slot');
      slot.type = 'button';
      slot.addEventListener('click', () => this.openPanel('inventory'));
      bar.appendChild(slot);
      this.slotEls.push(slot);
    }
  }

  bindStatic() {
    $('#introNew').addEventListener('click', () => {
      $('#intro').classList.add('hidden');
      this.introOpen = false;
      this.opts.onNewGame && this.opts.onNewGame();
    });
    const cont = $('#introContinue');
    if (cont) {
      cont.addEventListener('click', () => {
        if (!this.opts.hasSave()) return;
        $('#intro').classList.add('hidden');
        this.introOpen = false;
        this.opts.onContinue && this.opts.onContinue();
      });
      if (!this.opts.hasSave()) cont.classList.add('disabled');
    }
    $('#winAgain').addEventListener('click', () => {
      $('#winscreen').classList.add('hidden');
      this.winShown = false;
      this.opts.onNewGame && this.opts.onNewGame();
    });
  }

  invalidateMinimap() {
    this.mapBg = null;
  }

  showIntro() {
    this.introOpen = true;
    $('#intro').classList.remove('hidden');
  }

  // ------------------------------------------------------------- panels
  openPanel(name) {
    if (name === 'win') return;
    this.panel = name;
    this.game.paused = true;
    this.renderPanel();
  }

  closePanel() {
    this.panel = null;
    this.game.paused = false;
    $('#modalRoot').classList.add('hidden');
    $('#modalRoot').innerHTML = '';
  }

  renderPanel() {
    const root = $('#modalRoot');
    root.classList.remove('hidden');
    root.innerHTML = '';
    const wrap = el('div', 'panel-wrap');
    const panel = el('div', 'panel panel-' + this.panel);
    const head = el('div', 'panel-head');
    head.appendChild(el('h2', null, {
      inventory: 'INVENTORY',
      craft: 'WORKBENCH',
      shop: 'COMMISSARY',
      stash: 'YOUR DESK',
      help: 'PRISON REGULATIONS',
      pause: 'PAUSED',
      stashdesk: 'YOUR DESK'
    }[this.panel] || this.panel.toUpperCase()));
    const close = el('button', 'btn ghost small', 'CLOSE [ESC]');
    close.type = 'button';
    close.addEventListener('click', () => this.closePanel());
    head.appendChild(close);
    panel.appendChild(head);
    const body = el('div', 'panel-body');
    panel.appendChild(body);
    wrap.appendChild(panel);
    root.appendChild(wrap);
    root.addEventListener('click', (e) => { if (e.target === root) this.closePanel(); }, { once: true });
    this.fillPanel(body);
  }

  fillPanel(body) {
    const g = this.game;
    const btn = (label, cls, onClick, disabled) => {
      const b = el('button', 'btn ' + (cls || ''), label);
      b.type = 'button';
      if (disabled) b.disabled = true;
      else b.addEventListener('click', () => { onClick(); });
      return b;
    };

    if (this.panel === 'inventory') {
      body.appendChild(el('div', 'meta', `Pockets ${g.inventory.length}/10 &nbsp;·&nbsp; Cash $${g.cash}`));
      const list = el('div', 'list');
      if (!g.inventory.length) list.appendChild(el('div', 'empty', 'Your pockets are empty.'));
      const counts = {};
      for (const id of g.inventory) counts[id] = (counts[id] || 0) + 1;
      for (const id in counts) {
        const it = ITEMS[id];
        const row = el('div', 'item-row');
        row.appendChild(this.icon(id, 34));
        const info = el('div', 'item-info');
        info.appendChild(el('div', 'item-name', `${it.name}${counts[id] > 1 ? ` <span class="count">x${counts[id]}</span>` : ''}`));
        info.appendChild(el('div', 'item-desc', it.desc));
        row.appendChild(info);
        const acts = el('div', 'item-acts');
        if (it.use) acts.appendChild(btn('USE', 'small primary', () => { g.useItem(id); this.renderPanel(); }));
        acts.appendChild(btn('STASH', 'small', () => { g.stashItem(id); this.renderPanel(); }, !g.inOwnCell()));
        acts.appendChild(btn('DROP', 'small ghost', () => { g.dropItem(id); this.renderPanel(); }));
        row.appendChild(acts);
        list.appendChild(row);
      }
      body.appendChild(list);
      body.appendChild(el('div', 'note',
        'Contraband (tools) in your desk can be found during cell searches at 10:00. Keep tools on you, or keep the desk clean.'));

    } else if (this.panel === 'craft') {
      body.appendChild(el('div', 'meta', 'Combine two items. Choose a recipe you have parts for.'));
      const list = el('div', 'list');
      for (const r of RECIPES) {
        const [a, b] = r.in;
        const haveA = g.countItem(a), haveB = g.countItem(b);
        const ok = a === b ? haveA >= 2 : (haveA >= 1 && haveB >= 1);
        const row = el('div', 'recipe');
        const parts = el('div', 'parts');
        parts.appendChild(this.icon(a, 30));
        parts.appendChild(el('span', 'plus', '+'));
        parts.appendChild(this.icon(b, 30));
        parts.appendChild(el('span', 'arrow', '→'));
        parts.appendChild(this.icon(r.out, 30));
        row.appendChild(parts);
        const info = el('div', 'item-info');
        info.appendChild(el('div', 'item-name', ITEMS[r.out].name));
        info.appendChild(el('div', 'item-desc', `${r.label}. ${ITEMS[r.out].desc}`));
        info.appendChild(el('div', 'item-desc dim', `Needs ${ITEMS[a].name}${a === b ? ' x2' : ' + ' + ITEMS[b].name}`));
        row.appendChild(info);
        row.appendChild(btn('CRAFT', 'small primary', () => {
          const res = g.craft(a, b);
          if (!res.ok) g.log(res.msg, 'bad');
          this.renderPanel();
        }, !ok));
        list.appendChild(row);
      }
      body.appendChild(list);

    } else if (this.panel === 'shop') {
      body.appendChild(el('div', 'meta', `Cash $${g.cash} <span class="dim">· commissary prices, no refunds</span>`));
      const list = el('div', 'list');
      for (const s of SHOP_STOCK) {
        const it = ITEMS[s.id];
        const row = el('div', 'item-row');
        row.appendChild(this.icon(s.id, 34));
        const info = el('div', 'item-info');
        info.appendChild(el('div', 'item-name', it.name));
        info.appendChild(el('div', 'item-desc', it.desc));
        row.appendChild(info);
        row.appendChild(el('div', 'price', '$' + s.price));
        row.appendChild(btn('BUY', 'small primary', () => { g.buy(s.id); this.renderPanel(); }, g.cash < s.price || g.inventory.length >= 10));
        list.appendChild(row);
      }
      body.appendChild(list);
      body.appendChild(el('div', 'note', 'Bolt cutters and lockpicks are not sold here. You will have to craft those, or find them.'));

    } else if (this.panel === 'stash') {
      body.appendChild(el('div', 'meta', 'Your desk drawer. Guards search cells at 10:00.'));
      const cols = el('div', 'cols');
      const left = el('div', 'col');
      left.appendChild(el('h3', null, 'POCKETS'));
      if (!g.inventory.length) left.appendChild(el('div', 'empty', 'Empty.'));
      const counts = {};
      for (const id of g.inventory) counts[id] = (counts[id] || 0) + 1;
      for (const id in counts) {
        const row = el('div', 'item-row slim');
        row.appendChild(this.icon(id, 26));
        row.appendChild(el('div', 'item-info', `${ITEMS[id].name}${counts[id] > 1 ? ' x' + counts[id] : ''}`));
        row.appendChild(btn('STASH', 'small', () => { g.stashItem(id); this.renderPanel(); }));
        left.appendChild(row);
      }
      const right = el('div', 'col');
      right.appendChild(el('h3', null, 'DESK DRAWER'));
      if (!g.stash.length) right.appendChild(el('div', 'empty', 'Empty.'));
      g.stash.forEach((id, i) => {
        const row = el('div', 'item-row slim');
        row.appendChild(this.icon(id, 26));
        row.appendChild(el('div', 'item-info', ITEMS[id].name));
        row.appendChild(btn('TAKE', 'small', () => { g.takeStashItem(i); this.renderPanel(); }));
        right.appendChild(row);
      });
      cols.appendChild(left);
      cols.appendChild(right);
      body.appendChild(cols);

    } else if (this.panel === 'help') {
      body.appendChild(el('div', 'help-grid', `
        <div>
          <h3>DAILY ROUTINE</h3>
          <table class="routine">
            <tr><td>06:30</td><td>Wake-up</td></tr>
            <tr><td>07:00</td><td>Roll Call — be inside your cell</td></tr>
            <tr><td>08:00</td><td>Breakfast</td></tr>
            <tr><td>09:00</td><td>Work period — earn cash at a station</td></tr>
            <tr><td>12:00</td><td>Lunch</td></tr>
            <tr><td>13:00</td><td>Free time — yard, canteen, plotting</td></tr>
            <tr><td>17:00</td><td>Dinner</td></tr>
            <tr><td>21:00</td><td>Lockdown — be in your cell</td></tr>
            <tr><td>21:30</td><td>Lights out (best time to move)</td></tr>
          </table>
        </div>
        <div>
          <h3>CONTROLS</h3>
          <table class="routine">
            <tr><td>WASD</td><td>Move</td></tr>
            <tr><td>E / SPACE</td><td>Interact, hold to dig or work</td></tr>
            <tr><td>I</td><td>Inventory</td></tr>
            <tr><td>C</td><td>Crafting</td></tr>
            <tr><td>H</td><td>This help</td></tr>
            <tr><td>V</td><td>Toggle guard vision cones</td></tr>
            <tr><td>TAB</td><td>Toggle the map</td></tr>
            <tr><td>M</td><td>Toggle sound</td></tr>
            <tr><td>ESC</td><td>Pause</td></tr>
          </table>
        </div>
        <div>
          <h3>ESCAPE ROUTES</h3>
          <ul class="tips">
            <li><strong>Tunnel:</strong> dig under your cell toilet. Needs a spoon or a crafted shovel. Slow, but guards rarely see inside a cell.</li>
            <li><strong>Fence:</strong> cut the yard fence after lights out. Needs bolt cutters (scrap metal + duct tape).</li>
            <li><strong>Vent:</strong> pry the workshop vent with a crowbar, then climb down with rope (two sheets).</li>
          </ul>
          <h3>RULES OF THE HOUSE</h3>
          <ul class="tips">
            <li>Miss roll call, or be caught digging or cutting: your <em>heat</em> rises. At 100 you are sent to solitary and searched.</li>
            <li>Contraband left in your desk is seized during the 10:00 cell search.</li>
            <li>Guards only react to what they can see: walls block their view, and their vision cones show exactly what they see.</li>
            <li>Cash comes from work shifts ($10 each station, 09:00-12:00) and starts at $25.</li>
            <li>Each morning brings a regime: fog shortens guard sight, overtime doubles pay, shakedowns mean a second cell search, heatwaves make you hungrier.</li>
          </ul>
        </div>
      `));

    } else if (this.panel === 'pause') {
      body.appendChild(el('div', 'meta', `Day ${g.day} · ${g.timeString()} · ${g.activity.name}`));
      const list = el('div', 'pause-list');
      list.appendChild(btn('RESUME', 'primary wide', () => this.closePanel()));
      list.appendChild(btn('SAVE NOW', 'wide', () => {
        this.opts.onSave && this.opts.onSave(true);
        this.renderPanel();
      }));
      list.appendChild(btn('TOGGLE VISION CONES', 'wide', () => {
        this.opts.onToggleCones && this.opts.onToggleCones();
        this.renderPanel();
      }));
      list.appendChild(btn(this.opts.isMuted && this.opts.isMuted() ? 'SOUND: OFF' : 'SOUND: ON', 'wide', () => {
        this.opts.onToggleSound && this.opts.onToggleSound();
        this.renderPanel();
      }));
      list.appendChild(btn('ABANDON SENTENCE (NEW GAME)', 'wide danger', () => {
        if (window.confirm('Start over from Day 1? Current progress will be lost.')) {
          this.closePanel();
          this.opts.onNewGame && this.opts.onNewGame();
        }
      }));
      body.appendChild(list);
      body.appendChild(el('div', 'note', 'Progress is saved automatically at the start of each day and when you close the tab.'));

    } else if (this.panel === 'stashdesk') {
      this.panel = 'stash';
      this.fillPanel(body);
    }
  }

  // ------------------------------------------------------------- per frame
  sync(dt) {
    const g = this.game;
    if (!this.introOpen && g.requestPanel) {
      const p = g.requestPanel;
      g.requestPanel = null;
      this.openPanel(p === 'stash' ? 'stash' : p);
    }

    $('#dayLabel').textContent = 'DAY ' + g.day;
    $('#clock').textContent = g.timeString();
    const regimeEl = $('#regimeLabel');
    if (regimeEl) {
      const show = g.regime && g.regime !== 'normal';
      regimeEl.classList.toggle('hidden', !show);
      if (show) regimeEl.textContent = 'REGIME: ' + g.regime.toUpperCase();
    }
    const act = g.activity;
    const until = Math.max(0, Math.floor(act.end - g.minutes));
    $('#activityLabel').textContent = act.name.toUpperCase();
    $('#activityTime').textContent = g.state === 'won' ? 'FREE' : `ends in ${Math.floor(until / 60)}h ${String(until % 60).padStart(2, '0')}m`;
    $('#cashLabel').textContent = '$' + g.cash;
    const jobEl = $('#jobLabel');
    if (jobEl && jobEl.textContent !== g.job.toUpperCase()) jobEl.textContent = g.job.toUpperCase();

    const setBar = (id, val, invert) => {
      const n = $(id);
      n.style.width = Math.max(0, Math.min(100, val)) + '%';
      n.parentElement.classList.toggle('low', invert ? val > 70 : val < 25);
    };
    setBar('#barHealth', g.health, false);
    setBar('#barEnergy', g.energy, false);
    setBar('#barHunger', g.hunger, false);
    setBar('#barHeat', g.heat, true);

    const obj = g.objective();
    if ($('#objectiveText').textContent !== obj) $('#objectiveText').textContent = obj;

    // prompt
    const prompt = $('#prompt');
    if (g.prompt && !g.paused && g.state === 'playing') {
      prompt.classList.remove('hidden');
      const p = g.prompt;
      let label = p.label;
      if (g.action && g.action.progress > 0) {
        label += ` — ${Math.floor(g.action.progress)}%`;
      }
      $('#promptText').textContent = label;
      $('#promptHint').textContent = p.enabled ? p.hint : p.hint;
      prompt.classList.toggle('blocked', !p.enabled);
      if (g.action) prompt.classList.add('working'); else prompt.classList.remove('working');
      $('#promptProgress').style.width = (g.action ? Math.min(100, g.action.progress) : (p.type === 'dig' ? g.digProgress : 0)) + '%';
      $('#promptProgressWrap').style.opacity = (g.action || (p.type === 'dig' && g.digProgress > 0)) ? 1 : 0;
    } else {
      prompt.classList.add('hidden');
    }

    // log
    const sig = g.messages.slice(-4).map(m => m.text + m.kind).join('|');
    if (sig !== this.logSig) {
      this.logSig = sig;
      const log = $('#log');
      log.innerHTML = '';
      for (const m of g.messages.slice(-4)) {
        log.appendChild(el('div', 'log-line ' + m.kind, m.text));
      }
    }

    // hotbar
    const invSig = g.inventory.join(',');
    if (invSig !== this.signature) {
      this.signature = invSig;
      const counts = {};
      for (const id of g.inventory) counts[id] = (counts[id] || 0) + 1;
      this.slotEls.forEach((slot, i) => {
        slot.innerHTML = '';
        const id = g.inventory[i];
        slot.classList.toggle('filled', !!id);
        if (id) {
          slot.appendChild(this.icon(id, 30));
          if (counts[id] > 1) slot.appendChild(el('span', 'slot-count', counts[id]));
        }
      });
    }

    if (this.panel && g.paused) {
      const sig2 = JSON.stringify([g.inventory, g.cash, g.stash]);
      if (sig2 !== this.panelSig) {
        this.panelSig = sig2;
        const body = document.querySelector('.panel-body');
        if (body) { body.innerHTML = ''; this.fillPanel(body); }
      }
    }
    if (!this.panel) this.panelSig = null;

    this.mapTimer = (this.mapTimer || 0) + dt;
    if (this.mapTimer > 0.2) {
      this.mapTimer = 0;
      this.drawMinimap();
    }

    // win
    if (g.state === 'won' && !this.winShown) {
      this.winShown = true;
      this.showWin();
    }
  }

  showWin() {
    const g = this.game;
    const names = {
      tunnel: 'TUNNEL RAT',
      fence: 'OVER THE WIRE',
      vent: 'OFF THE ROOF'
    };
    $('#winTitle').textContent = names[g.escapeType] || 'ESCAPED';
    $('#winText').textContent = g.escapeText || '';
    $('#winStats').innerHTML = `
      <div><span>Route</span><strong>${g.escapeType || '—'}</strong></div>
      <div><span>Days inside</span><strong>${g.day}</strong></div>
      <div><span>Times caught</span><strong>${g.stats.caught}</strong></div>
      <div><span>Work shifts</span><strong>${g.stats.shifts}</strong></div>
      <div><span>Meals eaten</span><strong>${g.stats.meals}</strong></div>
      <div><span>Cash left behind</span><strong>$${g.cash}</strong></div>`;
    $('#winscreen').classList.remove('hidden');
    this.game.paused = true;
  }
}
