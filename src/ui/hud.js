// DOM HUD: quest card, area titles, prompts, dialogue, toasts, switcher, menu, endings.

import { speakerInfo, FAMILY, CHARACTERS } from '../data/characters.js';
import { paintPortrait } from '../art/critters.js';
import { audio } from '../systems/audio.js';

const $ = id => document.getElementById(id);
const portraitCache = {};
function portrait(id, size = 96) {
  const key = `${id}-${size}`;
  if (!portraitCache[key]) portraitCache[key] = paintPortrait(id, size);
  const c = document.createElement('canvas');
  c.width = c.height = size; c.getContext('2d').drawImage(portraitCache[key], 0, 0);
  return c;
}
export { portrait };

const VERB_LABEL = { talk: 'Talk', examine: 'Look', collect: 'Take', activate: 'Use', travel: 'Travel' };

export const hud = {
  lines: [], typing: null, onDone: null, full: '', shown: 0, lastBlip: 0,

  init({ onSwitch, onMute, onReset }) {
    this.el = {
      chapter: $('chapter-label'), quest: $('quest-label'), pips: $('feather-pips'),
      title: $('area-title'), toast: $('toast'), prompt: $('prompt'), promptKey: $('prompt-key'), promptText: $('prompt-text'),
      action: $('action-button'), actionLabel: $('action-label'),
      dlg: $('dialogue'), dlgPortrait: $('dialogue-portrait'), dlgName: $('dialogue-name'), dlgText: $('dialogue-text'),
      menu: $('menu'), mute: $('mute-button'), menuBtn: $('menu-button'), switcher: $('character-switcher'),
      ending: $('ending'), endEyebrow: $('ending-eyebrow'), endTitle: $('ending-title'), endText: $('ending-text'), endRow: $('ending-row'), endBtn: $('ending-button'),
      muteToggle: $('mute-toggle'), resetBtn: $('reset-button'), resetConfirm: $('reset-confirm'), resetYes: $('reset-yes'), resetNo: $('reset-no'),
      closeMenu: $('close-menu'), app: $('app'),
    };
    // switcher portraits
    this.el.switcher.innerHTML = '';
    FAMILY.forEach((id, i) => {
      const b = document.createElement('button');
      b.className = 'character-button'; b.type = 'button'; b.dataset.character = id;
      b.setAttribute('aria-label', `Play as ${CHARACTERS[id].name}`);
      b.appendChild(portrait(id, 80));
      const s = document.createElement('span'); s.textContent = CHARACTERS[id].name; b.appendChild(s);
      b.addEventListener('click', () => { audio.tap(); onSwitch(id); });
      this.el.switcher.appendChild(b);
    });
    // pips
    this.el.pips.innerHTML = '';
    for (let i = 0; i < 5; i++) { const p = document.createElement('i'); p.className = 'pip'; this.el.pips.appendChild(p); }

    this.el.dlg.addEventListener('pointerdown', e => { e.preventDefault(); this.advance(); });
    this.el.mute.addEventListener('click', () => { audio.tap(); onMute(); });
    this.el.muteToggle.addEventListener('click', () => { onMute(); });
    this.el.menuBtn.addEventListener('click', () => { audio.tap(); this.openMenu(true); });
    this.el.closeMenu.addEventListener('click', () => this.openMenu(false));
    this.el.menu.addEventListener('pointerdown', e => { if (e.target === this.el.menu) this.openMenu(false); });
    this.el.resetBtn.addEventListener('click', () => { this.el.resetConfirm.hidden = false; this.el.resetBtn.hidden = true; });
    this.el.resetNo.addEventListener('click', () => { this.el.resetConfirm.hidden = true; this.el.resetBtn.hidden = false; });
    this.el.resetYes.addEventListener('click', () => { onReset(); });
  },

  openMenu(open) {
    this.el.menu.hidden = !open;
    this.el.resetConfirm.hidden = true; this.el.resetBtn.hidden = false;
    this.menuOpen = open;
    if (open) this.el.closeMenu.focus();
  },

  setMuted(m) {
    this.el.mute.classList.toggle('muted', m);
    this.el.mute.setAttribute('aria-label', m ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off');
    this.el.muteToggle.textContent = m ? 'Sound: off' : 'Sound: on';
    this.el.muteToggle.setAttribute('aria-pressed', String(!m));
  },

  setActive(who) {
    this.el.switcher.querySelectorAll('.character-button').forEach(b => b.classList.toggle('active', b.dataset.character === who));
  },

  setQuest({ chapter, objective, feathers = null }) {
    this.el.chapter.textContent = chapter;
    if (this.el.quest.textContent !== objective) {
      this.el.quest.textContent = objective;
      this.el.quest.classList.remove('pop'); void this.el.quest.offsetWidth; this.el.quest.classList.add('pop');
    }
    this.el.pips.hidden = feathers === null;
    if (feathers !== null) [...this.el.pips.children].forEach((p, i) => p.classList.toggle('on', i < feathers));
  },

  showTitle(text, sub = '') {
    const t = this.el.title;
    t.innerHTML = '';
    const a = document.createElement('div'); a.className = 'area-name'; a.textContent = text; t.appendChild(a);
    if (sub) { const b = document.createElement('div'); b.className = 'area-sub'; b.textContent = sub; t.appendChild(b); }
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  },

  toast(text, ms = 2200) {
    const t = this.el.toast;
    t.textContent = text; t.classList.add('show');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('show'), ms);
  },

  prompt(target, touch) {
    const p = this.el.prompt;
    const sig = target && !this.talking ? `${target.id}|${target.verb}|${target.label}|${touch}` : '';
    if (sig === this.promptSig) return;   // avoid DOM writes every frame
    this.promptSig = sig;
    if (!target || this.talking) {
      p.classList.remove('show');
      this.el.action.classList.remove('ready');
      this.el.actionLabel.textContent = '';
      this.promptId = null;
      return;
    }
    if (this.promptId !== target.id) { this.promptId = target.id; audio.prompt(); }
    this.el.promptKey.textContent = touch ? VERB_LABEL[target.verb] : 'E';
    this.el.promptKey.classList.toggle('verb', !!touch);
    this.el.promptText.textContent = touch ? target.label : `${VERB_LABEL[target.verb]} · ${target.label}`;
    p.classList.add('show');
    this.el.action.classList.add('ready');
    this.el.actionLabel.textContent = VERB_LABEL[target.verb];
  },

  get talking() { return this.lines.length > 0 || !!this.typing; },

  // lines: [[speakerId, text], ...]
  say(lines, onDone) {
    const wasTalking = this.talking;
    this.lines.push(...lines.map(l => (Array.isArray(l) ? l : ['sign', l])));
    const prev = this.onDone;
    this.onDone = prev && onDone ? () => { prev(); onDone(); } : (onDone || prev);
    if (!wasTalking) { this.el.app.classList.add('talking'); this.next(); }
  },

  next() {
    const line = this.lines.shift();
    if (!line) {
      this.el.dlg.classList.remove('show');
      this.el.app.classList.remove('talking');
      this.typing = null;
      const d = this.onDone; this.onDone = null;
      d && d();
      return;
    }
    const [who, text] = line;
    const info = speakerInfo(who);
    this.voice = info.voice || 0;
    this.el.dlgName.textContent = info.name || '';
    this.el.dlgName.hidden = !info.name;
    this.el.dlgPortrait.innerHTML = '';
    if (who !== 'sign') this.el.dlgPortrait.appendChild(portrait(who, 112));
    this.el.dlg.classList.toggle('narration', who === 'sign');
    this.el.dlg.classList.add('show');
    this.full = text; this.shown = 0; this.el.dlgText.textContent = '';
    this.typing = true;
    this.el.dlg.classList.remove('done');
  },

  tick(dt) {
    if (!this.typing || this.typing === 'done') return;
    this.shown += dt * 0.045;
    const n = Math.min(this.full.length, Math.floor(this.shown));
    if (n !== this.el.dlgText.textContent.length) {
      this.el.dlgText.textContent = this.full.slice(0, n);
      if (this.voice && n - this.lastBlip >= 3 && /\w/.test(this.full[n - 1] || '')) { audio.blip(this.voice); this.lastBlip = n; }
    }
    if (n >= this.full.length) { this.typing = 'done'; this.lastBlip = 0; this.el.dlg.classList.add('done'); }
  },

  advance() {
    if (!this.talking) return;
    if (this.typing !== 'done') { this.shown = this.full.length; this.tick(0); return; }
    this.next();
  },

  showEnding({ eyebrow, title, text, button, onButton }) {
    const e = this.el;
    e.endEyebrow.textContent = eyebrow; e.endTitle.textContent = title; e.endText.textContent = text; e.endBtn.textContent = button;
    e.endRow.innerHTML = '';
    FAMILY.forEach(id => e.endRow.appendChild(portrait(id, 88)));
    e.ending.hidden = false;
    e.endBtn.onclick = () => { e.ending.hidden = true; onButton && onButton(); };
    setTimeout(() => e.endBtn.focus(), 50);
  },
  get endingOpen() { return !this.el.ending.hidden; },
};
