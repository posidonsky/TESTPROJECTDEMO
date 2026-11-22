// IRONWOOD PENITENTIARY - entry point and main loop.
import { Game } from './game.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Sound } from './audio.js';

const SAVE_KEY = 'ironwood.save.v1';

const canvas = document.getElementById('game');
const input = new Input(window);
let game = new Game();
const renderer = new Renderer(canvas);
renderer.setWorld(game.world);
const sound = new Sound();
try { sound.setMuted(localStorage.getItem('ironwood.muted') === '1'); } catch (e) { /* ignore */ }

const hasSave = () => {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
};

function save(announce) {
  if (game.state === 'won') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.serialize()));
    if (announce) game.log('Game saved.', 'info');
  } catch (e) { /* storage may be unavailable */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    return game.restore(JSON.parse(raw));
  } catch (e) { return false; }
}

const ui = new UI(game, {
  hasSave,
  onNewGame: () => {
    startNewGame();
    sound.play('ui');
  },
  onContinue: () => {
    if (!load()) { startNewGame(); return; }
    sound.play('ui');
    game.paused = false;
    ui.introOpen = false;
    ui.winShown = game.state === 'won';
    ui.signature = '';
    ui.logSig = '';
    game.log('Sentence resumed.', 'info');
  },
  onSave: (announce) => save(announce),
  onToggleCones: () => { renderer.showCones = !renderer.showCones; },
  isMuted: () => sound.muted,
  onToggleSound: () => {
    sound.setMuted(!sound.muted);
    try { localStorage.setItem('ironwood.muted', sound.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!sound.muted) sound.play('ui');
    game.log(sound.muted ? 'Sound off.' : 'Sound on.', 'info');
  }
});

function startNewGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  game = new Game();
  game.paused = false;
  renderer.setWorld(game.world);
  ui.game = game;
  ui.invalidateMinimap();
  ui.winShown = false;
  ui.signature = '';
  ui.logSig = '';
  ui.closePanel();
  lastDay = game.day;
}

game.paused = true;
ui.showIntro();

window.addEventListener('resize', () => renderer.resize());
window.addEventListener('beforeunload', () => { if (game.state === 'playing') save(false); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') save(false);
});

let last = performance.now();
let lastDay = game.day;
let digAcc = 0;
let digSoundTimer = 0;
let autoSaveTimer = 0;

function togglePanel(name) {
  if (ui.panel === name) ui.closePanel();
  else ui.openPanel(name);
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  if (ui.introOpen) {
    if (input.pressed('confirm') || input.pressed('interact')) {
      document.getElementById('introNew').click();
    }
  } else if (!ui.winShown) {
    if (input.pressed('pause')) {
      if (ui.panel) ui.closePanel();
      else if (game.state === 'playing') ui.openPanel('pause');
    } else if (input.pressed('inventory')) {
      togglePanel('inventory');
    } else if (input.pressed('craft')) {
      togglePanel('craft');
    } else if (input.pressed('help')) {
      togglePanel('help');
    } else if (input.pressed('mute')) {
      sound.setMuted(!sound.muted);
      try { localStorage.setItem('ironwood.muted', sound.muted ? '1' : '0'); } catch (e) { /* ignore */ }
      game.log(sound.muted ? 'Sound off.' : 'Sound on.', 'info');
    } else if (input.pressed('map')) {
      const m = document.getElementById('minimap');
      m.classList.toggle('hidden');
      if (!m.classList.contains('hidden')) ui.drawMinimap();
    } else if (input.pressed('cones')) {
      renderer.showCones = !renderer.showCones;
      game.log(renderer.showCones ? 'Vision cones on.' : 'Vision cones off.', 'info');
    }

    if (!ui.panel && game.state === 'playing') {
      if (input.pressed('interact')) game.pressInteract();
    }
  }

  game.update(dt, input);

  // dirt particles while digging
  if (game.action && game.action.type === 'dig' && !game.paused) {
    digAcc += dt;
    while (digAcc > 0.045) {
      digAcc -= 0.045;
      renderer.spawnDirt(
        game.player.x + (Math.random() - 0.5) * 14,
        game.player.y - 2 + (Math.random() - 0.5) * 6
      );
    }
  }

  if (game.events && game.events.length) {
    for (const type of game.events) sound.play(type);
    game.events.length = 0;
  }
  if (game.action && game.action.type === 'dig' && !game.paused) {
    digSoundTimer += dt;
    if (digSoundTimer > 0.42) { digSoundTimer = 0; sound.play('dig'); }
  }

  renderer.draw(game, dt);
  ui.sync(dt);

  if (game.state === 'playing' && !game.paused) {
    autoSaveTimer += dt;
    if (game.day !== lastDay) {
      lastDay = game.day;
      save(false);
    }
    if (autoSaveTimer > 30) {
      autoSaveTimer = 0;
      save(false);
    }
  }
  if (game.state === 'won' && !game.savedWin) {
    game.savedWin = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// expose for debugging in the console
window.Ironwood = { get game() { return game; }, renderer, ui, save, sound };
