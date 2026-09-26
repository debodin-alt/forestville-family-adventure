// Original procedural audio: every sound is synthesised live with WebAudio.
// No sample files, no licensing questions. Starts only after a user gesture.

class AudioSystem {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false;
    this.zone = null; this.beds = {}; this.nextCall = 0;
    this.lastStep = 0;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    // one shared noise buffer
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // brown noise for rumbles and surf
    this.brown = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const b = this.brown.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    if (this.pendingZone) this.setZone(this.pendingZone);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  get ok() { return !!this.ctx && !this.muted && this.ctx.state === 'running'; }

  // ---------- building blocks ----------
  tone({ f = 440, f2 = null, type = 'sine', t = 0, dur = 0.15, vol = 0.1, attack = 0.005, dest = null }) {
    const c = this.ctx, now = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(dest || this.master);
    o.start(now); o.stop(now + dur + 0.02);
  }

  burst({ freq = 1000, q = 1, dur = 0.08, vol = 0.1, t = 0, type = 'bandpass', rate = 1, brown = false }) {
    const c = this.ctx, now = c.currentTime + t;
    const s = c.createBufferSource(); s.buffer = brown ? this.brown : this.noise; s.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(now, Math.random() * 1.5); s.stop(now + dur + 0.02);
  }

  // ---------- game sounds ----------
  step(surface) {
    if (!this.ok) return;
    const v = 0.85 + Math.random() * 0.3;
    const S = {
      grass: { freq: 1400, q: 0.8, dur: 0.07, vol: 0.05 },
      leaves: { freq: 2600, q: 0.6, dur: 0.1, vol: 0.06 },
      gravel: { freq: 3200, q: 1.2, dur: 0.08, vol: 0.07 },
      hard: { freq: 900, q: 2.5, dur: 0.05, vol: 0.06 },
      wood: { freq: 380, q: 4, dur: 0.09, vol: 0.12 },
      sand: { freq: 700, q: 0.7, dur: 0.11, vol: 0.05 },
      soft: { freq: 500, q: 1.5, dur: 0.06, vol: 0.05 },
      rock: { freq: 1200, q: 3, dur: 0.05, vol: 0.06 },
      water: { freq: 1800, q: 0.5, dur: 0.16, vol: 0.09 },
      swim: { freq: 900, q: 0.4, dur: 0.3, vol: 0.08 },
    }[surface] || { freq: 1400, q: 0.8, dur: 0.07, vol: 0.05 };
    this.burst({ ...S, freq: S.freq * v, vol: S.vol * v });
    if (surface === 'wood') this.tone({ f: 150 * v, type: 'triangle', dur: 0.06, vol: 0.05 });
  }

  blip(pitch = 300) {
    if (!this.ok) return;
    this.tone({ f: pitch * (0.92 + Math.random() * 0.16), type: 'triangle', dur: 0.05, vol: 0.05 });
  }

  pickup() {
    if (!this.ok) return;
    [784, 988, 1175, 1568].forEach((f, i) => this.tone({ f, type: 'triangle', t: i * 0.07, dur: 0.3, vol: 0.09 }));
    this.tone({ f: 2637, type: 'sine', t: 0.3, dur: 0.5, vol: 0.04 });
  }

  item() {
    if (!this.ok) return;
    [660, 880].forEach((f, i) => this.tone({ f, type: 'triangle', t: i * 0.08, dur: 0.18, vol: 0.08 }));
  }

  quest() {
    if (!this.ok) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    const times = [0, 0.12, 0.24, 0.36, 0.56, 0.68, 0.8];
    notes.forEach((f, i) => { this.tone({ f, type: 'triangle', t: times[i], dur: 0.35, vol: 0.09 }); this.tone({ f: f / 2, type: 'sine', t: times[i], dur: 0.35, vol: 0.05 }); });
  }

  prompt() { if (this.ok) this.tone({ f: 1320, type: 'sine', dur: 0.05, vol: 0.025 }); }
  tap() { if (this.ok) this.tone({ f: 520, f2: 420, type: 'triangle', dur: 0.06, vol: 0.05 }); }

  bus() {
    if (!this.ok) return;
    this.tone({ f: 1046, type: 'sine', dur: 0.25, vol: 0.08 }); this.tone({ f: 1046, type: 'sine', t: 0.28, dur: 0.25, vol: 0.08 });
    this.burst({ freq: 300, q: 0.5, dur: 1.4, vol: 0.12, t: 0.5, type: 'lowpass', brown: true });
  }

