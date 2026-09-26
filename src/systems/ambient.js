// Ambient life: wildlife, water shimmer, drifting leaves, grass sway, traffic, light motes.
// Kept deliberately small (a few dozen sprites) for phones.

import { ANIMALS, ART } from '../art/critters.js';
import { car as paintCar } from '../art/props.js';
import { makeCanvas, ellipse, rng } from '../utils/canvas.js';
import { audio } from './audio.js';
import { SPOTS, G } from '../data/maps/forestville.js';
import { MSPOTS } from '../data/maps/manly.js';

function animalTexture(scene, kind) {
  const key = `ani-${kind}`;
  if (scene.textures.exists(key)) return key;
  const frames = ANIMALS[kind]();
  const w = frames[0].width, h = frames[0].height;
  const [c, ctx] = makeCanvas(w * frames.length, h);
  frames.forEach((f, i) => ctx.drawImage(f, i * w, 0));
  const tex = scene.textures.addCanvas(key, c);
  frames.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
  return key;
}

function smallTex(scene, key, w, h, fn) {
  if (scene.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(w, h); fn(ctx); scene.textures.addCanvas(key, c); return key;
}

export class Ambient {
  constructor(scene, map) {
    this.scene = scene; this.map = map; this.r = rng(9);
    this.animals = {}; this.butterflies = []; this.flock = []; this.leaves = []; this.cars = []; this.gulls = []; this.swimmers = [];
    this.nextFlock = 4000; this.nextLeaf = 0; this.nextCar = [1000, 3000];
    this.makeShared();
    if (map.id === 'forestville') this.forestville(); else this.manly();
    this.motes();
  }

  makeShared() {
    const s = this.scene;
    smallTex(s, 'sparkle', 12, 6, ctx => ellipse(ctx, 6, 3, 5, 1.6, 'rgba(255,255,255,.9)'));
    smallTex(s, 'leaf', 16, 8, ctx => { ellipse(ctx, 8, 4, 7, 2.4, '#8a9a5a', 0.2); ctx.strokeStyle = '#6d7b43'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(14, 3); ctx.stroke(); });
    smallTex(s, 'mote', 8, 8, ctx => { const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4); g.addColorStop(0, 'rgba(255,240,190,.9)'); g.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 8); });
    smallTex(s, 'tuft', 24 * ART, 20 * ART, ctx => {
      ctx.scale(ART, ART);
      for (let i = 0; i < 7; i++) { ctx.strokeStyle = i % 2 ? '#6f9a4f' : '#8fb866'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(12, 19); ctx.quadraticCurveTo(12 + (i - 3) * 2, 10, 12 + (i - 3) * 3.4, 2 + Math.abs(i - 3)); ctx.stroke(); }
    });
    smallTex(s, 'foam', 220, 18, ctx => {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); for (let x = 4; x <= 216; x += 4) ctx.lineTo(x, 9 + Math.sin(x / 14) * 3); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.stroke();
    });
    smallTex(s, 'dig', 60, 30, ctx => { for (let i = 0; i < 14; i++) ellipse(ctx, 30 + (Math.random() - 0.5) * 50, 15 + (Math.random() - 0.5) * 20, 3, 2, '#dcc08a'); });
  }

  // ---------- helpers ----------
  addAnimal(key, kind, x, y, opts = {}) {
    const tex = animalTexture(this.scene, kind);
    const spr = this.scene.add.sprite(x, y, tex, 0).setOrigin(0.5, opts.oy ?? 0.95).setScale(1 / ART * (opts.scale || 1)).setDepth(opts.depth ?? y);
    const a = { key, kind, spr, x, y, frames: opts.frames || [0], t: Math.random() * 1000, fps: opts.fps || 3, mode: opts.mode || 'idle', target: null, home: { x, y }, flip: !!opts.flip, ...opts };
    spr.setFlipX(a.flip);
    this.animals[key] = a;
    return a;
  }

  sparkleAt(x, y) {
    const s = this.scene.add.image(x, y, 'sparkle').setDepth(-4000).setAlpha(0);
    this.scene.tweens.add({ targets: s, alpha: { from: 0, to: 0.9 }, x: x + 6, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 2000, repeatDelay: Math.random() * 1500 });
  }

  tufts(n, ok) {
    let c = 0, t = 0;
    while (c < n && t++ < n * 20) {
      const x = this.r() * this.map.w, y = this.r() * this.map.h;
      if (!ok(x, y)) continue;
      const tf = this.scene.add.image(x, y, 'tuft').setOrigin(0.5, 0.95).setScale(1 / ART * (0.8 + this.r() * 0.5)).setDepth(y - 3);
      this.scene.tweens.add({ targets: tf, angle: { from: -4, to: 4 }, duration: 1400 + this.r() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: this.r() * 1000 });
      c++;
    }
  }

  butterfliesAround(points) {
    const tex = animalTexture(this.scene, 'butterfly');
    for (const [x, y] of points) {
      const b = this.scene.add.sprite(x, y, tex, 0).setScale(1 / ART).setDepth(y + 60);
      this.butterflies.push({ b, x, y, t: this.r() * 100, sp: 0.6 + this.r() * 0.5, rx: 40 + this.r() * 60, ry: 25 + this.r() * 30 });
    }
  }

  motes() {
    this.moteSprites = [];
    for (let i = 0; i < 14; i++) {
      const m = this.scene.add.image(0, 0, 'mote').setScrollFactor(0).setDepth(1e6).setAlpha(0.5).setBlendMode('ADD');
      this.moteSprites.push({ m, x: this.r(), y: this.r(), sp: 0.004 + this.r() * 0.006, ph: this.r() * 6 });
    }
  }

  // ---------- maps ----------
  forestville() {
    const s = this.scene, m = this.map;
    // pond ducks (swimming loops)
    this.pondDucks = [];
    for (let i = 0; i < 5; i++) {
      const a = this.addAnimal(`pd${i}`, 'duck', G.pond.x, G.pond.y, { frames: [0, 1], fps: 2, depth: -3000 });
      a.ang = this.r() * Math.PI * 2; a.rad = 0.3 + this.r() * 0.45; a.dir = this.r() > 0.5 ? 1 : -1; a.sp = 0.05 + this.r() * 0.06;
      this.pondDucks.push(a);
    }
    // quest animals
    this.addAnimal('nestDuck', 'duck', SPOTS.duckNest[0], SPOTS.duckNest[1], { frames: [2], fps: 1, flip: true });
    if (this.scene.save.quests.ch1.duckMoved) { const d = this.animals.nestDuck; d.x = G.pond.x + 120; d.y = G.pond.y - 60; d.mode = 'swim'; d.frames = [0, 1]; d.spr.setDepth(-3000); }
    const kx = SPOTS.kookaTree[0], ky = SPOTS.kookaTree[1];
    this.addAnimal('kooka', 'kookaburra', kx + 14, ky - 150, { frames: [0, 0, 0, 1], fps: 2, depth: ky + 5, oy: 1, flip: true });
    this.addAnimal('ibis', 'ibis', SPOTS.ibis[0], SPOTS.ibis[1], { frames: [0, 2, 0, 1], fps: 2.2 });
    if (this.scene.save.quests.ch1.feathers.includes('kooka')) this.animals.ibis.mode = 'wander';
    // shimmer
    for (let i = 0; i < 18; i++) { const a = this.r() * Math.PI * 2, d = Math.sqrt(this.r()) * 0.85; this.sparkleAt(G.pond.x + Math.cos(a) * G.pond.rx * d, G.pond.y + Math.sin(a) * G.pond.ry * d); }
    for (let i = 0; i < m.creek.length; i += 7) this.sparkleAt(m.creek[i][0], m.creek[i][1]);
    for (let i = 0; i < 5; i++) this.sparkleAt(180 + this.r() * 70, 80 + this.r() * 24);
    // grass sway
    this.tufts(70, (x, y) => m.surfaceAt(x, y) === 'grass' || m.surfaceAt(x, y) === 'leaves');
    this.butterfliesAround([[400, 2030], [1180, 2060], [960, 880], [1400, 800], [1700, 1150], [300, 1650], [2600, 400], [1900, 2000]]);
    this.lanes = [
      { y: 1334, dir: -1, x0: m.w + 120, x1: -120 },
      { y: 1368, dir: 1, x0: -120, x1: m.w + 120 },
    ];
    this.crossing = G.crossing;
  }

  manly() {
    const m = this.map;
    this.addAnimal('rockDuck', 'duck', MSPOTS.rockDuck[0], MSPOTS.rockDuck[1] + 6, { frames: [0, 1], fps: 2, depth: MSPOTS.rockDuck[1] });
    this.addAnimal('pelican', 'pelican', 1810, 1062, { frames: [0, 0, 0, 1], fps: 1.5 });
    // waves: foam lines that roll in and out along the shore
    this.foams = [];
    const shore = [];
    for (let x = 0; x < 1700; x += 190) shore.push([x + 100, 1082]);
    for (let x = 2180; x < 2560; x += 180) shore.push([x + 60, 950]);
    shore.push([1900, 1122]);
    for (const [x, y] of shore) {
      const f = this.scene.add.image(x, y, 'foam').setDepth(-3500).setAlpha(0.8);
      this.scene.tweens.add({ targets: f, y: y + 26, alpha: { from: 0.9, to: 0.2 }, scaleX: { from: 1, to: 1.12 }, duration: 2600 + this.r() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: this.r() * 2000 });
    }
    for (let i = 0; i < 50; i++) this.sparkleAt(this.r() * m.w, 1150 + this.r() * 640);
    for (let i = 0; i < 10; i++) this.sparkleAt(1880 + this.r() * 160, 940 + this.r() * 100);
    // swimmers between the flags
    const tex = animalTexture(this.scene, 'swimmer');
    for (let i = 0; i < 6; i++) {
      const x = 520 + this.r() * 440, y = 1130 + this.r() * 150;
      const sw = this.scene.add.sprite(x, y, tex, i % 2).setScale(1 / ART).setDepth(-3400);
      this.scene.tweens.add({ targets: sw, y: y + 5, duration: 1300 + this.r() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.swimmers.push({ sw, t: this.r() * 1000 });
    }
    // gulls on the sand
    for (let i = 0; i < 6; i++) {
      const a = this.addAnimal(`gull${i}`, 'gull', 200 + this.r() * 1400, 640 + this.r() * 360, { frames: [1], fps: 1, oy: 0.8 });
      a.mode = 'gull'; this.gulls.push(a);
    }
    this.tufts(20, (x, y) => m.surfaceAt(x, y) === 'leaves' || m.surfaceAt(x, y) === 'grass');
    this.butterfliesAround([[2350, 620], [2500, 400], [300, 450]]);
    this.lanes = [];
  }

  // ---------- update ----------
  update(dt, time, player, cam) {
    const s = this.scene, sec = dt / 1000;
    // animals
    for (const a of Object.values(this.animals)) {
      a.t += dt;
      const f = a.frames[Math.floor(a.t / 1000 * a.fps) % a.frames.length];
      if (a.spr.frame.name !== f) a.spr.setFrame(f);
      if (a.mode === 'walk' && a.target) {
        const dx = a.target.x - a.x, dy = a.target.y - a.y, d = Math.hypot(dx, dy);
        if (d < 4) { a.target = null; a.mode = a.after || 'idle'; if (a.mode === 'swim') { a.frames = [0, 1]; a.spr.setDepth(-3000); } }
        else { a.x += dx / d * 55 * sec; a.y += dy / d * 55 * sec; a.spr.setFlipX(dx < 0); a.spr.setDepth(a.y); }
      } else if (a.mode === 'wander') {
        if (!a.target || Math.random() < 0.002) a.target = { x: a.home.x + (Math.random() - 0.5) * 360, y: a.home.y + (Math.random() - 0.3) * 120 };
        const dx = a.target.x - a.x, dy = a.target.y - a.y, d = Math.hypot(dx, dy);
        if (d > 4) { a.x += dx / d * 30 * sec; a.y += dy / d * 30 * sec; a.spr.setFlipX(dx < 0); a.spr.setDepth(a.y); }
      } else if (a.mode === 'gull') {
        const pd = player ? Math.hypot(player.x - a.x, player.y - a.y) : 999;
        if (pd < 90 && !a.flying) { a.flying = true; a.frames = [0, 1]; a.fps = 8; a.vx = (a.x > player.x ? 1 : -1) * 160; a.vy = -120; audio.bird('gull'); }
        if (a.flying) { a.x += a.vx * sec; a.y += a.vy * sec; a.spr.setDepth(9e5); a.spr.setFlipX(a.vx < 0); if (a.y < -60 || a.x < -60 || a.x > this.map.w + 60) { a.flying = false; a.x = 200 + Math.random() * 1400; a.y = 640 + Math.random() * 360; a.frames = [1]; a.fps = 1; a.spr.setDepth(a.y); } }
        else if (Math.random() < 0.004) { a.x += (Math.random() - 0.5) * 20; a.spr.setFlipX(Math.random() < 0.5); a.spr.setDepth(a.y); }
      }
      a.spr.setPosition(a.x, a.y);
    }
    if (this.pondDucks) for (const d of this.pondDucks) {
      d.ang += d.sp * d.dir * sec;
      const x = G.pond.x + Math.cos(d.ang) * G.pond.rx * d.rad, y = G.pond.y + Math.sin(d.ang) * G.pond.ry * d.rad;
      d.spr.setFlipX(Math.sin(d.ang) * d.dir > 0); d.x = x; d.y = y; d.spr.setPosition(x, y);
    }
    // butterflies
    for (const b of this.butterflies) {
      b.t += sec * b.sp;
      b.b.setPosition(b.x + Math.sin(b.t) * b.rx, b.y + Math.sin(b.t * 1.7) * b.ry - 20 + Math.sin(b.t * 9) * 2);
      b.b.setFrame(Math.floor(time / 90) % 2);
    }
    // flocks overhead
    this.nextFlock -= dt;
    if (this.nextFlock <= 0 && cam) {
      this.nextFlock = 11000 + Math.random() * 10000;
      const kind = this.map.id === 'manly' ? 'gull' : (Math.random() < 0.55 ? 'cockatoo' : 'lorikeet');
      const tex = animalTexture(s, kind);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const v = cam.worldView;
      const y0 = v.y + v.height * (0.15 + Math.random() * 0.4);
      const n = 3 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const b = s.add.sprite(dir > 0 ? v.x - 60 - i * 40 : v.right + 60 + i * 40, y0 + (Math.random() - 0.5) * 60, tex, 0).setDepth(9e5 + i).setScale(1 / ART).setFlipX(dir < 0);
        this.flock.push({ b, vx: dir * (130 + Math.random() * 40), ph: Math.random() * 6 });
      }
      audio.bird(kind === 'gull' ? 'gull' : kind);
    }
    for (let i = this.flock.length - 1; i >= 0; i--) {
      const f = this.flock[i];
      f.ph += sec * 9;
      f.b.x += f.vx * sec; f.b.y += Math.sin(f.ph * 0.3) * 0.3;
      f.b.setFrame(Math.floor(f.ph) % 2);
      if (cam && (f.b.x < cam.worldView.x - 400 || f.b.x > cam.worldView.right + 400)) { f.b.destroy(); this.flock.splice(i, 1); }
    }
    // leaves drift when the player is in the bush
    const surf = player ? this.map.surfaceAt(player.x, player.y) : null;
    const inBush = surf === 'leaves' || (surf === 'gravel' && this.map.id === 'forestville' && player.y < 1236);
    if (cam && inBush) {
      this.nextLeaf -= dt;
      if (this.nextLeaf <= 0 && this.leaves.length < 10) {
        this.nextLeaf = 500 + Math.random() * 700;
        const v = cam.worldView;
        const l = s.add.image(v.x + Math.random() * v.width, v.y - 10, 'leaf').setDepth(9e5 - 1).setAngle(Math.random() * 360);
        this.leaves.push({ l, vx: 12 + Math.random() * 20, vy: 28 + Math.random() * 18, rot: (Math.random() - 0.5) * 90, life: 9000, ph: Math.random() * 6 });
      }
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const L = this.leaves[i];
      L.ph += sec * 2; L.life -= dt;
      L.l.x += (L.vx + Math.sin(L.ph) * 18) * sec; L.l.y += L.vy * sec; L.l.angle += L.rot * sec;
      L.l.setAlpha(Math.min(1, L.life / 1500));
      if (L.life <= 0) { L.l.destroy(); this.leaves.splice(i, 1); }
    }
    // traffic
    this.updateTraffic(dt, player);
    // motes
    if (this.moteSprites) {
      const W = s.scale.width, H = s.scale.height;
      for (const m of this.moteSprites) {
        m.y -= m.sp * sec * 3; m.ph += sec;
        if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        m.m.setPosition((m.x + Math.sin(m.ph * 0.5) * 0.02) * W, m.y * H).setAlpha(0.25 + Math.sin(m.ph) * 0.2);
      }
    }
  }

  updateTraffic(dt, player) {
    if (!this.lanes || !this.lanes.length) return;
    const s = this.scene, sec = dt / 1000;
    const colours = ['#d8453b', '#2f6fa3', '#f2f0e8', '#3f7a54', '#e9a33c', '#6f54a8', '#5b6770'];
    this.lanes.forEach((lane, li) => {
      this.nextCar[li] -= dt;
      if (this.nextCar[li] <= 0 && this.cars.filter(c => c.lane === li).length < 3) {
        this.nextCar[li] = 4500 + Math.random() * 6000;
        const col = colours[(Math.random() * colours.length) | 0];
        const key = `car-${col}-${lane.dir}`;
        if (!s.textures.exists(key)) s.textures.addCanvas(key, paintCar(col, lane.dir).canvas);
        const spr = s.add.image(lane.x0, lane.y, key).setOrigin(0.5, 62 / 70).setScale(1 / ART).setDepth(lane.y);
        this.cars.push({ spr, lane: li, x: lane.x0, v: 150, max: 140 + Math.random() * 40 });
        if (player && Math.abs(player.x - lane.x0) < 900) audio.bird('car');
      }
    });
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i], lane = this.lanes[c.lane], dir = lane.dir;
      let stop = false;
      if (player) {
        const ahead = (player.x - c.x) * dir;
        const inRoad = player.y > lane.y - 60 && player.y < lane.y + 22;
        if (inRoad && ahead > 0 && ahead < 170) stop = true;
        const cr = this.crossing;
        const onCrossing = player.x > cr.x - 40 && player.x < cr.x + cr.w + 40 && player.y > cr.y - 50 && player.y < cr.y + cr.h + 50;
        const toCrossing = ((cr.x + cr.w / 2) - c.x) * dir;
        if (onCrossing && toCrossing > 40 && toCrossing < 220) stop = true;
      }
      for (const o of this.cars) if (o !== c && o.lane === c.lane) { const gap = (o.x - c.x) * dir; if (gap > 0 && gap < 140) stop = true; }
      const target = stop ? 0 : c.max;
      c.v += (target - c.v) * Math.min(1, sec * (stop ? 4 : 1.2));
      c.x += c.v * dir * sec;
      c.spr.x = c.x;
      if ((dir > 0 && c.x > lane.x1) || (dir < 0 && c.x < lane.x1)) { c.spr.destroy(); this.cars.splice(i, 1); }
    }
  }

  // ---------- quest hooks ----------
  walkTo(key, x, y, after = 'idle') {
    const a = this.animals[key]; if (!a) return;
    a.mode = 'walk'; a.target = { x, y }; a.after = after; a.frames = [2, 3]; a.fps = 6;
  }
  wander(key) { const a = this.animals[key]; if (a) { a.mode = 'wander'; a.home = { x: a.x, y: a.y }; } }
  laugh() {
    const k = this.animals.kooka; if (!k) return;
    k.frames = [0, 2]; k.fps = 8; audio.bird('kookaburra');
    this.scene.time.delayedCall(1500, () => { k.frames = [0, 0, 0, 1]; k.fps = 2; });
  }
}
