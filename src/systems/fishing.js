// Snorkel fishing: dive into any water, swim around, look for clues
// (bubbles, a splash, a fin), swim over and grab! Hold it up, cheer, let it go.
// Catch-and-release: every catch goes in the fish log and back in the water.

import { FISH, rollCatch } from '../data/fish.js';
import { paintFish } from '../art/fish.js';
import { audio } from './audio.js';
import { haptic } from './input.js';
import { hud } from '../ui/hud.js';
import { CATCH_LINES, MISS_LINES, JUNK_LINES } from '../data/dialogue.js';
import { CHARACTERS } from '../data/characters.js';

const FACE = { down: [0, 1], up: [0, -1], side: [1, 0] };
const CLUES = { pond: ['bubbles', 'splash', 'bubbles'], creek: ['bubbles', 'splash'], surf: ['fin', 'splash', 'bubbles'], harbour: ['fin', 'bubbles', 'splash'] };
const pick = a => a[(Math.random() * a.length) | 0];

export class Fishing {
  constructor(scene) {
    this.s = scene; this.busy = false; this.swimming = false; this.clues = []; this.spawnT = 600;
    const g = scene.make.graphics({ add: false });
    if (!scene.textures.exists('fishshadow')) { g.fillStyle(0x1d3a44, 0.5); g.fillEllipse(22, 9, 34, 13); g.fillTriangle(6, 9, 0, 2, 0, 16); g.generateTexture('fishshadow', 40, 18); g.clear(); }
    if (!scene.textures.exists('fin')) { g.fillStyle(0x5d6f7a, 1); g.fillTriangle(0, 22, 12, 0, 22, 22); g.fillStyle(0xffffff, 0.35); g.fillTriangle(9, 6, 12, 1, 13, 10); g.generateTexture('fin', 24, 24); }
    g.destroy();
  }

  get active() { return this.busy; }   // the scene locks normal input while busy

  facing() {
    const p = this.s.player, [fx, fy] = FACE[p.dir];
    return [p.dir === 'side' && p.flip ? -fx : fx, fy];
  }

  // Standing at the edge facing water? Return where you'd land.
  canDive() {
    const s = this.s, p = s.player;
    if (this.swimming || this.busy || !s.map.fishWater) return null;
    const [fx, fy] = this.facing();
    for (const d of [70, 95, 50]) {
      const x = p.x + fx * d, y = p.y + fy * d * 0.8 + (fy === 0 ? 6 : 0);
      const w = s.map.fishWater(x, y);
      if (w) return { x, y, water: w };
    }
    // already wading in it
    const here = p.water ? s.map.fishWater(p.x + fx * 30, p.y + fy * 24) : null;
    return here ? { x: p.x + fx * 30, y: p.y + fy * 24, water: here } : null;
  }

  // ---------- diving in ----------
  dive(spot) {
    const s = this.s, p = s.player;
    if (!s.save.world.items.snorkel) {
      s.api.say([['sign', 'You’ll need a mask and snorkel to dive in.'], [p.id, s.mapId === 'forestville' ? 'There’s snorkel gear in the garden shed at home.' : 'Our snorkel gear is back in the shed at home.']]);
      return;
    }
    this.busy = true; this.water = spot.water;
    p.faceToward(spot.x, spot.y);
    const from = { x: p.x, y: p.y };
    audio.whoosh(true);
    s.tweens.addCounter({
      from: 0, to: 1, duration: 520, ease: 'Sine.easeInOut',
      onUpdate: tw => { const k = tw.getValue(); p.x = from.x + (spot.x - from.x) * k; p.y = from.y + (spot.y - from.y) * k; p.extraY = -Math.sin(k * Math.PI) * 46; p.sync(); },
      onComplete: () => {
        p.extraY = 0; this.swimming = true; s.collision.swim = true;
        p.setWater(2);
        s.splash(p.x, p.y, 14, true); s.splash(p.x, p.y, 8, true); s.ripple(p.x, p.y, 1.4); s.ripple(p.x, p.y, 0.8);
        audio.splash(true); haptic.light();
        s.cameras.main.shake(120, 0.002);
        if (spot.water === 'reserve') hud.toast('Marine reserve: no catching here, just look!', 3200);
        else if (!s.save.world.divedOnce) { s.save.world.divedOnce = true; hud.toast('Look for bubbles, splashes or a fin, then swim over and grab!', 4200); }
        this.spawnT = 400;
        s.time.delayedCall(250, () => { this.busy = false; });
      },
    });
  }

  exit() {
    const s = this.s, p = s.player;
    this.swimming = false; s.collision.swim = false;
    this.clearClues();
    s.splash(p.x, p.y, 6); audio.step('water'); p.jump && setTimeout(() => p.jump(), 0);
  }

