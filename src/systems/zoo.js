// Zoo Rescue: five baby animals have wandered off around Taronga Zoo.
// Find each one, it follows you in a little conga line, and you walk it back
// to the gate of its enclosure. Carry as many at once as you like.

import { PENS, ZSPOTS } from '../data/maps/zoo.js';
import { CHARACTERS } from '../data/characters.js';
import { ZOO } from '../data/dialogue.js';
import { audio } from './audio.js';
import { haptic } from './input.js';
import { hud } from '../ui/hud.js';
import { ART } from '../art/critters.js';

export const BABIES = {
  koala:   { name: 'Baby koala', kind: 'koala', pen: 'koala', hide: [600, 1700], scale: 0.85, color: '#8a9096' },
  roo:     { name: 'Kangaroo joey', kind: 'roo', pen: 'roo', hide: [1660, 1790], scale: 0.85, color: '#c98e57', hop: true },
  penguin: { name: 'Penguin chick', kind: 'penguin', pen: 'penguin', hide: [ZSPOTS.fountain[0] + 80, ZSPOTS.fountain[1] + 16], scale: 0.85, color: '#3f73a6' },
  meerkat: { name: 'Meerkat pup', kind: 'meerkat', pen: 'meerkat', hide: [ZSPOTS.bins[0] + 50, ZSPOTS.bins[1] + 12], scale: 0.85, color: '#c8a878' },
  giraffe: { name: 'Giraffe calf', kind: 'giraffe', pen: 'giraffe', hide: [2430, 1700], scale: 0.85, color: '#e8b65a' },
};
export const BABY_IDS = Object.keys(BABIES);

export class ZooRescue {
  constructor(scene) {
    this.s = scene; this.babies = {}; this.followers = []; this.trail = [];
    if (scene.mapId !== 'zoo') return;
    const q = scene.save.quests.zoo;
    for (const id of BABY_IDS) {
      if (q.saved.includes(id)) continue;
      const b = BABIES[id], [x, y] = b.hide;
      const a = scene.ambient.addAnimal(`baby-${id}`, b.kind, x, y, { frames: [0, 0, 0, 1], fps: 2, scale: b.scale });
      a.mode = 'baby';
      this.babies[id] = { id, spec: b, a, state: 'hiding', hx: x, hy: y, t: Math.random() * 10, x, y };
    }
  }

  get active() { return this.s.mapId === 'zoo'; }
  get carrying() { return this.followers.length; }

  // Interactables for babies that are still hiding (used by the quest system).
  interactables() {
    return BABY_IDS.map(id => {
      const z = this;
      return {
        id: `baby-${id}`, verb: 'rescue', label: BABIES[id].name, r: 70, markerH: BABIES[id].kind === 'giraffe' ? 90 : 52,
        get x() { return z.babies[id]?.x ?? -999; }, get y() { return z.babies[id]?.y ?? -999; },
        when: () => z.babies[id]?.state === 'hiding',
        run: () => z.pickUp(id),
      };
    });
  }

  pickUp(id) {
    const s = this.s, b = this.babies[id]; if (!b || b.state !== 'hiding') return;
    if (!s.save.quests.zoo.met) { hud.say(ZOO.notYet(s.ctx())); return; }
    b.state = 'following';
    this.followers.push(b);
    if (!this.trail.length) this.trail.push({ x: s.player.x, y: s.player.y });
    audio.item(); haptic.light();
    this.hop(b);
    const who = s.player.id;
    s.bubble(ZOO.pickUp[who][this.followers.length % ZOO.pickUp[who].length], s.player, CHARACTERS[who].outfit);
    s.time.delayedCall(1200, () => hud.toast(`${b.spec.name} is following you! Take it to the ${PENS[b.spec.pen].sign.toLowerCase()} gate`, 3200));
    s.refresh();
  }

