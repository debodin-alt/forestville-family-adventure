// Kart racing at "Level 5 Karting", Moore Park. Three laps against the family.
// Touch: point the joystick where you want to go (kart steers toward it). Keys: arrows / WASD.

import { KW, KH, HW, LAPS, TRACK, N, paintKartTrack, paintKart } from '../data/kart.js';
import { FAMILY, CHARACTERS } from '../data/characters.js';
import { paintPortrait } from '../art/critters.js';
import { audio } from '../systems/audio.js';
import { music } from '../systems/music.js';
import { input, readMove, takeAction, haptic, isTouch } from '../systems/input.js';
import { writeSave } from '../systems/save.js';
import { snapshot, addPhoto } from '../systems/photos.js';
import { hud } from '../ui/hud.js';
import { state } from '../state.js';

const $ = id => document.getElementById(id);
const MAX = 430, ACC = 360, BRAKE = 700, DRAG = 160, TURN = 2.9;
const COLORS = { dan: '#2f8a86', finn: '#d64533', jessia: '#6f54a8', jarency: '#e3ae50' };
const fmt = ms => { if (ms == null) return '–'; const s = ms / 1000, m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; };
const ord = n => n + (['th', 'st', 'nd', 'rd'][n] || 'th');

export class KartScene extends Phaser.Scene {
  constructor() { super('kart'); }

  create() {
    state.scene = this;
    this.save = state.save;
    const who = this.save.player.who;
    this.cameras.main.setBackgroundColor('#6f7379');
    if (!this.textures.exists('kart-track')) this.textures.addCanvas('kart-track', paintKartTrack());
    this.add.image(0, 0, 'kart-track').setOrigin(0).setDepth(-10);
    // LED ceiling strips (a soft glow over everything, like the real indoor track)
    if (!this.textures.exists('led')) { const g = this.make.graphics({ add: false }); g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 260, 10, 5); g.generateTexture('led', 260, 10); g.destroy(); }
    for (let x = 200; x < KW; x += 500) for (let y = 120; y < KH; y += 320) this.add.image(x, y, 'led').setDepth(50).setAlpha(0.16).setBlendMode('ADD');

    // karts: player + the rest of the family on a staggered grid
    const order = [...FAMILY.filter(f => f !== who)];
    order.splice(2, 0, who);
    this.karts = order.map((id, slot) => this.makeKart(id, slot, id === who));
    this.player = this.karts.find(k => k.isPlayer);
    this.sparks = [];

    const cam = this.cameras.main;
    cam.setBounds(-200, -200, KW + 400, KH + 400);
    this.camT = { x: this.player.x, y: this.player.y };
    cam.startFollow(this.camT, false, 1, 1);
    this.applyZoom(); this.scale.on('resize', this.applyZoom, this);
    cam.fadeIn(500, 20, 20, 24);