  // ---------- clues in the water ----------
  spawnClue() {
    const s = this.s, p = s.player;
    if (this.water === 'reserve') return;
    for (let t = 0; t < 30; t++) {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 200;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.75;
      if (x < 20 || y < 20 || x > s.map.w - 20 || y > s.map.h - 20) continue;
      if (s.map.fishWater(x, y) !== this.water) continue;
      if (this.clues.some(c => Math.hypot(c.x - x, c.y - y) < 90)) continue;
      const type = pick(CLUES[this.water] || ['bubbles']);
      const id = rollCatch(this.water);
      const c = { x, y, type, id, t: Math.random() * 10, next: 0, objs: [] };
      c.shadow = s.add.image(x, y, 'fishshadow').setDepth(-3400).setAlpha(0).setScale(FISH[id].junk ? 0.7 : 0.9 + Math.random() * 0.4);
      s.tweens.add({ targets: c.shadow, alpha: type === 'fin' ? 0.2 : 0.45, duration: 600 });
      if (type === 'fin') c.fin = s.add.image(x, y, 'fin').setOrigin(0.5, 1).setDepth(y + 1).setAlpha(0);
      if (c.fin) s.tweens.add({ targets: c.fin, alpha: 1, duration: 500 });
      this.clues.push(c);
      return;
    }
  }

  clearClues() {
    for (const c of this.clues) this.removeClue(c, true);
    this.clues = [];
  }

  removeClue(c, quick) {
    const s = this.s;
    for (const o of [c.shadow, c.fin, ...c.objs]) if (o && o.scene) s.tweens.add({ targets: o, alpha: 0, duration: quick ? 150 : 400, onComplete: () => o.destroy() });
  }

  nearClue() {
    if (!this.swimming || this.busy) return null;
    const p = this.s.player;
    let best = null, bd = 60;
    for (const c of this.clues) { const d = Math.hypot(c.x - p.x, (c.y - p.y) * 1.2); if (d < bd) { bd = d; best = c; } }
    return best;
  }

  updateClue(c, dt) {
    const s = this.s;
    c.t += dt / 1000;
    const wx = c.x + Math.cos(c.t * 1.3) * 12, wy = c.y + Math.sin(c.t * 1.7) * 6;
    c.shadow.setPosition(wx, wy).setRotation(Math.atan2(Math.cos(c.t * 1.7) * 6 * 1.7, -Math.sin(c.t * 1.3) * 12 * 1.3));
    c.next -= dt;
    if (c.type === 'bubbles' && c.next <= 0) {
      c.next = 320 + Math.random() * 300;
      for (let i = 0; i < 3; i++) {
        const b = s.add.image(wx + (Math.random() - 0.5) * 16, wy, 'drop').setDepth(wy + 2).setScale(1.3 + Math.random() * 0.9);
        s.tweens.add({ targets: b, y: b.y - 18 - Math.random() * 10, x: b.x + (Math.random() - 0.5) * 6, alpha: 0, duration: 800, onComplete: () => b.destroy() });
      }
      if (Math.random() < 0.5) s.ripple(wx, wy, 0.45);
    }
    if (c.type === 'fin') {
      const fx = c.x + Math.cos(c.t * 1.6) * 24, fy = c.y + Math.sin(c.t * 1.6) * 12;
      c.fin.setPosition(fx, fy).setDepth(fy + 1).setFlipX(Math.sin(c.t * 1.6) > 0);
      if (c.next <= 0) { c.next = 260; s.ripple(fx, fy + 2, 0.3); }
    }
    if (c.type === 'splash' && c.next <= 0) {
      c.next = 1600 + Math.random() * 1600;
      const key = this.fishTex(c.id);
      const f = s.add.image(wx, wy, key).setScale(0.22).setDepth(wy + 3);
      s.splash(wx, wy, 5); audio.ok && audio.burst({ freq: 1600, q: 0.6, dur: 0.12, vol: 0.04 });
      const dir = Math.random() < 0.5 ? -1 : 1;
      s.tweens.add({ targets: f, x: wx + dir * 30, y: { value: wy - 30, ease: 'Quad.easeOut', yoyo: true }, angle: dir * 160, duration: 420, onComplete: () => { s.splash(f.x, wy, 6); s.ripple(f.x, wy, 0.6); f.destroy(); } });
    }
  }

  fishTex(id) {
    const key = `fish-${id}`;
    if (!this.s.textures.exists(key)) this.s.textures.addCanvas(key, paintFish(FISH[id], 120, 76));
    return key;
  }

