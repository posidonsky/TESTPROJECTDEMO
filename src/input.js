// Keyboard input with per-frame edge detection.
const MAP = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE', 'Space'],
  inventory: ['KeyI'],
  craft: ['KeyC'],
  help: ['KeyH'],
  pause: ['Escape'],
  confirm: ['Enter'],
  cones: ['KeyV'],
  mute: ['KeyM'],
  map: ['Tab']
};

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.edge = new Set();
    this.anyKey = false;
    target.addEventListener('keydown', (e) => {
      if (!this.down.has(e.code)) this.edge.add(e.code);
      this.down.add(e.code);
      this.anyKey = true;
      const blocked = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
      if (blocked.includes(e.code)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());
  }

  action(name) {
    const codes = MAP[name] || [];
    return codes.some(c => this.down.has(c));
  }

  pressed(name) {
    const codes = MAP[name] || [];
    return codes.some(c => this.edge.has(c));
  }

  endFrame() {
    this.edge.clear();
    this.anyKey = false;
  }
}
