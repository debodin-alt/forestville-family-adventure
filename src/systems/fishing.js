// Fishing mini-game: face the water, cast, wait for nibbles, press on the bite.
// Catch-and-release: every catch goes in the fish log and back in the water.

import { FISH, rollCatch } from '../data/fish.js';
import { paintFish } from '../art/fish.js';
import * as PROPS from '../art/props.js';
import { ART } from '../art/critters.js';
import { audio } from './audio.js';
import { haptic } from './input.js';
import { hud } from '../ui/hud.js';

const FACE = { down: [0, 1], up: [0, -1], side: [1, 0] };

export class Fishing {
  constructor(scene) {
    this.s = scene; this.active = false;
    if (!scene.textures.exists('bobber')) scene.textures.addCanvas('bobber', PROPS.bobber().canvas);
    if (!scene.textures.exists('fishshadow')) {
      const g = scene.make.graphics({ add: false });
      g.fillStyle(0x1d3a44, 0.45); g.fillEllipse(20, 9, 34, 13); g.fillTriangle(2, 9, -6 + 8, 2, -6 + 8, 16);
      g.generateTexture('fishshadow', 40, 18); g.destroy();
    }
    this.line = scene.add.graphics().setDepth(9e5);
  }

  facing() {
    const p = this.s.player;
    const [fx, fy] = FACE[p.dir];
    return [p.dir === 'side' && p.flip ? -fx : fx, fy];
  }

  // Where would a cast land, and is it fishable?
  spot() {
    const s = this.s, p = s.player;
    if (!s.save.world.items.rod || p.water === 2 || !s.map.fishWater) return null;
    const [fx, fy] = this.facing();
    for (const d of [70, 95, 55]) {
      const x = p.x + fx * d, y = p.y + fy * d * 0.8 + (fy === 0 ? 6 : 0);
      const w = s.map.fishWater(x, y);
      if (w) return { x, y, water: w };
    }
    return null;
  }

  tip() {
    const p = this.s.player, [fx, fy] = this.facing();
    return fy < 0 ? [p.x + 12, p.y - 70] : [p.x + fx * 30 + 8, p.y - 62 + fy * 6];
  }

  start(spot) {
    const s = this.s;
    if (spot.water === 'reserve') {
      s.api.say([['sign', 'Cabbage Tree Bay is an aquatic reserve, so there’s no fishing here.'], ['sign', 'It’s one of the best snorkelling spots in Sydney, though.']]);
      return;
    }
    this.active = true; this.spotInfo = spot; this.phase = 'cast'; this.t = 0;
    this.bob = s.add.image(...this.tip(), 'bobber').setScale(1.5 / ART).setOrigin(0.5, 0.8).setDepth(9e5);
    this.from = this.tip();
    audio.cast();
    s.player.faceToward(spot.x, spot.y);
  }

  press() {
    if (!this.active) return;
    if (this.phase === 'bite') return this.catch();
    if (this.phase === 'cast') return;
    // too early
    if (this.shadow) { hud.toast('Too soon! The fish swam off.'); this.fishFlee(); }
    else hud.toast('Reeled in.');
    audio.reel();
    this.end(500);
  }

  update(dt) {
    if (!this.active) return;
    const s = this.s, sp = this.spotInfo;
    this.t += dt;
    if (this.phase === 'cast') {
      const k = Math.min(1, this.t / 450);
      this.bob.setPosition(this.from[0] + (sp.x - this.from[0]) * k, this.from[1] + (sp.y - this.from[1]) * k - Math.sin(k * Math.PI) * 50);
      if (k >= 1) {
        this.phase = 'wait'; this.t = 0; this.waitFor = 1200 + Math.random() * 2600; audio.plop(); s.ripple(sp.x, sp.y, 0.7); s.splash(sp.x, sp.y, 4);
      }
    } else if (this.phase === 'wait') {
      this.bob.y = sp.y + Math.sin(this.t / 380) * 1.2;
      if (this.t > this.waitFor && !this.shadow) {
        const a = Math.random() * Math.PI * 2;
        this.shadow = s.add.image(sp.x + Math.cos(a) * 90, sp.y + Math.sin(a) * 50, 'fishshadow').setDepth(-3400).setAlpha(0);
        s.tweens.add({ targets: this.shadow, alpha: 1, duration: 400 });
        this.shadow.setRotation(Math.atan2(sp.y - this.shadow.y, sp.x - this.shadow.x));
        s.tweens.add({ targets: this.shadow, x: sp.x - Math.cos(a) * 16, y: sp.y - Math.sin(a) * 8, duration: 1600, ease: 'Sine.easeInOut' });
        this.nibbles = (Math.random() * 3) | 0; this.nextNibble = this.t + 1900;
      }
      if (this.shadow && this.t > this.nextNibble) {
        if (this.nibbles > 0) {
          this.nibbles--; this.nextNibble = this.t + 600 + Math.random() * 700;
          audio.nibble(); s.ripple(sp.x, sp.y, 0.4);
          s.tweens.add({ targets: this.bob, y: sp.y + 3, duration: 90, yoyo: true });
        } else {
          this.phase = 'bite'; this.t = 0;
          audio.bite(); haptic.light(); s.splash(sp.x, sp.y, 7, true); s.ripple(sp.x, sp.y, 1);
          this.bob.y = sp.y + 7; this.bob.setAlpha(0.55);
          this.bang = s.add.text(s.player.x, s.player.y - 96, '!', { fontFamily: 'ui-rounded, system-ui, sans-serif', fontSize: '34px', fontStyle: '900', color: '#fff8ea', stroke: '#c2643d', strokeThickness: 7 }).setOrigin(0.5).setDepth(9.6e5);
          s.tweens.add({ targets: this.bang, scale: { from: 0.4, to: 1 }, duration: 160, ease: 'Back.easeOut' });
        }
      }
    } else if (this.phase === 'bite') {
      this.bob.x = sp.x + Math.sin(this.t / 30) * 2;
      if (this.t > 950) { hud.toast('It got away!'); audio.gotAway(); this.fishFlee(); this.end(300); }
    }
    this.drawLine();
  }

