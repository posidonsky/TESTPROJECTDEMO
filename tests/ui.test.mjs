// Browser-layer smoke test: runs the real UI + renderer against a DOM shim
// with a stub 2D context. Requires `npm install` (jsdom is a dev dependency).
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

let pass = 0;
const failures = [];
let lastCheck = 'boot';
const ok = (cond, label, extra) => {
  lastCheck = label;
  if (cond) { pass++; return; }
  failures.push(label + (extra ? ' :: ' + extra : ''));
};
process.on('exit', (code) => {
  if (failures.length || errors.length) console.log('stopped after check:', lastCheck, 'exit', code);
});

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const domErrors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => domErrors.push(e));
const dom = new JSDOM(html, {
  url: 'http://localhost:8000/',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const { document } = window;

// ---- stub 2D canvas -------------------------------------------------------
function makeCtx() {
  const grad = { addColorStop() {} };
  return {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    font: '10px monospace', textAlign: 'left', textBaseline: 'alphabetic',
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false,
    fillRect() {}, clearRect() {}, strokeRect() {}, rect() {}, roundRect() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
    fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, scale() {},
    rotate() {}, setTransform() {}, resetTransform() {}, clip() {},
    drawImage() {}, fillText() {}, strokeText() {}, putImageData() {},
    measureText(t) { return { width: String(t).length * 6 }; },
    createRadialGradient() { return grad; },
    createLinearGradient() { return grad; },
    createPattern() { return null; },
    getImageData() { return { data: new Uint8ClampedArray(4) }; }
  };
}
window.HTMLCanvasElement.prototype.getContext = function () {
  if (!this.__ctx) { this.__ctx = makeCtx(); this.__ctx.canvas = this; }
  return this.__ctx;
};

// ---- globals main.js expects ---------------------------------------------
let now = 1000;
globalThis.window = window;
globalThis.document = document;
globalThis.localStorage = window.localStorage;
globalThis.KeyboardEvent = window.KeyboardEvent;
globalThis.performance = { now: () => now };
let pending = null;
globalThis.requestAnimationFrame = (cb) => { pending = cb; return 1; };
globalThis.cancelAnimationFrame = () => {};
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.devicePixelRatio = 1;
Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
window.confirm = () => true;

function runFrames(n, dt = 16.7) {
  for (let i = 0; i < n; i++) {
    const cb = pending;
    if (!cb) throw new Error('no animation frame scheduled');
    pending = null;
    now += dt;
    cb(now);
  }
}

function key(type, code) {
  window.dispatchEvent(new window.KeyboardEvent(type, { code, bubbles: true }));
}

const errors = [];
process.on('uncaughtException', (e) => { errors.push(e); });
process.on('unhandledRejection', (e) => { console.log('REJECTION', e && e.stack); process.exitCode = 1; });

await import('../src/main.js');
const app = window.Ironwood;
ok(!!app, 'main.js boots and exposes app');
runFrames(3);
ok(!document.getElementById('intro').classList.contains('hidden'), 'intro overlay is shown at boot');
ok(app.game.paused === true, 'game waits on the intro');

// start a new sentence
document.getElementById('introNew').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
runFrames(5);
ok(app.game.state === 'playing' && app.game.paused === false, 'new game starts unpaused');
ok(document.getElementById('intro').classList.contains('hidden'), 'intro hides on start');
ok(/\d\d:\d\d/.test(document.getElementById('clock').textContent), 'clock renders', document.getElementById('clock').textContent);
ok(document.getElementById('cashLabel').textContent.startsWith('$'), 'cash renders');
ok(document.getElementById('objectiveText').textContent.length > 3, 'objective renders');
ok(document.querySelectorAll('#hotbar .slot').length === 10, 'hotbar has 10 slots');

// walking with the keyboard
const x0 = app.game.player.x;
key('keydown', 'KeyD');
runFrames(45);
key('keyup', 'KeyD');
runFrames(2);
ok(app.game.player.x > x0 + 10, 'keyboard moves the player', `${x0} -> ${app.game.player.x}`);

// panels
key('keydown', 'KeyI');
key('keyup', 'KeyI');
runFrames(2);
ok(!document.getElementById('modalRoot').classList.contains('hidden'), 'inventory panel opens');
ok(document.querySelector('.panel-head h2').textContent === 'INVENTORY', 'inventory title correct');
key('keydown', 'Escape');
key('keyup', 'Escape');
runFrames(2);
ok(document.getElementById('modalRoot').classList.contains('hidden'), 'escape closes the panel');
ok(app.game.paused === false, 'closing the panel unpauses');

key('keydown', 'KeyC');
key('keyup', 'KeyC');
runFrames(2);
ok(document.querySelector('.panel-head h2').textContent === 'WORKBENCH', 'craft panel opens');
ok(document.querySelectorAll('.recipe').length >= 4, 'all recipes listed');
key('keydown', 'Escape');
key('keyup', 'Escape');
runFrames(1);

key('keydown', 'KeyH');
key('keyup', 'KeyH');
runFrames(2);
ok(document.querySelector('.panel-head h2').textContent === 'PRISON REGULATIONS', 'help panel opens');
key('keydown', 'Escape');
key('keyup', 'Escape');
runFrames(1);

// shop / stash / pause panels render without throwing
app.ui.openPanel('shop');
ok(document.querySelectorAll('.panel-shop .item-row').length >= 5, 'shop lists stock');
document.querySelector('.panel-shop .btn.ghost').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
runFrames(1);
app.game.inventory = ['sheet', 'sheet', 'spoon', 'metal'];
app.ui.openPanel('craft');
runFrames(1);
const craftBtns = [...document.querySelectorAll('.panel-craft .recipe .btn')].filter(b => !b.disabled);
ok(craftBtns.length >= 2, 'craftable recipes enable their buttons', String(craftBtns.length));
craftBtns[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
runFrames(1);
ok(app.game.inventory.includes('rope') || app.game.inventory.includes('shovel'), 'clicking craft consumes ingredients');
key('keydown', 'Escape');
key('keyup', 'Escape');
runFrames(1);

app.game.inventory = ['sheet'];
app.ui.openPanel('stash');
ok(document.querySelectorAll('.panel-stash .col').length === 2, 'desk panel has two columns');
key('keydown', 'Escape');
key('keyup', 'Escape');
runFrames(1);

app.ui.openPanel('pause');
ok(document.querySelectorAll('.pause-list .btn').length >= 4, 'pause menu actions present');
document.querySelector('.pause-list .btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
runFrames(1);
ok(app.game.paused === false, 'resume from pause');

// log and prompt render
app.game.log('test message', 'good');
runFrames(2);
ok(document.querySelectorAll('#log .log-line').length > 0, 'message log renders');

// prompt render near the toilet
const { TILE } = await import('../src/world.js');
const toilet = app.game.world.objects.find(o => o.type === 'toilet' && o.own);
app.game.player.x = toilet.x * TILE + 8;
app.game.player.y = (toilet.y - 1) * TILE + 8;
app.game.inventory = ['spoon'];
runFrames(3);
ok(!document.getElementById('prompt').classList.contains('hidden'), 'interaction prompt shows near the toilet');
ok(document.getElementById('promptText').textContent.toLowerCase().includes('dig'), 'prompt mentions digging', document.getElementById('promptText').textContent);

// hold E to dig through the HUD path
key('keydown', 'KeyE');
runFrames(40);
const digging = app.game.digProgress;
key('keyup', 'KeyE');
runFrames(2);
ok(digging > 0, 'holding E digs through the input layer', String(digging));

// save / load
app.save(false);
ok(!!window.localStorage.getItem('ironwood.save.v1'), 'game saves to localStorage');

// win screen
app.game.state = 'won';
app.game.escapeType = 'fence';
app.game.escapeText = 'You are through the wire.';
app.ui.sync(0.016);
ok(!document.getElementById('winscreen').classList.contains('hidden'), 'win screen appears');
ok(document.getElementById('winTitle').textContent === 'OVER THE WIRE', 'win title matches route');
document.getElementById('winAgain').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
runFrames(2);
ok(app.game.state === 'playing' && app.game.day === 1, 'new game after winning resets to day 1');

// resize path
Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
window.dispatchEvent(new window.Event('resize'));
runFrames(2);
ok(app.renderer.vw === 900, 'renderer follows resize');

ok(errors.length === 0, 'no uncaught exceptions during UI run', errors.map(e => e.message).join('; '));
ok(domErrors.length === 0, 'no DOM listener errors during UI run', domErrors.map(e => e.message).join('; '));

console.log(`\n${pass} UI checks passed`);
if (failures.length) {
  console.log(`\n${failures.length} FAILURES:`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
} else {
  console.log('All UI checks passed.');
}