  hop(b) {
    const a = b.a;
    this.s.tweens.add({ targets: a, hopY: -16, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    for (let i = 0; i < 5; i++) {
      const m = this.s.add.image(a.x + (Math.random() - 0.5) * 30, a.y - 20 - Math.random() * 20, 'mote').setScale(2).setDepth(9.6e5).setBlendMode('ADD');
      this.s.tweens.add({ targets: m, y: m.y - 30, alpha: 0, duration: 600, delay: i * 50, onComplete: () => m.destroy() });
    }
  }

  // Walked a baby to its gate: it hops home over the fence.
  bringHome(b) {
    const s = this.s, q = s.save.quests.zoo, pen = PENS[b.spec.pen];
    this.followers = this.followers.filter(f => f !== b);
    b.state = 'home';
    if (!q.saved.includes(b.id)) q.saved.push(b.id);
    s.persist(true); s.refresh();
    const [x, y, w, h] = pen.rect;
    const tx = x + w / 2 + (Math.random() - 0.5) * w * 0.4, ty = y + h * 0.55;
    const a = b.a;
    a.spr.setDepth(ty);
    s.tweens.add({ targets: a, x: (a.x + tx) / 2, hopY: -70, duration: 380, ease: 'Quad.easeOut', onComplete: () => s.tweens.add({ targets: a, x: tx, y: ty, hopY: 0, duration: 420, ease: 'Quad.easeIn', onComplete: () => { a.mode = 'pen'; a.pen = [x + 30, y + 50, w - 60, h - 70]; a.sp = 30; a.pause = 2000; a.hop = b.spec.hop; a.frames = [0, 0, 0, 1]; this.hop(b); } }) });
    s.tweens.add({ targets: a, y: ty, duration: 800 });
    audio.pickup(); haptic.success(); s.zoomPulse(1.05, 800);
    const n = q.saved.length;
    hud.toast(`${b.spec.name} is home! ${n} of 5`, 2600);
    if (n >= BABY_IDS.length && !q.done) s.time.delayedCall(1400, () => s.zooDone());
  }

  update(dt) {
    if (!this.active) return;
    const s = this.s, p = s.player, sec = dt / 1000;
    // breadcrumb trail behind the player, which followers walk along
    const last = this.trail[this.trail.length - 1];
    if (this.followers.length && (!last || Math.hypot(p.x - last.x, p.y - last.y) > 6)) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > 200) this.trail.shift(); }
    for (const b of Object.values(this.babies)) {
      const a = b.a;
      b.t += sec;
      if (b.state === 'hiding') {
        // little fidgets on the spot; peeks up when you get close
        const near = Math.hypot(p.x - b.x, p.y - b.y) < 180;
        b.x = b.hx + Math.sin(b.t * 0.7) * 14; b.y = b.hy + Math.sin(b.t * 0.5) * 6;
        a.frames = near ? [0, 1, 0, 0] : [0, 0, 0, 1]; a.fps = near ? 3 : 2;
        a.spr.setFlipX(Math.cos(b.t * 0.7) < 0);
        if (near && !b.peeked) { b.peeked = true; this.hop(b); audio.blip(700); setTimeout(() => audio.blip(900), 90); }
        if (!near) b.peeked = false;
        a.hopY = a.hopY || 0;
      } else if (b.state === 'following') {
        const i = this.followers.indexOf(b);
        const back = (i + 1) * 6;      // trail points behind the player (6 px each)
        const t = this.trail[Math.max(0, this.trail.length - 1 - back)] || { x: p.x, y: p.y };
        const dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy);
        const moving = d > 3;
        if (moving) { const k = Math.min(1, sec * 7); b.x += dx * k; b.y += dy * k; a.spr.setFlipX(dx < 0); }
        const want = moving ? [2, 3] : [0, 0, 0, 1];
        if (a.frames.length !== want.length) { a.frames = want; a.fps = moving ? 7 : 2; }
        if (b.spec.hop && moving) a.hopY = -Math.abs(Math.sin(b.t * 9)) * 7;
        // reached the right gate?
        const [gx, gy] = PENS[b.spec.pen].gate;
        if (Math.hypot(p.x - gx, p.y - gy) < 120 || Math.hypot(b.x - gx, b.y - gy) < 90) { this.bringHome(b); continue; }
      } else continue;
      a.x = b.x; a.y = b.y;
      a.spr.setDepth(b.y);
    }
    // ambient sets the sprite position from a.x/a.y; add the hop offset afterwards
  }

  // called after ambient.update so the hop offset sticks
  late() {
    for (const b of Object.values(this.babies)) { if (b.a.hopY) b.a.spr.y = b.a.y + b.a.hopY; }
  }

  // Which babies are still out there (for Keeper Tui's hints).
  missing() { return BABY_IDS.filter(id => !this.s.save.quests.zoo.saved.includes(id) && this.babies[id]?.state !== 'following'); }
}

export const SCALE = 1 / ART;
