// One scene class runs any map (Forestville, Manly). Everything map-specific comes from data.

import * as PROPS from '../art/props.js';
import { ART } from '../art/critters.js';
import { makeCanvas } from '../utils/canvas.js';
import { forestville } from '../data/maps/forestville.js';
import { manly, MSPOTS } from '../data/maps/manly.js';
import { FAMILY, CHARACTERS } from '../data/characters.js';
import { Critter } from '../entities/Critter.js';
import { Collision } from '../systems/collision.js';
import { Ambient } from '../systems/ambient.js';
import { audio } from '../systems/audio.js';
import { readMove, takeAction, haptic, isTouch } from '../systems/input.js';
import { writeSave } from '../systems/save.js';
import { objective, buildInteractables, onEnterMap, onFeatherCollected, talkTo, onMove } from '../systems/quests.js';
import { hud } from '../ui/hud.js';
import { state } from '../state.js';

const MAPS = { forestville, manly };
const SCALABLE = new Set(['gum', 'roundTree', 'shrub', 'fern', 'grassTree', 'rock', 'norfolkPine']);
const TALL = new Set(['gum', 'roundTree', 'norfolkPine', 'house', 'shop', 'school', 'grassTree', 'lifeguardTower']);
const CHUNK = 1024;

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  init(data) {
    this.save = state.save;
    this.mapId = data.map || this.save.player.map || 'forestville';
    this.arriving = !!data.arrive;
    this.busy = false;
  }

  create() {
    const map = this.map = MAPS[this.mapId];
    state.scene = this;
    this.cameras.main.setBackgroundColor(map.bg);
    // free the previous map's ground (safe now: its images were destroyed with the old scene)
    for (const k of this.textures.getTextureKeys()) if (/-g-\d+-\d+$/.test(k) && !k.startsWith(`${map.id}-g-`)) this.textures.remove(k);
    this.paintGround(map);
    const propShapes = this.placeProps(map);
    this.collision = new Collision(map.w, map.h, [...map.colliders(), ...propShapes]);

    // player + family + neighbours
    const who = this.save.player.who;
    let [px, py] = this.startPosition(map, who);
    this.player = new Critter(this, who, px, py);
    this.family = {};
    const famPos = this.familyPositions(map);
    for (const id of FAMILY) if (id !== who) {
      const [x, y] = famPos[id];
      const c = new Critter(this, id, x, y); c.wander = 28; this.family[id] = c;
    }
    this.npcs = {};
    for (const n of map.npcs) { const c = new Critter(this, n.id, n.x, n.y); c.wander = n.wander; this.npcs[n.id] = c; }

    this.ambient = new Ambient(this, map);
    this.pickups = {};
    this.api = this.makeApi();
    this.interactables = buildInteractables(this.api);
    this.restorePickups();

    // marker above the nearest interactable
    const mk = PROPS.marker();
    if (!this.textures.exists('marker')) this.textures.addCanvas('marker', mk.canvas);
    this.marker = this.add.image(0, 0, 'marker').setOrigin(0.5, 1).setScale(1 / ART).setDepth(9.5e5).setVisible(false);

    // camera
    const cam = this.cameras.main;
    // let the camera run a little past the edges so HUD never hides edge content
    cam.setBounds(0, -170, map.w, map.h + 170 + 150);
    this.add.rectangle(-200, -600, map.w + 400, 600, Phaser.Display.Color.HexStringToColor(map.edgeTop).color).setOrigin(0).setDepth(-10001);
    this.add.rectangle(-200, map.h, map.w + 400, 600, Phaser.Display.Color.HexStringToColor(map.edgeBottom).color).setOrigin(0).setDepth(-10001);
    this.camTarget = { x: px, y: py - 30 };
    cam.startFollow(this.camTarget, false, 1, 1);
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));
    cam.fadeIn(600, 255, 244, 220);

    this.vel = { x: 0, y: 0 };
    this.stepDist = 0; this.lastSave = 0; this.areaId = null; this.areaCheck = 0; this.focus = null; this.fadeCheck = 0;
    this.moved = false;

    hud.setActive(who);
    this.refresh();
    this.checkArea(true);
    onEnterMap(this.api);
    if (state.notice) { const n = state.notice; state.notice = null; this.time.delayedCall(1200, () => hud.toast(n, 4200)); }
  }

  // ---------- setup helpers ----------
  paintGround(map) {
    const nx = Math.ceil(map.w / CHUNK), ny = Math.ceil(map.h / CHUNK);
    const k0 = `${map.id}-g-0-0`;
    if (!this.textures.exists(k0)) {
      const [big, ctx] = makeCanvas(map.w, map.h);
      map.paintGround(ctx);
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const w = Math.min(CHUNK, map.w - i * CHUNK), h = Math.min(CHUNK, map.h - j * CHUNK);
        const [c, cx] = makeCanvas(w, h);
        cx.drawImage(big, i * CHUNK, j * CHUNK, w, h, 0, 0, w, h);
        this.textures.addCanvas(`${map.id}-g-${i}-${j}`, c);
      }
      big.width = big.height = 1; // release memory quickly (iOS)
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) this.add.image(i * CHUNK, j * CHUNK, `${map.id}-g-${i}-${j}`).setOrigin(0).setDepth(-10000);
  }

  placeProps(map) {
    const shapes = [];
    this.tall = [];
    for (const p of map.buildProps()) {
      const args = [...p.args];
      if (SCALABLE.has(p.kind) && typeof args[args.length - 1] === 'number' && args.length > 1) args[args.length - 1] = Math.round(args[args.length - 1] / 0.15) * 0.15;
      const key = `prop-${p.kind}-${JSON.stringify(args)}`;
      let meta = this.textures.exists(key) ? this.textures.get(key).customData.meta : null;
      if (!meta) {
        const res = PROPS[p.kind](...args);
        const tex = this.textures.addCanvas(key, res.canvas);
        meta = { ax: res.ax, ay: res.ay, collide: res.collide, flat: res.flat, w: res.canvas.width / ART, h: res.canvas.height / ART };
        tex.customData.meta = meta;
      }
      const img = this.add.image(p.x - meta.ax, p.y - meta.ay, key).setOrigin(0).setScale(1 / ART).setDepth(meta.flat ? -5000 + p.y * 0.01 : p.y);
      if (TALL.has(p.kind)) this.tall.push({ img, x: p.x - meta.ax, y: p.y - meta.ay, w: meta.w, h: meta.h, base: p.y });
      const c = meta.collide;
      if (c) {
        if (c.rect) shapes.push({ rect: [p.x + c.rect[0], p.y + c.rect[1], c.rect[2], c.rect[3]] });
        else if (c.rx) shapes.push({ ellipse: [p.x, p.y + (c.y || 0), c.rx, c.ry] });
        else if (c.r) shapes.push({ circle: [p.x, p.y + (c.y || 0), c.r] });
      }
    }
    return shapes;
  }

  startPosition(map, who) {
    const s = this.save.player;
    const fallback = this.arriving ? (map.arriveAt || map.spawn) : (map.family[who] || map.spawn);
    if (!this.arriving && s.map === map.id && Number.isFinite(s.x) && Number.isFinite(s.y)) {
      const c = new Collision(map.w, map.h, map.colliders());
      if (!c.blocked(s.x, s.y)) return [s.x, s.y];
    }
    return fallback;
  }

  familyPositions(map) {
    const q = this.save.quests;
    if (map.id === 'forestville' && q.ch1.done && !q.ch2.done) {
      return { dan: [2900, 1190], finn: [2950, 1205], jessia: [3040, 1195], jarency: [2860, 1210] };
    }
    if (map.id === 'manly' && q.ch2.photo) {
      const [lx, ly] = MSPOTS.lookout;
      return { dan: [lx - 60, ly + 10], finn: [lx - 20, ly + 20], jessia: [lx + 20, ly + 20], jarency: [lx + 60, ly + 10] };
    }
    return map.family;
  }

  restorePickups() {
    if (this.mapId !== 'forestville') return;
    const c1 = this.save.quests.ch1, has = f => c1.feathers.includes(f);
    const S = { ...this.map };
    if (c1.duckMoved && !has('pond')) this.api.spawnFeather('pond', 1405, 504, false, true);
    if (c1.sandDug && !has('school')) this.api.spawnFeather('school', 1845, 1745, false, true);
    if (c1.bev === 3 && !has('bev')) this.api.spawnFeather('bev', 1184, 2120, false, true);
    if (c1.ledge && !has('bush')) this.api.spawnFeather('bush', 190, 200, false, true);
  }

  applyZoom() {
    const dpr = state.dpr;
    const w = this.scale.width / dpr, h = this.scale.height / dpr;
    const m = Math.min(w, h), M = Math.max(w, h);
    // slightly wide exploration view; landscape phones see a little more
    let z = Math.max(0.62, Math.min(1.0, m / 640));
    if (M / m > 1.9 && w > h) z *= 0.95;
    this.baseZoom = z * dpr;
    this.cameras.main.setZoom(this.baseZoom * (this.zoomBoost || 1));
  }

  // ---------- API passed to the quest system ----------
  makeApi() {
    const scene = this;
    return {
      get save() { return scene.save; },
      get who() { return scene.player.id; },
      get mapId() { return scene.mapId; },
      get player() { return scene.player; },
      ctx: (npcId) => scene.ctx(npcId),
      say: (lines, then) => hud.say(lines, then),
      delay: (ms, fn) => scene.time.delayedCall(ms, fn),
      persist: () => scene.persist(true),
      refresh: () => scene.refresh(),
      toast: t => hud.toast(t),
      showTitle: (a, b) => hud.showTitle(a, b),
      emphasize: (x, y) => scene.emphasize(x, y),
      travel: id => scene.travel(id),
      animal: key => scene.ambient.animals[key],
      walkAnimal: (key, x, y) => scene.ambient.walkTo(key, x, y, 'swim'),
      wanderAnimal: key => scene.ambient.wander(key),
      spawnFeather: (id, x, y, fromPlayer, quiet) => scene.spawnFeather(id, x, y, fromPlayer, quiet),
      hasPickup: id => !!scene.pickups[id],
      npcPos: id => scene.npcs[id] || scene.family[id] || scene.player,
      itemGet: name => { audio.item(); hud.toast(`Got ${name}`); },
      dig: (x, y) => scene.dig(x, y),
      quack: () => audio.quack(),
      laugh: () => scene.ambient.laugh(),
      chime: () => audio.item(),
      celebrate: small => { if (small) audio.item(); else { audio.quest(); haptic.success(); } },
      photo: () => scene.photo(),
    };
  }

  ctx(npcId) {
    const t = this.save.world.talked;
    const key = npcId ? `${npcId}` : 'misc';
    const times = t[key] || 0;
    t[key] = times + 1;
    return { who: this.player.id, name: CHARACTERS[this.player.id].name, area: this.areaId, map: this.mapId, q: this.save.quests, n: this.save.quests.ch1.feathers.length, times };
  }

  refresh() { hud.setQuest(objective(this.save)); }

  persist(force) {
    this.save.player.who = this.player.id;
    this.save.player.map = this.mapId;
    this.save.player.x = Math.round(this.player.x); this.save.player.y = Math.round(this.player.y);
    const r = writeSave(this.save);
    if (r === 'warn') hud.toast('Saving isn’t available in this browser mode. Progress will reset when you close the page.', 4500);
    this.lastSave = this.time.now;
  }

  // ---------- world actions ----------
  spawnFeather(id, x, y, fromPlayer = false, quiet = false) {
    if (this.pickups[id]) return;
    const res = PROPS.featherItem();
    if (!this.textures.exists('feather')) { const t = this.textures.addCanvas('feather', res.canvas); }
    const spr = this.add.image(x, y, 'feather').setOrigin(0.5, 0.9).setScale(1 / ART).setDepth(y);
    const glow = this.add.image(x, y - 10, 'mote').setScale(6).setAlpha(0.5).setDepth(y - 1).setBlendMode('ADD');
    this.tweens.add({ targets: spr, y: y - 8, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.6 }, scale: { from: 5, to: 7 }, duration: 900, yoyo: true, repeat: -1 });
    if (!quiet) { spr.setScale(0); this.tweens.add({ targets: spr, scale: 1 / ART, duration: 380, ease: 'Back.easeOut' }); this.emphasize(x, y); audio.item(); }
    this.pickups[id] = { spr, glow, x, y };
    this.interactables.push({
      id: `pickup-${id}`, verb: 'collect', label: 'Lucky feather', x, y, r: 60, markerH: 44,
      when: () => !!this.pickups[id],
      run: () => this.collect(id),
    });
  }

  collect(id) {
    const p = this.pickups[id]; if (!p) return;
    delete this.pickups[id];
    this.tweens.killTweensOf(p.spr); this.tweens.killTweensOf(p.glow);
    this.tweens.add({ targets: p.spr, x: this.player.x, y: this.player.y - 70, scale: 1.4 / ART, duration: 260, ease: 'Quad.easeOut', onComplete: () => this.tweens.add({ targets: p.spr, alpha: 0, y: '-=30', duration: 300, onComplete: () => p.spr.destroy() }) });
    this.tweens.add({ targets: p.glow, alpha: 0, duration: 300, onComplete: () => p.glow.destroy() });
    audio.pickup(); haptic.success();
    this.player.jump();
    this.zoomPulse();
    onFeatherCollected(this.api, id);
  }

  dig(x, y) {
    for (let i = 0; i < 3; i++) {
      const d = this.add.image(x + (i - 1) * 20, y, 'dig').setDepth(y + 1);
      this.tweens.add({ targets: d, y: y - 20, alpha: 0, duration: 600, delay: i * 120, onComplete: () => d.destroy() });
    }
    audio.step('sand'); this.time.delayedCall(150, () => audio.step('sand'));
  }

  emphasize(x, y) {
    this.focus = { x, y, until: this.time.now + 1500 };
    this.zoomPulse(1.08, 1400);
  }

  zoomPulse(k = 1.05, ms = 600) {
    if (this.zoomTween) this.zoomTween.stop();
    this.zoomBoost = 1;
    this.zoomTween = this.tweens.add({ targets: this, zoomBoost: k, duration: ms * 0.4, yoyo: true, hold: ms * 0.3, ease: 'Sine.easeInOut', onUpdate: () => this.cameras.main.setZoom(this.baseZoom * this.zoomBoost) });
  }

  travel(mapId) {
    if (this.busy) return;
    this.busy = true;
    audio.bus();
    hud.toast(mapId === 'manly' ? 'Next stop: Manly' : 'Next stop: Forestville');
    this.persist(true);
    this.cameras.main.fadeOut(700, 255, 244, 220);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.save.player.map = mapId; this.save.player.x = null; this.save.player.y = null;
      writeSave(this.save);
      this.scene.restart({ map: mapId, arrive: true });
    });
  }

  photo() {
    const q = this.save.quests.ch2;
    const [lx, ly] = MSPOTS.lookout;
    this.busy = true;
    this.cameras.main.flash(500, 255, 255, 255);
    audio.camera();
    const spots = { dan: [lx - 60, ly + 10], finn: [lx - 20, ly + 22], jessia: [lx + 20, ly + 22], jarency: [lx + 60, ly + 10] };
    this.player.setPosition(...spots[this.player.id]); this.player.dir = 'down';
    for (const [id, c] of Object.entries(this.family)) { c.setPosition(...spots[id]); c.home = { x: c.x, y: c.y }; c.dir = 'down'; c.jump(); }
    this.player.jump();
    q.photo = true; q.done = true;
    this.persist(true); this.refresh();
    this.time.delayedCall(900, () => {
      audio.quest(); haptic.success();
      hud.showEnding({
        eyebrow: 'Chapter 2 complete',
        title: 'Family Day Out',
        text: 'Five lucky feathers, one beach duck, and a family photo above Shelly Beach. Not a bad Saturday.',
        button: 'Keep exploring',
        onButton: () => { this.busy = false; },
      });
    });
  }

  switchTo(id) {
    if (id === this.player.id || hud.talking || this.busy || !this.family[id]) return;
    const old = this.player, next = this.family[id];
    delete this.family[id];
    old.wander = 28; old.home = { x: old.x, y: old.y }; old.target = null;
    this.family[old.id] = old;
    this.player = next; next.target = null; next.jump();
    this.vel = { x: 0, y: 0 };
    this.save.player.who = id;
    this.persist(true);
    hud.setActive(id);
    hud.toast(`Now playing as ${CHARACTERS[id].name}`);
    audio.item();
  }

  // ---------- per-frame ----------
  checkArea(first) {
    const { x, y } = this.player;
    const a = this.map.areas.find(a => a.rect ? (x >= a.rect[0] && x <= a.rect[0] + a.rect[2] && y >= a.rect[1] && y <= a.rect[1] + a.rect[3]) : pointInPoly(x, y, a.poly));
    if (!a || a.id === this.areaId) return;
    this.areaId = a.id;
    audio.setZone(a.amb);
    const seen = this.save.world.areasSeen;
    if (!a.quiet || first) {
      hud.showTitle(a.name, first && this.mapId === 'manly' ? 'Manly · Northern Beaches' : first ? 'Forestville · Northern Beaches' : '');
      if (!seen.includes(`${this.mapId}:${a.id}`)) { seen.push(`${this.mapId}:${a.id}`); if (!first) this.zoomPulse(1.04, 900); }
    }
  }

  nearest() {
    const { x, y } = this.player;
    let best = null, bd = Infinity;
    const consider = (d, dist) => { if (dist < d.r && dist < bd) { bd = dist; best = d; } };
    for (const d of this.interactables) {
      if (d.when && !d.when()) continue;
      consider(d, Math.hypot(d.x - x, (d.y - y) * 1.3));
    }
    for (const [id, c] of [...Object.entries(this.family), ...Object.entries(this.npcs)]) {
      const dist = Math.hypot(c.x - x, (c.y - y) * 1.3);
      if (dist < 70 && dist < bd) { bd = dist; best = { id: `talk-${id}`, verb: 'talk', label: CHARACTERS[id].name, x: c.x, y: c.y, markerH: 96, talk: id, critter: c }; }
    }
    return best;
  }

  update(time, delta) {
    const perf0 = window.__perf ? performance.now() : 0;
    this.tick(time, delta);
    if (window.__perf) window.__perf.push(performance.now() - perf0);
  }

  tick(time, delta) {
    const dt = Math.min(delta, 50);
    hud.tick(dt);
    audio.tick(time);
    const locked = hud.talking || hud.menuOpen || hud.endingOpen || this.busy;

    // NPCs
    const blocked = (x, y) => this.collision.blocked(x, y);
    for (const c of [...Object.values(this.family), ...Object.values(this.npcs)]) {
      const [vx, vy] = c.brain(dt, locked ? null : this.player, blocked);
      c.update(dt, vx, vy, time);
    }

    let mx = 0, my = 0;
    if (locked) {
      if (takeAction()) hud.advance();
    } else {
      [mx, my] = readMove();
    }
    const sp = CHARACTERS[this.player.id].speed;
    const k = 1 - Math.exp(-dt * 0.018);
    this.vel.x += (mx * sp - this.vel.x) * k;
    this.vel.y += (my * sp - this.vel.y) * k;
    if (Math.abs(this.vel.x) < 1 && !mx) this.vel.x = 0;
    if (Math.abs(this.vel.y) < 1 && !my) this.vel.y = 0;
    const p = this.player;
    const ox = p.x, oy = p.y;
    const [nx, ny] = this.collision.move(p.x, p.y, this.vel.x * dt / 1000, this.vel.y * dt / 1000);
    p.x = nx; p.y = ny;
    const moved = Math.hypot(nx - ox, ny - oy);
    p.update(dt, moved > 0.2 ? (nx - ox) / dt * 1000 : 0, moved > 0.2 ? (ny - oy) / dt * 1000 : 0, time);
    if (moved > 0.2) {
      this.moved = true;
      this.stepDist += moved;
      if (this.stepDist > 34) { this.stepDist = 0; audio.step(this.map.surfaceAt(p.x, p.y)); }
      onMove(this.api, p.x, p.y);
    }

    // camera target (eases toward focus points)
    const f = this.focus && time < this.focus.until ? this.focus : null;
    const tx = f ? f.x : p.x + this.vel.x * 0.25, ty = (f ? f.y : p.y + this.vel.y * 0.25) - 30;
    const ck = 1 - Math.exp(-dt * (f ? 0.004 : 0.007));
    this.camTarget.x += (tx - this.camTarget.x) * ck;
    this.camTarget.y += (ty - this.camTarget.y) * ck;

    // area titles and ambience
    this.areaCheck -= dt;
    if (this.areaCheck <= 0) { this.areaCheck = 250; this.checkArea(false); this.fadeOccluders(); }

    // interaction prompt
    const near = locked ? null : this.nearest();
    hud.prompt(near, isTouch());
    if (near) {
      const bob = Math.sin(time / 220) * 3;
      this.marker.setVisible(true).setPosition(near.critter ? near.critter.x : near.x, (near.critter ? near.critter.y : near.y) - near.markerH + bob);
    } else this.marker.setVisible(false);
    if (!locked && takeAction() && near) {
      audio.tap();
      if (near.talk) { const c = near.critter; c.faceToward(p.x, p.y); p.faceToward(c.x, c.y); talkTo(this.api, near.talk); }
      else { p.faceToward(near.x, near.y); near.run(); }
    }

    this.ambient.update(dt, time, p, this.cameras.main);

    if (this.moved && time - this.lastSave > 5000) { this.moved = false; this.persist(); }
  }

  // Tall props in front of the player go translucent so you never lose your character.
  fadeOccluders() {
    const { x, y } = this.player;
    for (const t of this.tall) {
      const over = t.base > y + 4 && x > t.x + 6 && x < t.x + t.w - 6 && y - 40 > t.y && y - 60 < t.base;
      const a = over ? 0.55 : 1;
      if (t.img.alpha !== a) this.tweens.add({ targets: t.img, alpha: a, duration: 220 });
    }
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
