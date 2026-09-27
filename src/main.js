// Boot: title screen, save loading, Phaser setup, HUD wiring.

import { state } from './state.js';
import { loadSave, writeSave, resetSave } from './systems/save.js';
import { audio } from './systems/audio.js';
import { initInput, input } from './systems/input.js';
import { hud, portrait } from './ui/hud.js';
import { WorldScene } from './scenes/WorldScene.js';
import { KartScene } from './scenes/KartScene.js';
import { FAMILY } from './data/characters.js';
import { music } from './systems/music.js';
import { daylight } from './systems/daylight.js';

const $ = id => document.getElementById(id);
const QA = new URLSearchParams(location.search).has('qa');
window.__forestville = state; // handy for debugging from the console

// ---- load save ----
const loaded = loadSave();
state.save = loaded.save;
state.notice = loaded.notice;
audio.setMuted(state.save.settings.muted);

// ---- title screen ----
const row = $('family-row');
FAMILY.forEach(id => row.appendChild(portrait(id, 120)));
const hasProgress = state.save.quests.intro || state.save.quests.ch1.feathers.length > 0;
$('start-button').textContent = hasProgress ? 'Continue adventure' : 'Start adventure';
if (hasProgress) $('start-note').textContent = `${state.save.quests.ch1.feathers.length} of 5 feathers found${state.save.quests.ch2.done ? ' · adventure complete' : ''}`;

function setMuted(m) {
  state.save.settings.muted = m;
  audio.setMuted(m);
  hud.setMuted(m);
  writeSave(state.save);
}

function setMusic(on) {
  state.save.settings.music = on;
  music.setEnabled(on);
  hud.setMusic(on);
  writeSave(state.save);
}

hud.init({
  getSave: () => state.save,
  onMusic: () => setMusic(!state.save.settings.music),
  onCamera: () => state.scene?.takePhoto(),
  onSwitch: id => state.scene?.switchTo(id),
  onMute: () => setMuted(!state.save.settings.muted),
  onReset: () => {
    state.save = resetSave(state.save.settings);
    location.reload();
  },
});
hud.setMuted(state.save.settings.muted);
hud.setMusic(state.save.settings.music);
music.setEnabled(state.save.settings.music);
daylight.init($('tint'));

initInput({ zone: $('joy-zone'), base: $('joy-base'), knob: $('joy-knob'), actionBtn: $('action-button') });
input.onKey = (k) => {
  if (!state.scene) return;
  const i = ['1', '2', '3', '4'].indexOf(k);
  if (i >= 0) state.scene.switchTo(FAMILY[i]);
  if (k === 'm') setMuted(!state.save.settings.muted);
  if (k === 'escape') { if (hud.albumOpen) hud.openAlbum(false); else hud.openMenu(!hud.menuOpen); }
  if (k === 'p') state.scene?.takePhoto();
};

function resizeGame() {
  if (!state.game) return;
  const w = window.innerWidth, h = window.innerHeight;
  state.game.scale.resize(Math.round(w * state.dpr), Math.round(h * state.dpr));
}

function boot() {
  if (state.game) return;
  audio.unlock();
  music.retry();
  input.action = false;
  $('start-screen').hidden = true;
  $('game-shell').removeAttribute('aria-hidden');
  if (!window.Phaser) {
    $('load-error').hidden = false;
    return;
  }
  state.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#9cc27c',
    width: Math.round(window.innerWidth * state.dpr),
    height: Math.round(window.innerHeight * state.dpr),
    scale: { mode: Phaser.Scale.NONE },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    // ?qa uses raw frame deltas so slow headless test browsers keep real time
    fps: QA ? { target: 60, min: 1, smoothStep: false } : { target: 60 },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true },
    scene: [WorldScene, KartScene],
    banner: false,
  });
  addEventListener('resize', resizeGame);
  addEventListener('orientationchange', () => setTimeout(resizeGame, 250));
  // audio needs a gesture on iOS; re-arm on any tap
  addEventListener('pointerdown', () => { audio.unlock(); music.retry(); }, { passive: true });
  addEventListener('keydown', () => { audio.unlock(); music.retry(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) state.scene?.persist(true); });
}

// Painting the world takes a moment on phones: show feedback first.
function startSoon() {
  if (state.game || state.starting) return;
  state.starting = true;
  audio.unlock();
  const b = $('start-button');
  b.textContent = 'Setting the scene…'; b.disabled = true;
  requestAnimationFrame(() => setTimeout(boot, 30));
}
$('start-button').addEventListener('click', startSoon);

// Offline play: register the service worker (skipped in ?qa test runs).
if ('serviceWorker' in navigator && !QA && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
}
addEventListener('keydown', e => { if (!state.game && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startSoon(); } });
