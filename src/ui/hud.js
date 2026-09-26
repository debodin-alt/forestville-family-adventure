// DOM HUD: quest card, area titles, prompts, dialogue, toasts, switcher, menu, endings.

import { speakerInfo, FAMILY, CHARACTERS } from '../data/characters.js';
import { paintPortrait } from '../art/critters.js';
import { audio } from '../systems/audio.js';
import { paintFish } from '../art/fish.js';
import { FISH, SEA_LIFE } from '../data/fish.js';
import { loadPhotos } from '../systems/photos.js';

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

const VERB_LABEL = { talk: 'Talk', examine: 'Look', collect: 'Take', activate: 'Use', travel: 'Travel', fish: 'Fish', spot: 'Spot' };

export const hud = {
  lines: [], typing: null, onDone: null, full: '', shown: 0, lastBlip: 0,

  init({ onSwitch, onMute, onReset, onMusic, onCamera, getSave }) {
    this.getSave = getSave;
    this.el = {
      chapter: $('chapter-label'), quest: $('quest-label'), pips: $('feather-pips'),
      title: $('area-title'), toast: $('toast'), prompt: $('prompt'), promptKey: $('prompt-key'), promptText: $('prompt-text'),
      action: $('action-button'), actionLabel: $('action-label'),
      dlg: $('dialogue'), dlgPortrait: $('dialogue-portrait'), dlgName: $('dialogue-name'), dlgText: $('dialogue-text'),
      menu: $('menu'), mute: $('mute-button'), menuBtn: $('menu-button'), switcher: $('character-switcher'),
      ending: $('ending'), endEyebrow: $('ending-eyebrow'), endTitle: $('ending-title'), endText: $('ending-text'), endRow: $('ending-row'), endBtn: $('ending-button'),
      muteToggle: $('mute-toggle'), resetBtn: $('reset-button'), resetConfirm: $('reset-confirm'), resetYes: $('reset-yes'), resetNo: $('reset-no'),
      closeMenu: $('close-menu'), app: $('app'),
      musicToggle: $('music-toggle'), camera: $('camera-button'), albumBtn: $('album-button'), album: $('album'), albumBody: $('album-body'), closeAlbum: $('close-album'),
      catchCard: $('catch'), catchEyebrow: $('catch-eyebrow'), catchArt: $('catch-art'), catchName: $('catch-name'), catchMeta: $('catch-meta'), catchBlurb: $('catch-blurb'),
      flash: $('flash'),
    };
    this.el.musicToggle.addEventListener('click', () => onMusic());
    this.el.camera.addEventListener('click', () => onCamera());
    this.el.albumBtn.addEventListener('click', () => { this.openMenu(false); this.openAlbum(true); });
    this.el.closeAlbum.addEventListener('click', () => this.openAlbum(false));
    this.el.album.addEventListener('pointerdown', e => { if (e.target === this.el.album) this.openAlbum(false); });
    this.el.album.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { audio.tap(); this.albumTab(t.dataset.tab); }));
    this.el.catchCard.addEventListener('pointerdown', () => this.hideCatch());
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

  setMusic(on) {
    this.el.musicToggle.textContent = on ? 'Music: on' : 'Music: off';
    this.el.musicToggle.setAttribute('aria-pressed', String(on));
  },

  flash() { const f = this.el.flash; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },

  catchCard({ spec, size, isNew, count, spotted }) {
    const e = this.el;
    e.catchEyebrow.textContent = spotted ? 'Spotted!' : 'You caught';
    e.catchArt.innerHTML = ''; e.catchArt.appendChild(paintFish(spec, 150 * 2, 94 * 2));
    e.catchName.textContent = spec.name;
    e.catchMeta.innerHTML = '';
    const meta = spotted ? `Sea life ${count}/5` : spec.junk ? 'Not a fish, technically' : `${size} cm · released`;
    e.catchMeta.append(meta);
    if (isNew) { const b = document.createElement('span'); b.className = 'new'; b.textContent = 'NEW'; e.catchMeta.appendChild(b); }
    e.catchBlurb.textContent = spec.blurb;
    e.catchCard.classList.add('show');
    clearTimeout(this.catchT); this.catchT = setTimeout(() => this.hideCatch(), 3600);
  },
  hideCatch() { this.el.catchCard.classList.remove('show'); },

  openAlbum(open) {
    this.el.album.hidden = !open; this.albumOpen = open;
    if (open) { audio.whoosh(true); this.albumTab(this.tab || 'photos'); this.el.closeAlbum.focus(); } else audio.whoosh(false);
  },

  albumTab(tab) {
    this.tab = tab;
    this.el.album.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const body = this.el.albumBody; body.innerHTML = ''; body.scrollTop = 0;
    const s = this.getSave();
    if (tab === 'photos') {
      const photos = loadPhotos();
      if (!photos.length) { body.innerHTML = '<p class="album-empty">No photos yet. Tap the camera button up top to take one, anywhere, any time.</p>'; return; }
      const g = document.createElement('div'); g.className = 'photo-grid';
      photos.forEach((p, i) => {
        const f = document.createElement('figure'); f.className = 'polaroid'; f.style.setProperty('--r', `${(i % 3 - 1) * 1.6}deg`); f.style.margin = '0';
        const img = document.createElement('img'); img.src = p.data; img.alt = p.caption || 'Family photo'; img.loading = 'lazy';
        const c = document.createElement('figcaption'); c.textContent = p.caption || '';
        f.append(img, c); g.appendChild(f);
      });
      body.appendChild(g);
      return;
    }
    const table = tab === 'fish' ? FISH : SEA_LIFE;
    const have = tab === 'fish' ? s.world.fish : Object.fromEntries(s.quests.ch3.spotted.map(id => [id, { n: 1 }]));
    const found = Object.keys(table).filter(id => have[id]).length;
    const sum = document.createElement('p'); sum.className = 'log-summary';
    sum.textContent = tab === 'fish' ? `${found} of ${Object.keys(table).length} found · catch and release` : `${found} of ${Object.keys(table).length} spotted in Cabbage Tree Bay`;
    body.appendChild(sum);
    const g = document.createElement('div'); g.className = 'log-grid';
    for (const [id, spec] of Object.entries(table)) {
      const got = have[id];
      const d = document.createElement('div'); d.className = 'log-item' + (got ? '' : ' unknown');
      d.appendChild(paintFish(spec, 260, 160, !got));
      const b = document.createElement('b'); b.textContent = got ? spec.name : '???';
      const sm = document.createElement('small');
      sm.textContent = got ? (tab === 'fish' ? (spec.junk ? `found ×${got.n}` : `×${got.n} · best ${got.best} cm`) : 'spotted') : (tab === 'fish' ? 'not caught yet' : 'not spotted yet');
      d.append(b, sm); g.appendChild(d);
    }
    body.appendChild(g);
  },

  openMenu(open) {
    if (open !== !!this.menuOpen) audio.whoosh(open);
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