  // ---------- grab! ----------
  grab(c) {
    const s = this.s, p = s.player, f = FISH[c.id];
    this.busy = true;
    this.clues = this.clues.filter(x => x !== c);
    const swimSink = p.sinkTarget;
    // duck under
    p.sinkTarget = 100;
    audio.splash(false);
    s.splash(p.x, p.y, 8, true);
    const from = { x: p.x, y: p.y };
    s.tweens.addCounter({ from: 0, to: 1, duration: 450, onUpdate: tw => { const k = tw.getValue(); p.x = from.x + (c.x - from.x) * k; p.y = from.y + (c.y - from.y) * k; } });
    for (let i = 0; i < 6; i++) s.time.delayedCall(i * 90, () => { const b = s.add.image(p.x + (Math.random() - 0.5) * 20, p.y - 4, 'drop').setDepth(p.y + 3); s.tweens.add({ targets: b, y: b.y - 24, alpha: 0, duration: 700, onComplete: () => b.destroy() }); });
    this.removeClue(c, true);
    const ok = f.junk || Math.random() < 0.85;
    s.time.delayedCall(700, () => {
      // pop back up!
      p.sinkTarget = swimSink; p.sink = Math.min(p.sink, swimSink + 30);
      s.splash(p.x, p.y, 12, true); s.ripple(p.x, p.y, 1.2);
      audio.splash(true);
      if (ok) this.celebrate(c.id); else this.miss();
    });
  }

  celebrate(id) {
    const s = this.s, p = s.player, f = FISH[id];
    const size = Math.round(f.size[0] + Math.random() * (f.size[1] - f.size[0]));
    const log = s.save.world.fish, isNew = !log[id];
    log[id] = { n: (log[id]?.n || 0) + 1, best: Math.max(log[id]?.best || 0, size) };
    s.persist();
    // hold it up high
    p.dir = 'down'; p.setFrameNow && p.setFrameNow();
    const headY = () => p.y + p.sink - (p.id === 'finn' ? 66 : 74);
    const fish = s.add.image(p.x, headY() - 18, this.fishTex(id)).setScale(0.1).setDepth(9.6e5);
    s.tweens.add({ targets: fish, scale: f.size[1] < 20 ? 0.8 : 0.62, y: headY() - 34, duration: 260, ease: 'Back.easeOut' });
    s.tweens.add({ targets: fish, angle: { from: -14, to: 14 }, duration: 160, yoyo: true, repeat: 7, delay: 260 });
    const sparkleAt = () => { for (let i = 0; i < 6; i++) { const m = s.add.image(p.x + (Math.random() - 0.5) * 70, headY() - 30 + (Math.random() - 0.5) * 40, 'mote').setScale(2).setDepth(9.6e5).setBlendMode('ADD'); s.tweens.add({ targets: m, alpha: 0, scale: 0.5, duration: 600, delay: i * 40, onComplete: () => m.destroy() }); } };
    sparkleAt();
    const line = f.junk ? pick(JUNK_LINES[p.id]) : pick(CATCH_LINES[p.id]);
    s.bubble(line, p, f.rare ? '#f2c230' : null);
    audio.caught(f.rare); this.cheer(p.id);
    haptic.success(); s.zoomPulse(1.06, 900);
    s.time.delayedCall(1500, () => hud.catchCard({ spec: f, size, isNew, count: Object.keys(log).length }));
    // let it go
    s.time.delayedCall(2300, () => {
      const [fx, fy] = this.facing();
      const tx = p.x + (fx || 0.6) * 60, ty = p.y + fy * 30 + 10;
      s.tweens.add({ targets: fish, x: tx, y: { value: ty, ease: 'Quad.easeIn' }, angle: 300, scale: 0.25, duration: 500, onComplete: () => { s.splash(tx, ty, 8); s.ripple(tx, ty, 0.8); audio.plop(); fish.destroy(); } });
      this.busy = false; this.spawnT = 1500;
      s.afterCatch && s.afterCatch(this.water);
    });
  }

  miss() {
    const s = this.s, p = s.player;
    s.bubble(pick(MISS_LINES[p.id]), p);
    audio.gotAway();
    const sh = s.add.image(p.x, p.y + 4, 'fishshadow').setDepth(-3400).setAlpha(0.45);
    s.tweens.add({ targets: sh, x: p.x + (Math.random() - 0.5) * 260, y: p.y + (Math.random() - 0.5) * 140, alpha: 0, duration: 800, onComplete: () => sh.destroy() });
    s.time.delayedCall(900, () => { this.busy = false; this.spawnT = 800; });
  }

  // little excited voice chirps (plus a honk for Finn)
  cheer(id) {
    if (id === 'finn') { audio.honk(); setTimeout(() => audio.honk(), 260); return; }
    const v = CHARACTERS[id].voice;
    [1, 1.12, 1.25, 1.5].forEach((m, i) => setTimeout(() => audio.blip(v * m), i * 80));
  }

  update(dt) {
    const s = this.s, p = s.player;
    if (!this.swimming) return;
    for (const c of this.clues) this.updateClue(c, dt);
    // drop clues that drifted far behind
    for (const c of [...this.clues]) if (Math.hypot(c.x - p.x, c.y - p.y) > 520) { this.removeClue(c, true); this.clues = this.clues.filter(x => x !== c); }
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.clues.length < 3) { this.spawnT = 1200 + Math.random() * 1800; this.spawnClue(); }
    // climbed out onto land?
    if (!this.busy) {
      const surf = s.map.surfaceAt(p.x, p.y);
      if (surf !== 'water' && surf !== 'deep') this.exit();
    }
  }
}