  drawLine() {
    const g = this.line; g.clear();
    if (!this.active || !this.bob) return;
    const p = this.s.player, [fx, fy] = this.facing();
    const [tx, ty] = this.tip();
    const hx = p.x + (fy < 0 ? 6 : fx * 8), hy = p.y - 34;
    g.lineStyle(3.2, 0x6b4a33, 1); g.lineBetween(hx, hy, tx, ty);           // rod
    g.lineStyle(1.6, 0xf7f3e8, 0.95);                                            // line with a little sag
    const bx = this.bob.x, by = this.bob.y - 6;
    const mx = (tx + bx) / 2, my = Math.max(ty, by) + 18;
    g.beginPath(); g.moveTo(tx, ty);
    for (let i = 1; i <= 12; i++) { const k = i / 12, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k; g.lineTo(a * tx + b * mx + c * bx, a * ty + b * my + c * by); }
    g.strokePath();
  }

  fishFlee() {
    const sh = this.shadow; if (!sh) return;
    this.shadow = null;
    this.s.tweens.killTweensOf(sh);
    this.s.tweens.add({ targets: sh, x: sh.x + (Math.random() - 0.5) * 200, y: sh.y + (Math.random() - 0.5) * 120, alpha: 0, duration: 700, onComplete: () => sh.destroy() });
  }

  catch() {
    const s = this.s, sp = this.spotInfo;
    const id = rollCatch(sp.water), f = FISH[id];
    const size = Math.round(f.size[0] + Math.random() * (f.size[1] - f.size[0]));
    const log = s.save.world.fish;
    const isNew = !log[id];
    log[id] = { n: (log[id]?.n || 0) + 1, best: Math.max(log[id]?.best || 0, size) };
    s.persist();
    audio.reel();
    if (this.shadow) { this.shadow.destroy(); this.shadow = null; }
    // fish flies out of the water to the player
    const key = `fish-${id}`;
    if (!s.textures.exists(key)) s.textures.addCanvas(key, paintFish(f, 120, 76));
    const fish = s.add.image(sp.x, sp.y, key).setScale(0.35).setDepth(9.6e5);
    s.splash(sp.x, sp.y, 9, true);
    s.tweens.add({ targets: fish, x: s.player.x, y: { value: s.player.y - 90, ease: 'Quad.easeOut' }, scale: 0.55, angle: 360, duration: 520,
      onComplete: () => {
        audio.caught(f.rare); haptic.success(); s.player.jump();
        s.tweens.add({ targets: fish, y: fish.y - 10, duration: 300, yoyo: true, hold: 900, onComplete: () => s.tweens.add({ targets: fish, x: sp.x, y: sp.y, scale: 0.2, alpha: 0, duration: 450, onComplete: () => { fish.destroy(); s.splash(sp.x, sp.y, 5); } }) });
        hud.catchCard({ spec: f, size, isNew, count: Object.keys(log).length });
        s.afterCatch && s.afterCatch(sp.water);
      } });
    this.end(700, true);
  }

  end(ms, keepBob) {
    const s = this.s;
    this.phase = 'done';
    if (this.bang) { const b = this.bang; this.bang = null; s.tweens.add({ targets: b, alpha: 0, duration: 200, onComplete: () => b.destroy() }); }
    if (this.bob) { const b = this.bob; this.bob = null; s.tweens.add({ targets: b, alpha: 0, duration: 200, onComplete: () => b.destroy() }); }
    this.line.clear();
    s.time.delayedCall(ms, () => { this.active = false; });
    this.fishFlee();
  }
}
