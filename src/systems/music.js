// Original background music, sequenced live with WebAudio.
// Three short loops (Forestville, Manly, Harbour) plus a calm underwater pad.
// Every melody here was written for this game.

import { audio } from './audio.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = n => { const m = /^([A-G][#b]?)(\d)$/.exec(n); return m ? 12 * (+m[2] + 1) + NOTE[m[1]] : null; };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const bars = s => s.trim().split('|').map(b => b.trim().split(/\s+/).map(t => (t === '-' ? null : midi(t))));
const CHORD = {
  G: ['G3', 'B3', 'D4'], Em: ['E3', 'G3', 'B3'], C: ['C3', 'E3', 'G3'], D: ['D3', 'F#3', 'A3'], Am: ['A2', 'C3', 'E3'], Bm: ['B2', 'D3', 'F#3'],
  A: ['A2', 'C#3', 'E3'], E: ['E2', 'G#2', 'B2'], 'F#m': ['F#2', 'A2', 'C#3'], F: ['F2', 'A2', 'C3'], Dm: ['D3', 'F3', 'A3'], Bb: ['Bb2', 'D3', 'F3'], Gm: ['G2', 'Bb2', 'D3'],
};

const THEMES = {
  forestville: {
    bpm: 96, lead: 'marimba', swing: 0.06,
    chords: 'G Em C D G Em Am D C D Bm Em C D G G',
    melody: bars(`
      B4 - D5 - E5 D5 B4 - | G4 - B4 - A4 - G4 - | E4 - G4 A4 - G4 E4 - | D4 - F#4 - A4 - - - |
      B4 - D5 - G5 - E5 D5 | B4 - - G4 A4 B4 - - | C5 - B4 A4 - G4 E4 - | F#4 - A4 - D5 - - - |
      E5 - D5 - C5 - G4 - | F#4 - A4 - D5 - C5 - | B4 - A4 - F#4 - D4 - | E4 - G4 - B4 - - - |
      C5 - E5 - D5 C5 B4 - | A4 - D5 - F#4 A4 - - | G4 B4 D5 - B4 - G4 - | - - - - - - - -`),
  },
  manly: {
    bpm: 84, lead: 'pluck', swing: 0.1, shaker: true,
    chords: 'D Bm G A D Bm G A G A F#m Bm G A D D',
    melody: bars(`
      F#4 - A4 - - B4 A4 - | F#4 - D4 - - - - - | G4 - B4 - D5 - B4 - | A4 - - - E4 - - - |
      F#4 - A4 - D5 - E5 - | F#5 - E5 - D5 - B4 - | B4 - A4 - G4 - E4 - | A4 - - - - - - - |
      D5 - - B4 - - G4 - | C#5 - - A4 - - E4 - | F#4 - A4 - C#5 - A4 - | B4 - - - D5 - - - |
      D5 - B4 - G4 - B4 - | C#5 - E5 - A4 - - - | D5 - A4 - F#4 - A4 - | D4 - - - - - - -`),
  },
  harbour: {
    bpm: 104, lead: 'keys', swing: 0.04, brush: true,
    chords: 'F Dm Bb C F Am Bb C Bb C Am Dm Gm C F F',
    melody: bars(`
      A4 - C5 - F5 - C5 - | D5 - A4 - F4 - A4 - | D5 - C5 - Bb4 - F4 - | E4 - G4 - C5 - - - |
      F5 - E5 - D5 - C5 - | C5 - A4 - E4 - A4 - | Bb4 - D5 - F5 - D5 - | C5 - - - G4 - - - |
      F4 - Bb4 - D5 - - - | E4 - G4 - C5 - - - | A4 - C5 - E5 - C5 - | D5 - - - A4 - - - |
      G4 - Bb4 - D5 - Bb4 - | C5 - E5 - G5 - E5 - | F5 - C5 - A4 - C5 - | F4 - - - - - - -`),
  },
  race: {
    bpm: 132, lead: 'keys', swing: 0, shaker: true, brush: true,
    chords: 'Am F C G Am F C E Am F C G F G Am Am',
    melody: bars(`
      A4 C5 E5 A5 G5 E5 C5 E5 | F4 A4 C5 F5 E5 C5 A4 C5 | E4 G4 C5 E5 D5 C5 G4 C5 | D4 G4 B4 D5 B4 G4 D5 B4 |
      A4 - E5 - A5 - G5 E5 | F5 - C5 - A4 - C5 - | E5 - G5 - E5 - C5 - | E5 - G#4 - B4 - E5 - |
      A5 - - - E5 - C5 - | F5 - - - C5 - A4 - | G5 - - - E5 - C5 - | D5 - B4 - G4 - D5 - |
      C5 - A4 - F4 - A4 - | B4 - D5 - G5 - B5 - | A5 - E5 - C5 - E5 - | A5 - - - - - - -`),
  },
  underwater: {
    bpm: 60, lead: 'bell', pad: true, sparse: true,
    chords: 'D G D G',
    melody: bars(`
      A5 - - - - - F#5 - | - - - - D5 - - - | B5 - - - - - A5 - | - - - - E5 - - -`),
  },
};

