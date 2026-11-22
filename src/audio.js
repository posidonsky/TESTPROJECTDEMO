// Tiny procedural sound engine: no audio files, everything synthesised.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.20;
        this.master.connect(this.ctx.destination);
      } catch (e) {
        this.ctx = null;
        return null;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.20;
  }

  tone({ freq = 440, dur = 0.12, type = 'square', gain = 0.5, slide = 0, delay = 0 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* audio is a nicety, never fatal */ }
  }

  noise({ dur = 0.15, gain = 0.25, freq = 900, q = 0.8, delay = 0 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      if (!this.noiseBuffer) {
        const len = Math.floor(ctx.sampleRate * 0.5);
        this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      const t0 = ctx.currentTime + delay;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(Math.max(0.001, gain), t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter).connect(g).connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  play(name) {
    if (this.muted) return;
    switch (name) {
      case 'ui':
        this.tone({ freq: 520, dur: 0.05, type: 'square', gain: 0.18 });
        break;
      case 'pickup':
        this.tone({ freq: 620, dur: 0.08, type: 'triangle', gain: 0.3 });
        this.tone({ freq: 880, dur: 0.1, type: 'triangle', gain: 0.26, delay: 0.07 });
        break;
      case 'buy':
        this.tone({ freq: 880, dur: 0.06, type: 'square', gain: 0.2 });
        this.tone({ freq: 1320, dur: 0.09, type: 'square', gain: 0.16, delay: 0.06 });
        break;
      case 'craft':
        this.noise({ dur: 0.08, gain: 0.16, freq: 1800, q: 1.5 });
        this.tone({ freq: 380, dur: 0.14, type: 'triangle', gain: 0.26 });
        break;
      case 'dig':
        this.noise({ dur: 0.1, gain: 0.15, freq: 420 + Math.random() * 260, q: 0.7 });
        break;
      case 'work':
        this.tone({ freq: 240, dur: 0.07, type: 'square', gain: 0.24 });
        this.tone({ freq: 320, dur: 0.09, type: 'square', gain: 0.2, delay: 0.08 });
        break;
      case 'eat':
        this.noise({ dur: 0.12, gain: 0.1, freq: 700, q: 2 });
        this.tone({ freq: 300, dur: 0.08, type: 'sine', gain: 0.18 });
        break;
      case 'sleep':
        this.tone({ freq: 300, dur: 0.5, type: 'sine', gain: 0.14, slide: -160 });
        break;
      case 'drink':
        this.noise({ dur: 0.16, gain: 0.1, freq: 1500, q: 3 });
        break;
      case 'caught':
        this.tone({ freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.3, slide: -80 });
        this.tone({ freq: 170, dur: 0.24, type: 'sawtooth', gain: 0.25, delay: 0.16, slide: -60 });
        break;
      case 'alert':
        this.tone({ freq: 720, dur: 0.09, type: 'square', gain: 0.2 });
        this.tone({ freq: 560, dur: 0.12, type: 'square', gain: 0.18, delay: 0.1 });
        break;
      case 'jail':
        this.noise({ dur: 0.5, gain: 0.2, freq: 220, q: 0.5 });
        this.tone({ freq: 90, dur: 0.7, type: 'sine', gain: 0.3 });
        break;
      case 'deny':
        this.tone({ freq: 160, dur: 0.14, type: 'square', gain: 0.2, slide: -40 });
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.24, type: 'triangle', gain: 0.26, delay: i * 0.13 });
        });
        break;
      default:
        break;
    }
  }
}