  // ---------- water + fishing ----------
  splash(big) {
    if (!this.ok) return;
    this.burst({ freq: big ? 900 : 1500, q: 0.5, dur: big ? 0.5 : 0.25, vol: big ? 0.16 : 0.1 });
    this.tone({ f: 500, f2: 180, type: 'sine', dur: 0.18, vol: 0.05 });
  }
  cast() { if (this.ok) { this.burst({ freq: 2500, q: 0.8, dur: 0.35, vol: 0.06 }); this.tone({ f: 900, f2: 300, type: 'sine', dur: 0.3, vol: 0.03 }); } }
  plop() { if (this.ok) { this.tone({ f: 700, f2: 220, type: 'sine', dur: 0.14, vol: 0.09 }); this.burst({ freq: 1200, q: 1, dur: 0.12, vol: 0.05, t: 0.03 }); } }
  nibble() { if (this.ok) this.tone({ f: 900, f2: 700, type: 'sine', dur: 0.06, vol: 0.05 }); }
  bite() { if (this.ok) { this.burst({ freq: 1000, q: 0.6, dur: 0.35, vol: 0.14 }); this.tone({ f: 1320, type: 'square', dur: 0.08, vol: 0.05 }); this.tone({ f: 1760, type: 'square', t: 0.09, dur: 0.1, vol: 0.05 }); } }
  reel() { if (this.ok) for (let i = 0; i < 8; i++) this.burst({ freq: 3800, q: 6, dur: 0.02, vol: 0.05, t: i * 0.045 }); }
  caught(rare) {
    if (!this.ok) return;
    const n = rare ? [659, 784, 988, 1319, 1568] : [587, 740, 880, 1175];
    n.forEach((f, i) => { this.tone({ f, type: 'triangle', t: i * 0.08, dur: 0.3, vol: 0.09 }); this.tone({ f: f * 2, type: 'sine', t: i * 0.08, dur: 0.2, vol: 0.025 }); });
  }
  gotAway() { if (this.ok) { this.tone({ f: 440, f2: 330, type: 'triangle', dur: 0.25, vol: 0.07 }); this.tone({ f: 330, f2: 220, type: 'triangle', t: 0.25, dur: 0.35, vol: 0.07 }); } }
  spot() { if (this.ok) [1047, 1319, 1568].forEach((f, i) => this.tone({ f, type: 'sine', t: i * 0.1, dur: 0.6, vol: 0.06 })); }

  // ---------- UI ----------
  creak() { if (this.ok) this.tone({ f: 180, f2: 260, type: 'sawtooth', dur: 0.4, vol: 0.025 }); }
  whoosh(up = true) { if (this.ok) this.burst({ freq: up ? 1800 : 900, q: 0.7, dur: 0.22, vol: 0.05 }); }
  pop() { if (this.ok) { this.tone({ f: 600, f2: 1100, type: 'sine', dur: 0.09, vol: 0.08 }); } }
  horn() { if (this.ok) { this.tone({ f: 146, type: 'sawtooth', dur: 1.2, vol: 0.05, attack: 0.08 }); this.tone({ f: 220, type: 'sawtooth', dur: 1.2, vol: 0.03, attack: 0.08 }); } }
  sparkle() { if (this.ok) [2093, 2637, 3136].forEach((f, i) => this.tone({ f, type: 'sine', t: i * 0.05, dur: 0.25, vol: 0.025 })); }

  quack() { if (this.ok) { this.tone({ f: 380, f2: 300, type: 'sawtooth', dur: 0.12, vol: 0.05 }); this.tone({ f: 360, f2: 290, type: 'sawtooth', t: 0.16, dur: 0.1, vol: 0.04 }); } }
  honk() { if (this.ok) { this.tone({ f: 440, f2: 330, type: 'sawtooth', dur: 0.14, vol: 0.06 }); this.tone({ f: 420, f2: 320, type: 'sawtooth', t: 0.17, dur: 0.14, vol: 0.06 }); } }
  camera() { if (this.ok) { this.burst({ freq: 3000, q: 1, dur: 0.05, vol: 0.12 }); this.burst({ freq: 1800, q: 1, dur: 0.08, vol: 0.1, t: 0.07 }); } }