    this.phase = 'lights'; this.t = 0; this.raceT = 0; this.finishOrder = []; this.lightsOn = 0;
    this.setupHud();
    this.motor = this.makeMotor();
    music.play('race');
    this.events.once('shutdown', () => this.cleanup());
    hud.showTitle('LEVEL 5 KARTING', 'Moore Park · 3 laps');
    this.time.delayedCall(3200, () => hud.toast(isTouch() ? 'Point the joystick where you want to drive' : 'Arrow keys or WASD to drive', 3000));
  }

  applyZoom() {
    const w = this.scale.width / state.dpr, h = this.scale.height / state.dpr;
    this.cameras.main.setZoom(Math.max(0.55, Math.min(1.0, Math.min(w, h) / 620)) * state.dpr);
  }

  makeKart(id, slot, isPlayer) {
    const key = `kart-${id}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, paintKart(COLORS[id], slot + 1));
    const pk = `kart-face-${id}`;
    if (!this.textures.exists(pk)) this.textures.addCanvas(pk, paintPortrait(id, 72, '#ffffff'));
    const row = Math.floor(slot / 2), col = slot % 2 ? 26 : -26;
    const i = (N - 4 - row * 3 - (slot % 2) * 1.5 + N) % N | 0, p = TRACK[i];
    const k = {
      id, isPlayer, x: p.x + p.nx * col, y: p.y + p.ny * col, a: p.ang, v: 0, idx: i, laps: 0, half: false,
      skill: isPlayer ? 1 : 0.9 + Math.random() * 0.06, off: (Math.random() - 0.5) * 50, finished: false, time: 0, lapStart: 0, best: null, bump: 0,
    };
    k.body = this.add.image(k.x, k.y, key).setScale(0.5);
    k.face = this.add.image(k.x, k.y, pk).setScale(0.36);
    k.shadow = this.add.ellipse(k.x + 3, k.y + 5, 40, 26, 0x000000, 0.25);
    k.tag = this.add.text(k.x, k.y - 34, CHARACTERS[id].name, { fontFamily: 'ui-rounded, system-ui, sans-serif', fontSize: '13px', fontStyle: '800', color: '#fff', backgroundColor: isPlayer ? '#c2643d' : 'rgba(30,32,38,.75)', padding: { x: 6, y: 2 } }).setOrigin(0.5);
    return k;
  }

  // ---------- HUD (DOM) ----------
  setupHud() {
    document.getElementById('app').classList.add('karting');
    $('kart-hud').hidden = false;
    $('kart-results').hidden = true;
    const lights = $('kart-lights'); lights.hidden = false; lights.querySelectorAll('i').forEach(l => l.classList.remove('on', 'go'));
    $('kart-best').textContent = `Best ${fmt(this.save.world.kart.best)}`;
    $('kart-leave').onclick = () => this.leave();
    $('kart-again').onclick = () => { audio.tap(); this.scene.restart(); };
    $('kart-exit').onclick = () => this.leave();
    this.hudT = 0;
  }

  updateHud(dt) {
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 100;
    const pos = this.standings().indexOf(this.player) + 1;
    $('kart-pos').innerHTML = `${pos}<sup>${ord(pos).slice(String(pos).length)}</sup>`;
    $('kart-lap').textContent = `Lap ${Math.min(LAPS, this.player.laps + 1)}/${LAPS}`;
    $('kart-time').textContent = fmt(this.phase === 'lights' ? 0 : this.player.finished ? this.player.time : this.raceT);
  }

  standings() {
    const prog = k => k.laps * N + (k.half ? k.idx : (k.idx > N / 2 ? k.idx - N : k.idx));
    return [...this.karts].sort((a, b) => (b.finished - a.finished) || (a.finished && b.finished ? a.time - b.time : prog(b) - prog(a)));
  }

  // ---------- sound ----------
  makeMotor() {
    const c = audio.ctx; if (!c || !audio.master) return null;
    const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 1400; g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g).connect(audio.master);
    o.start(); o2.start();
    return { o, o2, f, g };
  }
  updateMotor() {
    const m = this.motor; if (!m) return;
    const k = this.player, sp = Math.abs(k.v) / MAX, t = audio.ctx.currentTime;
    m.o.frequency.setTargetAtTime(160 + sp * 520, t, 0.05);    // electric whine rises with speed
    m.o2.frequency.setTargetAtTime(320 + sp * 1040, t, 0.05);
    const on = !audio.muted && this.phase !== 'results';
    m.g.gain.setTargetAtTime(on ? 0.012 + sp * 0.04 : 0, t, 0.08);
  }
  cleanup() {
    if (this.motor) { try { this.motor.o.stop(); this.motor.o2.stop(); } catch { /* ok */ } this.motor.g.disconnect(); this.motor = null; }
    this.scale.off('resize', this.applyZoom, this);
    document.getElementById('app').classList.remove('karting');
    $('kart-hud').hidden = true; $('kart-lights').hidden = true; $('kart-results').hidden = true;
  }

  // ---------- race flow ----------
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (hud.talking) { hud.tick(delta); if (takeAction()) hud.advance(); }
    if (this.phase === 'lights') {
      this.t += dt;
      const n = Math.min(5, Math.floor(this.t / 0.7));
      if (n !== this.lightsOn) {
        this.lightsOn = n;
        $('kart-lights').querySelectorAll('i').forEach((l, i) => l.classList.toggle('on', i < n));
        if (n > 0) audio.tone && audio.ok && audio.tone({ f: 440, type: 'square', dur: 0.18, vol: 0.06 });
      }
      if (this.t > 0.7 * 5 + 0.6 + Math.random() * 0.02) {
        this.phase = 'race'; this.raceT = 0;
        const L = $('kart-lights'); L.querySelectorAll('i').forEach(l => { l.classList.remove('on'); l.classList.add('go'); });
        audio.ok && audio.tone({ f: 880, type: 'square', dur: 0.4, vol: 0.07 });
        setTimeout(() => { L.hidden = true; }, 900);
        this.karts.forEach(k => { k.lapStart = 0; });
      }
    } else if (this.phase === 'race' || this.phase === 'finishing') {
      this.raceT += dt * 1000;
      for (const k of this.karts) {
        const inp = k.isPlayer && !k.finished ? this.playerInput(k) : this.aiInput(k);
        this.stepKart(k, inp, dt);
      }
      this.collide();
    }
    if (takeAction() && this.phase !== 'results') { audio.honk(); }
    for (const k of this.karts) this.syncKart(k);
    this.updateSparks(dt);
    // camera looks a little ahead of the kart
    const p = this.player, look = Math.min(1, Math.abs(p.v) / MAX) * 120;
    const tx = p.x + Math.cos(p.a) * look, ty = p.y + Math.sin(p.a) * look;
    const ck = 1 - Math.exp(-dt * 6);
    this.camT.x += (tx - this.camT.x) * ck; this.camT.y += (ty - this.camT.y) * ck;
    this.updateMotor();
    this.updateHud(delta);
  }

  playerInput(k) {
    const [jx, jy] = readMove();
    const keys = input.keys;
    const kbSteer = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    const kbGas = keys.has('arrowup') || keys.has('w'), kbBrake = keys.has('arrowdown') || keys.has('s');
    if (kbSteer || kbGas || kbBrake) return { steer: kbSteer, gas: kbGas ? 1 : 0, brake: kbBrake };
    const mag = Math.hypot(jx, jy);
    if (mag < 0.15) return { steer: 0, gas: 0, brake: false };
    // joystick: kart turns toward where you point
    let d = Math.atan2(jy, jx) - k.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return { steer: Math.max(-1, Math.min(1, d * 2.4)), gas: Math.abs(d) > 2.3 ? 0 : mag, brake: Math.abs(d) > 2.3 && k.v > 60 };
  }

  aiInput(k) {
    const look = Math.floor(9 + Math.max(0, k.v) / 32), t = TRACK[(k.idx + look) % N];
    const tx = t.x + t.nx * k.off, ty = t.y + t.ny * k.off;
    let d = Math.atan2(ty - k.y, tx - k.x) - k.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    // rubber band: keeps races close for kids
    const lead = (k.laps * N + k.idx) - (this.player.laps * N + this.player.idx);
    k.skill = Math.max(0.82, Math.min(0.99, (k.base || (k.base = k.skill)) - (lead > 40 ? 0.07 : 0) + (lead < -80 ? 0.05 : 0)));
    const sharp = Math.abs(TRACK[(k.idx + look) % N].curve) > 0.55;
    return { steer: Math.max(-1, Math.min(1, d * 2.2)), gas: k.finished ? 0.4 : sharp && k.v > MAX * 0.72 ? 0.2 : 1, brake: false };
  }

  nearest(k) {
    let best = k.idx, bd = Infinity;
    for (let s = -12; s <= 30; s++) { const i = (k.idx + s + N) % N, p = TRACK[i], d = (p.x - k.x) ** 2 + (p.y - k.y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }

  stepKart(k, inp, dt) {
    const max = MAX * k.skill;
    if (inp.gas) k.v += ACC * inp.gas * dt;
    if (inp.brake) k.v -= BRAKE * dt;
    if (!inp.gas && !inp.brake) k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), DRAG * dt);
    k.v = Math.max(-120, Math.min(max, k.v));
    k.a += inp.steer * TURN * dt * Math.max(-1, Math.min(1, k.v / 140));
    k.x += Math.cos(k.a) * k.v * dt; k.y += Math.sin(k.a) * k.v * dt;
    // tyre walls
    const prev = k.idx; k.idx = this.nearest(k);
    const p = TRACK[k.idx];
    const lat = (k.x - p.x) * p.nx + (k.y - p.y) * p.ny, lim = HW - 16;
    if (Math.abs(lat) > lim) {
      const push = Math.abs(lat) - lim;
      k.x -= p.nx * Math.sign(lat) * push; k.y -= p.ny * Math.sign(lat) * push;
      if (Math.abs(k.v) > 90) {
        this.spark(k.x + p.nx * Math.sign(lat) * 14, k.y + p.ny * Math.sign(lat) * 14);
        if (k.isPlayer && this.time.now > (k.bump || 0)) { k.bump = this.time.now + 300; audio.burst && audio.ok && audio.burst({ freq: 220, q: 0.8, dur: 0.18, vol: 0.18 }); haptic.light(); }
      }
      k.v *= 0.93;
      // nudge heading back along the track
      let d = p.ang - k.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      k.a += d * 0.12;
    }
    // laps
    if (k.idx > N * 0.4 && k.idx < N * 0.6) k.half = true;
    if (prev > N * 0.85 && k.idx < N * 0.15 && k.half) {
      k.half = false; k.laps++;
      const lapMs = this.raceT - k.lapStart; k.lapStart = this.raceT;
      if (k.best == null || lapMs < k.best) k.best = lapMs;
      if (k.isPlayer) {
        if (k.laps < LAPS) { hud.toast(k.laps === LAPS - 1 ? `Final lap! ${fmt(lapMs)}` : `Lap ${k.laps} · ${fmt(lapMs)}`); audio.item(); }
      }
      if (k.laps >= LAPS && !k.finished) {
        k.finished = true; k.time = this.raceT; this.finishOrder.push(k);
        if (k.isPlayer) this.finish();
      }
    }
  }

  collide() {
    for (let i = 0; i < this.karts.length; i++) for (let j = i + 1; j < this.karts.length; j++) {
      const a = this.karts[i], b = this.karts[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 34 && d > 0) {
        const push = (34 - d) / 2, ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; a.v *= 0.97; b.v *= 0.97;
        if ((a.isPlayer || b.isPlayer) && this.time.now > (this.bonk || 0)) { this.bonk = this.time.now + 400; audio.ok && audio.tone({ f: 160, f2: 110, type: 'square', dur: 0.08, vol: 0.05 }); }
      }
    }
  }

  syncKart(k) {
    k.body.setPosition(k.x, k.y).setRotation(k.a).setDepth(k.y);
    k.shadow.setPosition(k.x + 3, k.y + 5).setRotation(k.a).setDepth(k.y - 1);
    const bob = Math.sin(this.time.now / 90 + k.x) * Math.min(1, Math.abs(k.v) / MAX) * 1.2;
    k.face.setPosition(k.x - Math.cos(k.a) * 2, k.y - 6 + bob).setDepth(k.y + 1);
    k.tag.setPosition(k.x, k.y - 36).setDepth(k.y + 2);
  }

  spark(x, y) {
    for (let i = 0; i < 3; i++) {
      const s = this.add.circle(x, y, 2.5, 0xffd35a).setDepth(5000).setBlendMode('ADD');
      this.sparks.push({ s, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.35 });
    }
  }
  updateSparks(dt) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]; s.life -= dt; s.s.x += s.vx * dt; s.s.y += s.vy * dt; s.s.setAlpha(Math.max(0, s.life / 0.35));
      if (s.life <= 0) { s.s.destroy(); this.sparks.splice(i, 1); }
    }
  }

  finish() {
    this.phase = 'finishing';
    const place = this.finishOrder.indexOf(this.player) + 1;
    const kw = this.save.world.kart;
    kw.races += 1; if (place === 1) kw.wins += 1;
    const newBest = this.player.best != null && (kw.best == null || this.player.best < kw.best);
    if (newBest) kw.best = Math.round(this.player.best);
    writeSave(this.save);
    audio.quest(); haptic.success();
    hud.toast(place === 1 ? 'Chequered flag! You win!' : `Finished ${ord(place)}`);
    this.time.delayedCall(1500, () => {
      // let the others cross the line (or place them by distance)
      const rest = this.standings().filter(k => !k.finished);
      rest.forEach(k => { k.finished = true; k.time = null; this.finishOrder.push(k); });
      this.showResults(place, newBest);
    });
  }

  showResults(place, newBest) {
    this.phase = 'results';
    const box = $('kart-standings'); box.innerHTML = '';
    this.finishOrder.forEach((k, i) => {
      const row = document.createElement('div'); row.className = 'kart-row' + (k.isPlayer ? ' me' : '');
      const n = document.createElement('b'); n.textContent = ord(i + 1);
      const c = paintPortrait(k.id, 80);
      const name = document.createElement('span'); name.textContent = CHARACTERS[k.id].name;
      const t = document.createElement('small'); t.textContent = k.time != null ? fmt(k.time) : '+1 lap';
      row.append(n, c, name, t); box.appendChild(row);
    });
    $('kart-result-title').textContent = place === 1 ? 'You win!' : `${ord(place)} place`;
    const kw = this.save.world.kart;
    $('kart-result-sub').textContent = `Your best lap ${fmt(this.player.best)}${newBest ? ' · NEW RECORD' : ''} · Wins ${kw.wins}/${kw.races}`;
    $('kart-results').hidden = false;
    snapshot(this.game, data => { if (data) addPhoto(data, `Level 5 Karting · ${ord(place)} place`); });
    setTimeout(() => $('kart-again').focus(), 60);
  }

  leave() {
    audio.bus();
    const back = state.returnMap || 'forestville';
    this.cameras.main.fadeOut(500, 20, 20, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.save.player.map = back; writeSave(this.save); this.scene.start('world', { map: back, arrive: 'kart' }); });
  }
}
