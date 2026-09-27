// One scene class runs any map (Forestville, Manly). Everything map-specific comes from data.

import * as PROPS from '../art/props.js';
import { ART } from '../art/critters.js';
import { makeCanvas } from '../utils/canvas.js';
import { ART_VERSION, groundChunks, groundKeys, propArgs, propKey } from '../art/assets.js';
import { forestville } from '../data/maps/forestville.js';
import { manly, MSPOTS } from '../data/maps/manly.js';
import { harbour, HSPOTS } from '../data/maps/harbour.js';
import { SEA_LIFE } from '../data/fish.js';
import { Fishing } from '../systems/fishing.js';
import { music } from '../systems/music.js';
import { daylight } from '../systems/daylight.js';
import { snapshot, addPhoto } from '../systems/photos.js';
import { FAMILY, CHARACTERS } from '../data/characters.js';
import { Critter } from '../entities/Critter.js';
import { Collision } from '../systems/collision.js';
import { Ambient } from '../systems/ambient.js';
import { audio } from '../systems/audio.js';
import { readMove, takeAction, haptic, isTouch } from '../systems/input.js';
import { writeSave } from '../systems/save.js';
import { objective, buildInteractables, onEnterMap, onFeatherCollected, talkTo, onMove, onSpot, onCatch } from '../systems/quests.js';
import { hud } from '../ui/hud.js';
import { state } from '../state.js';