  // ---------- birds (called by the ambience scheduler or near wildlife) ----------
  bird(kind) {
    if (!this.ok) return;
    const c = this.ctx;
    if (kind === 'kookaburra') {
      // rolling laugh: rising, chattering notes
      for (let i = 0; i < 14; i++) this.tone({ f: 500 + Math.sin(i * 0.7) * 180 + i * 25, f2: 700 + i * 20, type: 'square', t: i * 0.09, dur: 0.08, vol: 0.02 });
    } else if (kind === 'bellbird') {
      this.tone({ f: 2900 + Math.random() * 300, type: 'sine', dur: 0.25, vol: 0.03 });
    } else if (kind === 'whipbird') {
      this.tone({ f: 1400, f2: 3200, type: 'sine', dur: 0.9, vol: 0.03 });
      this.tone({ f: 4200, f2: 2200, type: 'sine', t: 0.95, dur: 0.08, vol: 0.04 });
    } else if (kind === 'magpie') {
      [900, 1200, 1050, 1500, 1300].forEach((f, i) => this.tone({ f, f2: f * (i % 2 ? 1.2 : 0.85), type: 'sine', t: i * 0.14, dur: 0.16, vol: 0.025 }));
    } else if (kind === 'cockatoo') {
      this.burst({ freq: 2200, q: 3, dur: 0.35, vol: 0.05 }); this.tone({ f: 1100, f2: 900, type: 'sawtooth', dur: 0.35, vol: 0.015 });
    } else if (kind === 'lorikeet') {
      for (let i = 0; i < 5; i++) this.tone({ f: 3000 + Math.random() * 1200, type: 'square', t: i * 0.06, dur: 0.04, vol: 0.012 });
    } else if (kind === 'gull') {
      this.tone({ f: 1500, f2: 900, type: 'sawtooth', dur: 0.35, vol: 0.02 }); this.tone({ f: 1400, f2: 850, type: 'sawtooth', t: 0.4, dur: 0.3, vol: 0.018 });
    } else if (kind === 'car') {
      this.burst({ freq: 400, q: 0.7, dur: 1.8, vol: 0.04, type: 'lowpass', brown: true });
    }
  }

  // ---------- ambience beds ----------
  makeBed(zone) {
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.0001; g.connect(this.master);
    const src = c.createBufferSource(); src.loop = true;
    const f = c.createBiquadFilter();
    if (zone === 'bush') { src.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.4; }
    else if (zone === 'beach') { src.buffer = this.brown; f.type = 'lowpass'; f.frequency.value = 900; }
    else if (zone === 'village') { src.buffer = this.brown; f.type = 'lowpass'; f.frequency.value = 260; }
    else { src.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.5; }
    src.connect(f);
    const level = c.createGain(); level.gain.value = { bush: 0.035, beach: 0.3, village: 0.25, suburb: 0.018 }[zone];
    f.connect(level).connect(g);
    if (zone === 'beach') { // slow swell like waves arriving
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.12; lg.gain.value = 0.22;
      lfo.connect(lg).connect(level.gain); lfo.start();
    }
    src.start();
    return { g };
  }

  setZone(zone) {
    if (!this.ctx) { this.pendingZone = zone; return; }
    if (zone === this.zone) return;
    this.zone = zone;
    for (const [z, bed] of Object.entries(this.beds)) bed.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8);
    if (!this.beds[zone]) this.beds[zone] = this.makeBed(zone);
    this.beds[zone].g.gain.setTargetAtTime(1, this.ctx.currentTime, 0.8);
  }

  // Called every frame; schedules occasional calls for the current zone.
  tick(now) {
    if (!this.ok || now < this.nextCall) return;
    const z = this.zone;
    const pick = a => a[(Math.random() * a.length) | 0];
    if (z === 'bush') this.bird(pick(['bellbird', 'bellbird', 'whipbird', 'magpie', 'kookaburra', 'lorikeet']));
    else if (z === 'beach') this.bird(pick(['gull', 'gull', 'gull']));
    else if (z === 'village') this.bird(pick(['car', 'magpie', 'car', 'lorikeet']));
    else if (z === 'suburb') this.bird(pick(['magpie', 'lorikeet', 'cockatoo', 'bellbird']));
    this.nextCall = now + 2500 + Math.random() * 5000;
  }
}

export const audio = new AudioSystem();