class Music {
  constructor() { this.theme = null; this.enabled = true; this.step = 0; this.timer = null; this.duck = 1; }

  ensure() {
    const c = audio.ctx;
    if (!c || this.out) return !!c;
    this.out = c.createGain(); this.out.gain.value = 0;
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 5200;
    this.out.connect(this.filter).connect(audio.master);
    // soft room echo
    const d = c.createDelay(); d.delayTime.value = 0.28;
    const fb = c.createGain(); fb.gain.value = 0.22;
    const wet = c.createGain(); wet.gain.value = 0.18;
    this.out.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(this.filter);
    return true;
  }

  setEnabled(on) { this.enabled = on; this.apply(); }
  setDuck(on) { this.duck = on ? 0.45 : 1; this.apply(); }
  apply() {
    if (!this.out) return;
    const target = this.enabled && this.theme ? 0.2 * this.duck : 0;
    this.out.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.4);
  }

  play(name) {
    if (!THEMES[name] || name === this.pending) return;
    this.pending = name;
    if (!this.ensure()) return;         // audio not unlocked yet; retried on next call
    if (this.theme === name) return;
    const start = () => {
      this.theme = name; this.t = THEMES[name]; this.step = 0;
      this.next = audio.ctx.currentTime + 0.1;
      this.apply();
      if (!this.timer) this.timer = setInterval(() => this.schedule(), 40);
    };
    if (this.theme) { this.out.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.25); setTimeout(start, 700); }
    else start();
  }

  retry() { const p = this.pending; this.pending = null; if (p) this.play(p); }

  schedule() {
    const c = audio.ctx; if (!c || !this.t || c.state !== 'running') return;
    const t = this.t, spb = 60 / t.bpm / 2; // eighth notes
    const chords = t.chords.split(' ');
    const total = t.melody.length * 8;
    while (this.next < c.currentTime + 0.2) {
      const s = this.step % total, bar = Math.floor(s / 8), beat = s % 8;
      const when = this.next + (beat % 2 ? spb * t.swing : 0);
      const ch = CHORD[chords[bar % chords.length]].map(midi);
      const m = t.melody[bar][beat];
      if (m) this.voice(t.lead, hz(m), when, spb * (t.sparse ? 6 : 1.8), t.sparse ? 0.09 : 0.11);
      if (!t.sparse) {
        if (beat === 0) this.voice('bass', hz(ch[0] - 12), when, spb * 3, 0.16);
        if (beat === 4) this.voice('bass', hz(ch[2] - 12), when, spb * 3, 0.12);
        if (beat === 2 || beat === 6) ch.forEach((n, i) => this.voice('strum', hz(n + 12), when + i * 0.018, spb * 1.5, 0.035));
        if (t.shaker && beat % 2 === 1) this.noise(when, 0.04, 6000, 0.03);
        if (t.brush && (beat === 2 || beat === 6)) this.noise(when, 0.09, 2500, 0.04);
      }
      if (t.pad && beat === 0) ch.forEach(n => this.voice('pad', hz(n + 12), when, spb * 8, 0.035));
      this.next += spb; this.step++;
    }
  }

  voice(kind, f, when, dur, vol) {
    const c = audio.ctx, g = c.createGain(), o = c.createOscillator();
    let atk = 0.005, rel = dur;
    if (kind === 'marimba') { o.type = 'sine'; rel = 0.35; const o2 = c.createOscillator(), g2 = c.createGain(); o2.type = 'sine'; o2.frequency.value = f * 4; g2.gain.setValueAtTime(vol * 0.25, when); g2.gain.exponentialRampToValueAtTime(0.0001, when + 0.08); o2.connect(g2).connect(this.out); o2.start(when); o2.stop(when + 0.1); }
    else if (kind === 'pluck') { o.type = 'triangle'; rel = 0.5; }
    else if (kind === 'keys') { o.type = 'triangle'; rel = 0.45; }
    else if (kind === 'bell') { o.type = 'sine'; rel = 2.2; atk = 0.01; }
    else if (kind === 'bass') { o.type = 'sine'; rel = dur; atk = 0.01; }
    else if (kind === 'strum') { o.type = 'triangle'; rel = 0.3; }
    else if (kind === 'pad') { o.type = 'sawtooth'; atk = 0.8; rel = dur; }
    o.frequency.value = f;
    if (kind === 'pad') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; o.connect(lp).connect(g); o.detune.value = (Math.random() - 0.5) * 12; }
    else o.connect(g);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, when + atk + rel);
    g.connect(this.out);
    o.start(when); o.stop(when + atk + rel + 0.05);
  }

  noise(when, dur, freq, vol) {
    const c = audio.ctx, s = c.createBufferSource(); s.buffer = audio.noise;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f).connect(g).connect(this.out); s.start(when, Math.random()); s.stop(when + dur + 0.02);
  }
}

export const music = new Music();