const MAPS = { forestville, manly, harbour };
const THEME = { forestville: 'forestville', manly: 'manly', harbour: 'harbour' };
const TALL = new Set(['gum', 'roundTree', 'norfolkPine', 'house', 'shop', 'school', 'grassTree', 'lifeguardTower']);

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  init(data) {
    this.save = state.save;
    this.mapId = data.map || this.save.player.map || 'forestville';
    this.arriving = !!data.arrive;
    this.arriveKind = data.arrive;
    this.busy = false;
  }

  // Load pre-baked art for this map if it matches the current art version (see tools/bake.mjs).
  preload() {
    if (state.noBake) return;
    const map = MAPS[this.mapId];
    const queue = m => {
      if (!m || m.version !== ART_VERSION) { state.noBake = true; return; }
      state.bakeMeta = state.bakeMeta || {};
      for (const f of m.files) {
        if (f.maps && !f.maps.includes(map.id)) continue;
        state.bakeMeta[f.key] = f.meta || null;
        if (!this.textures.exists(f.key)) this.load.image(f.key, `assets/baked/${f.file}`);
      }
    };
    if (state.bakeManifest) queue(state.bakeManifest);
    else {
      this.load.json('bake-manifest', `assets/baked/manifest.json?v=${ART_VERSION}`);
      this.load.once('filecomplete-json-bake-manifest', (key, type, data) => { state.bakeManifest = data; queue(data); });
    }
    this.load.on('loaderror', f => { if (f.key === 'bake-manifest') state.noBake = true; });
  }

  create() {
    const map = this.map = MAPS[this.mapId];
    state.scene = this;
    this.cameras.main.setBackgroundColor(map.bg);
    // free the previous map's ground (safe now: its images were destroyed with the old scene)
    for (const k of this.textures.getTextureKeys()) if (/-g-\d+-\d+$/.test(k) && !k.startsWith(`${map.id}-g-`)) this.textures.remove(k);
    const t0 = performance.now();
    this.paintGround(map);
    const t1 = performance.now();
    const propShapes = this.placeProps(map);
    const t2 = performance.now();
    state.timings = { ground: Math.round(t1 - t0), props: Math.round(t2 - t1) };
    this.colOpts = { canSwim: () => !!this.save.world.items.snorkel };
    this.collision = new Collision(map.w, map.h, [...map.colliders(this.colOpts), ...propShapes]);

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

    const t3 = performance.now();
    this.ambient = new Ambient(this, map);
    state.timings.critters = Math.round(t3 - t2); state.timings.ambient = Math.round(performance.now() - t3);
    this.fishing = new Fishing(this);
    this.makeLampGlow();
    music.play(THEME[map.id]);
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

    this.makeWaterFx();
    // characters are solid: you bump into family and neighbours instead of walking through them
    this.bumpCheck = (x, y, ox, oy) => {
      for (const c of [...Object.values(this.family), ...Object.values(this.npcs)]) {
        const d = Math.hypot(c.x - x, (c.y - y) * 1.7), was = Math.hypot(c.x - ox, (c.y - oy) * 1.7);
        if (d < 24 && d < was) return true;
      }
      return false;
    };
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
    const keys = groundKeys(map);
    if (!keys.every(k => this.textures.exists(k))) {
      for (const k of keys) if (this.textures.exists(k)) this.textures.remove(k);
      for (const { key, canvas } of groundChunks(map)) this.textures.addCanvas(key, canvas);
    }
    for (const k of keys) {
      const [, i, j] = /-g-(\d+)-(\d+)$/.exec(k);
      this.add.image(+i * 1024, +j * 1024, k).setOrigin(0).setDepth(-10000);
    }
  }

  placeProps(map) {
    const shapes = [];
    this.tall = []; this.lamps = [];
    for (const p of map.buildProps()) {
      const args = propArgs(p);
      const key = propKey(p.kind, args);
      let meta = this.textures.exists(key) ? (this.textures.get(key).customData.meta || state.bakeMeta?.[key]) : null;
      if (!meta) {
        if (this.textures.exists(key)) this.textures.remove(key);
        const res = PROPS[p.kind](...args);
        const tex = this.textures.addCanvas(key, res.canvas);
        meta = { ax: res.ax, ay: res.ay, collide: res.collide, flat: res.flat, w: res.canvas.width / ART, h: res.canvas.height / ART };
        tex.customData.meta = meta;
      }
      const img = this.add.image(p.x - meta.ax, p.y - meta.ay, key).setOrigin(0).setScale(1 / ART).setDepth(meta.flat ? -5000 + p.y * 0.01 : p.y);
      if (p.kind === 'lamp') (this.lamps || (this.lamps = [])).push([p.x, p.y]);
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
    const fallback = this.arriving ? ((this.arriveKind === 'kart' && map.kartStop) || map.arriveAt || map.spawn) : (map.family[who] || map.spawn);
    if (!this.arriving && s.map === map.id && Number.isFinite(s.x) && Number.isFinite(s.y)) {
      const c = new Collision(map.w, map.h, map.colliders(this.colOpts));
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
      karts: () => scene.travelKart(),
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
      photo4: () => scene.photo4(),
      creak: () => audio.creak(),
      horn: () => audio.horn(),
      busk: () => scene.busk(),
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

  travelKart() {
    if (this.busy) return;
    this.busy = true;
    audio.bus();
    hud.toast('Next stop: Moore Park');
    state.returnMap = this.mapId;
    this.persist(true);
    this.cameras.main.fadeOut(700, 20, 20, 24);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('kart'));
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
    q.photo = true; q.done = true; this.save.quests.ch3.unlocked = true;
    this.persist(true); this.refresh();
    this.time.delayedCall(350, () => this.capture('Family photo · Shelly Beach lookout'));
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

  photo4() {
    const q = this.save.quests.ch4;
    const [sx, sy] = HSPOTS.steps;
    this.busy = true;
    hud.flash(); audio.camera();
    const spots = { dan: [sx - 70, sy], finn: [sx - 25, sy + 12], jessia: [sx + 25, sy + 12], jarency: [sx + 70, sy] };
    this.player.setPosition(...spots[this.player.id]); this.player.dir = 'down';
    for (const [id, c] of Object.entries(this.family)) { c.setPosition(...spots[id]); c.home = { x: c.x, y: c.y }; c.dir = 'down'; c.jump(); }
    this.player.jump();
    this.camTarget.x = sx; this.camTarget.y = sy - 80;
    q.photo = true; q.done = true;
    this.persist(true); this.refresh();
    this.time.delayedCall(350, () => this.capture('Family photo · Harbour steps'));
    this.time.delayedCall(900, () => {
      audio.quest(); haptic.success();
      hud.showEnding({
        eyebrow: 'Chapter 4 complete · The End (for now)',
        title: 'Harbour Day',
        text: 'Feathers found, a duck at the beach, a groper friend, a busking debut and a fish off the wharf. Same time next weekend?',
        button: 'Keep exploring',
        onButton: () => { this.busy = false; },
      });
    });
  }

  busk() {
    // a few strummed chords from Jess's guitar
    [[196, 247, 294], [165, 196, 247], [131, 165, 196], [147, 185, 220]].forEach((ch, i) => ch.forEach((f, k) => this.time.delayedCall(i * 420 + k * 25, () => audio.tone && audio.ok && audio.tone({ f: f * 2, type: 'triangle', dur: 0.6, vol: 0.05 }))));
    this.time.delayedCall(1700, () => { audio.sparkle(); hud.toast('+ $4.50 and one very confident gull'); });
  }

  capture(caption) {
    snapshot(this.game, data => { if (data && addPhoto(data, caption)) hud.toast('Photo saved to the album'); });
  }

  takePhoto() {
    if (this.busy) return;
    hud.flash(); audio.camera(); haptic.light();
    const area = this.map.areas.find(a => a.id === this.areaId);
    const name = area ? area.name.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()) : 'Out and about';
    this.capture(`${name} · ${daylight.name}`);
  }

  afterCatch(water) { onCatch(this.api, water); }

  spot(id) {
    const fresh = onSpot(this.api, id);
    audio.spot(); haptic.light();
    hud.catchCard({ spec: SEA_LIFE[id], spotted: true, isNew: fresh, count: this.save.quests.ch3.spotted.length });
    if (fresh) this.emphasize(this.ambient.creatures[id].x, this.ambient.creatures[id].y);
  }

  makeLampGlow() {
    const key = 'lampglow';
    if (!this.textures.exists(key)) {
      const [c, ctx] = makeCanvas(128, 128);
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,225,150,.9)'); g.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); this.textures.addCanvas(key, c);
    }
    this.glows = [];
    for (const [x, y] of this.lamps) {
      this.glows.push(this.add.image(x, y - 100, key).setScale(0.7).setDepth(9e5 - 2).setBlendMode('ADD').setAlpha(0));
      this.glows.push(this.add.image(x, y, key).setScale(1.3, 0.55).setDepth(-3000).setBlendMode('ADD').setAlpha(0));
    }
    this.glowT = 0;
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
    audio.pop(); if (id === 'finn') this.time.delayedCall(120, () => audio.honk());
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
    // sea life while snorkelling
    if (this.player.water === 2 && this.ambient.creatures) {
      for (const cr of Object.values(this.ambient.creatures)) {
        const dist = Math.hypot(cr.x - x, cr.y - y);
        if (dist < 110 && dist < bd) { bd = dist; best = { id: `spot-${cr.id}`, verb: 'spot', label: this.save.quests.ch3.spotted.includes(cr.id) ? SEA_LIFE[cr.id].name : 'Something’s down there', x: cr.x, y: cr.y, markerH: 30, spot: cr.id }; }
      }
    }
    // fishing: only when nothing else is in reach
    if (!best) {
      const f = this.fishing.spot();
      if (f) best = { id: `fish-${f.water}`, verb: 'fish', label: f.water === 'reserve' ? 'Marine reserve' : 'Cast a line', x: f.x, y: f.y, markerH: 26, fish: f };
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
    daylight.tick(dt);
    this.glowT -= dt;
    if (this.glowT <= 0) { this.glowT = 900; const a = daylight.dark * 0.85; for (const g of this.glows) g.setAlpha(a); }
    if (this.talkingWas !== hud.talking) { this.talkingWas = hud.talking; music.setDuck(hud.talking); }
    const fishing = this.fishing.active;
    const locked = hud.talking || hud.menuOpen || hud.endingOpen || hud.albumOpen || this.busy || fishing;
    hud.el.app.classList.toggle('fishing', fishing);

    // NPCs
    const blocked = (x, y) => this.collision.blocked(x, y) || Math.hypot(this.player.x - x, (this.player.y - y) * 1.7) < 24;
    for (const c of [...Object.values(this.family), ...Object.values(this.npcs)]) {
      const [vx, vy] = c.brain(dt, locked ? null : this.player, blocked);
      c.update(dt, vx, vy, time);
    }

    let mx = 0, my = 0;
    if (fishing) {
      this.fishing.update(dt);
      if (takeAction()) { if (hud.talking) hud.advance(); else this.fishing.press(); }
    } else if (locked) {
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
    const [nx, ny] = this.collision.move(p.x, p.y, this.vel.x * dt / 1000, this.vel.y * dt / 1000, this.bumpCheck);
    p.x = nx; p.y = ny;
    const moved = Math.hypot(nx - ox, ny - oy);
    p.update(dt, moved > 0.2 ? (nx - ox) / dt * 1000 : 0, moved > 0.2 ? (ny - oy) / dt * 1000 : 0, time);
    if (moved > 0.2) {
      this.moved = true;
      this.stepDist += moved;
      if (this.stepDist > 34) {
        this.stepDist = 0;
        const surf = this.map.surfaceAt(p.x, p.y);
        audio.step(surf === 'deep' ? 'swim' : surf);
        if (p.water) this.splash(p.x, p.y, p.water === 2 ? 3 : 4);
      }
      onMove(this.api, p.x, p.y);
    }
    this.updateWater(dt, moved > 0.2);

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
      else if (near.fish) this.fishing.start(near.fish);
      else if (near.spot) this.spot(near.spot);
      else { p.faceToward(near.x, near.y); near.run(); }
    }

    this.ambient.update(dt, time, p, this.cameras.main);

    if (this.moved && time - this.lastSave > 5000) { this.moved = false; this.persist(); }
  }

  // ---------- water: wading, swimming, ripples, splashes ----------
  makeWaterFx() {
    const tex = (key, w, h, fn) => { if (this.textures.exists(key)) return; const [c, ctx] = makeCanvas(w, h); fn(ctx); this.textures.addCanvas(key, c); };
    tex('ripple', 72, 28, ctx => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(36, 14, 32, 11, 0, 0, 7); ctx.stroke(); });
    tex('waterline', 56, 22, ctx => {
      ctx.fillStyle = 'rgba(90,165,185,.62)'; ctx.beginPath(); ctx.ellipse(28, 11, 26, 9, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(28, 11, 25, 8.5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    });
    tex('drop', 8, 8, ctx => { ctx.fillStyle = 'rgba(235,250,255,.95)'; ctx.beginPath(); ctx.arc(4, 4, 3, 0, 7); ctx.fill(); });
    tex('snorkel', 40 * ART, 30 * ART, ctx => {
      ctx.scale(ART, ART);
      ctx.fillStyle = '#2fb3a6'; ctx.beginPath(); ctx.roundRect(4, 12, 32, 5, 2.5); ctx.fill();
      ctx.fillStyle = 'rgba(170,225,240,.85)'; ctx.strokeStyle = '#1f6f8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(9, 8, 22, 12, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(33, 16); ctx.lineTo(34, 2); ctx.stroke();
    });
    this.waterline = this.add.image(0, 0, 'waterline').setVisible(false);
    this.mask = this.add.image(0, 0, 'snorkel').setScale(1 / ART).setVisible(false);
    this.rippleT = 0; this.bubbleT = 0;
  }

  splash(x, y, n = 6, big = false) {
    for (let i = 0; i < n; i++) {
      const d = this.add.image(x + (Math.random() - 0.5) * 16, y - 4, 'drop').setDepth(y + 2).setScale(big ? 1.2 : 0.8);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (big ? 46 : 26) + Math.random() * 20;
      this.tweens.add({ targets: d, x: d.x + Math.cos(a) * v, y: { value: d.y + Math.sin(a) * v * 0.6 + 10, ease: 'Quad.easeIn' }, alpha: 0, duration: 420 + Math.random() * 200, onComplete: () => d.destroy() });
    }
  }

  ripple(x, y, scale = 1) {
    const r = this.add.image(x, y, 'ripple').setDepth(-3500).setScale(0.35 * scale).setAlpha(0.85);
    this.tweens.add({ targets: r, scale: 1.3 * scale, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }

  updateWater(dt, moving) {
    const p = this.player;
    const surf = this.map.surfaceAt(p.x, p.y);
    const lvl = surf === 'deep' ? 2 : surf === 'water' ? 1 : 0;
    if (lvl !== p.water) {
      if (lvl > p.water) { this.splash(p.x, p.y, 10, true); audio.splash(lvl === 2); }
      else if (lvl === 0) audio.step('water');
      p.setWater(lvl);
    }
    for (const c of Object.values(this.family)) { const s2 = this.map.surfaceAt(c.x, c.y); c.setWater(s2 === 'deep' ? 2 : s2 === 'water' ? 1 : 0); }
    const inWater = p.water > 0;
    this.waterline.setVisible(inWater);
    if (inWater) {
      const w = p.water === 2 ? 1.25 : 1;
      this.waterline.setPosition(p.x, p.y + 2).setDepth(p.y + 0.5).setScale(w * (1 + Math.sin(this.time.now / 300) * 0.04), w);
      this.rippleT -= dt;
      if (this.rippleT <= 0) { this.rippleT = moving ? 260 : 1100; this.ripple(p.x, p.y + 2, p.water === 2 ? 1.2 : 0.9); }
    }
    const snorkel = p.water === 2;
    if (snorkel !== this.underwater) { this.underwater = snorkel; music.play(snorkel ? 'underwater' : THEME[this.mapId]); }
    this.mask.setVisible(snorkel);
    if (snorkel) {
      const headY = p.y + p.sink - (p.id === 'finn' ? 54 : 50) + Math.sin(p.phase * 1.3) * 1.5;
      this.mask.setPosition(p.x + (p.dir === 'side' ? (p.flip ? -4 : 4) : 0), headY).setDepth(p.y + 1).setFlipX(p.dir === 'side' && p.flip);
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) {
        this.bubbleT = 500 + Math.random() * 600;
        const b = this.add.image(p.x + 10, headY - 12, 'drop').setDepth(p.y + 2).setScale(0.7);
        this.tweens.add({ targets: b, y: b.y - 26, x: b.x + (Math.random() - 0.5) * 8, alpha: 0, duration: 900, onComplete: () => b.destroy() });
      }
    }
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
