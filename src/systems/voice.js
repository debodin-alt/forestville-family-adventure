// Spoken voices for the family, using the device's built-in speech (Web Speech API).
// No audio files: each character gets their own voice choice, pitch and speed.
// Music and ambience duck while someone talks so the words come through clearly.

import { music } from './music.js';
import { audio } from './audio.js';

const STYLE = {
  dan:     { pitch: 0.85, rate: 0.98, prefer: 'male' },
  finn:    { pitch: 1.75, rate: 1.08, prefer: 'female' },
  jessia:  { pitch: 1.65, rate: 1.16, prefer: 'female' },   // cute and a little quick
  jarency: { pitch: 1.05, rate: 0.98, prefer: 'female' },
  bev:     { pitch: 0.95, rate: 0.92, prefer: 'female' },
  mo:      { pitch: 0.9,  rate: 1.0,  prefer: 'male' },
  aroha:   { pitch: 1.15, rate: 1.0,  prefer: 'female' },
  kez:     { pitch: 0.95, rate: 1.05, prefer: 'male' },
};
const MALE = /(lee|daniel|gordon|aaron|fred|rishi|alex|arthur|oliver|thomas|james|male|guy|david|mark|google uk english male)/i;
const FEMALE = /(karen|catherine|samantha|serena|moira|tessa|kate|female|zira|susan|victoria|allison|ava|google uk english female|google us english)/i;

export const voice = {
  enabled: true, ready: false, voices: [],

  supported() { return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; },

  init() {
    if (!this.supported()) return;
    const load = () => { this.voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); };
    load();
    speechSynthesis.addEventListener?.('voiceschanged', load);
  },

  // iOS only lets speech start from a tap the first time: call this from a gesture.
  unlock() {
    if (!this.supported() || this.ready) return;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); this.ready = true; } catch { /* ignore */ }
  },

  pickVoice(kind) {
    const v = this.voices;
    if (!v.length) return null;
    const local = v.filter(x => /en-AU/i.test(x.lang));
    const pool = local.length ? [...local, ...v] : v;
    const re = kind === 'male' ? MALE : FEMALE;
    return pool.find(x => re.test(x.name) && x.localService !== false) || pool.find(x => re.test(x.name)) || local[0] || v.find(x => /en-GB|en-US/i.test(x.lang)) || v[0];
  },

  // Speak a line as a character. `interrupt` cuts off whatever was being said.
  say(who, text, { interrupt = true } = {}) {
    if (!this.enabled || !this.supported() || !STYLE[who]) return;
    const clean = String(text).replace(/[“”"]/g, '').replace(/…/g, '...').replace(/\bHONK\b/g, 'Honk').trim();
    if (!clean) return;
    try {
      if (interrupt) speechSynthesis.cancel();
      const st = STYLE[who];
      const u = new SpeechSynthesisUtterance(clean);
      const vc = this.pickVoice(st.prefer);
      if (vc) { u.voice = vc; u.lang = vc.lang; } else u.lang = 'en-AU';
      u.pitch = st.pitch; u.rate = st.rate; u.volume = 1;
      u.onstart = () => { music.setDuck(true); audio.duckAmbience(true); };
      u.onend = u.onerror = () => { if (!speechSynthesis.speaking) { music.setDuck(false); audio.duckAmbience(false); } };
      speechSynthesis.speak(u);
    } catch { /* speech is a bonus; never break the game */ }
  },

  // Several pieces in a row with their own speed/pitch, e.g. a quick "6" then a long "seven".
  sayParts(who, parts) {
    if (!this.enabled || !this.supported() || !STYLE[who]) return;
    try {
      speechSynthesis.cancel();
      const st = STYLE[who], vc = this.pickVoice(st.prefer);
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p.text);
        if (vc) { u.voice = vc; u.lang = vc.lang; } else u.lang = 'en-AU';
        u.pitch = Math.min(2, st.pitch * (p.pitch || 1)); u.rate = Math.max(0.1, st.rate * (p.rate || 1)); u.volume = 1;
        if (i === 0) u.onstart = () => { music.setDuck(true); audio.duckAmbience(true); };
        if (i === parts.length - 1) u.onend = u.onerror = () => { music.setDuck(false); audio.duckAmbience(false); };
        speechSynthesis.speak(u);
      });
    } catch { /* ignore */ }
  },

  stop() { try { if (this.supported()) speechSynthesis.cancel(); } catch { /* ignore */ } },
  setEnabled(on) { this.enabled = on; if (!on) this.stop(); },
};
