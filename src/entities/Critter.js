// Animated character: idle/walk, three facings (side is mirrored), blink,
// squash & stretch, soft shadow, and y-sorted depth.

import { ART, FW, FH, GROUND, DIRS, FRAMES, paintCritterSheet } from '../art/critters.js';
import { CHARACTERS } from '../data/characters.js';
import { addCritterFrames } from '../art/assets.js';

export function ensureCritterTexture(scene, id) {
  const key = `crit-${id}`;
  const tex = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.addCanvas(key, paintCritterSheet(id));
  addCritterFrames(tex);   // works for painted canvases and baked images
  for (const d of DIRS) {
    const k = `${id}-walk-${d}`;
    if (!scene.anims.exists(k)) scene.anims.create({ key: k, frames: [0, 1, 2, 3].map(i => ({ key, frame: `${d}-walk${i}` })), frameRate: 9, repeat: -1 });
  }
  return key;
}

export function ensureShadow(scene) {
  if (scene.textures.exists('shadow')) return;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x2b3a22, 0.28); g.fillEllipse(24, 10, 44, 16);
  g.generateTexture('shadow', 48, 20); g.destroy();
}

export class Critter {
  constructor(scene, id, x, y) {
    this.scene = scene; this.id = id; this.def = CHARACTERS[id];
    this.key = ensureCritterTexture(scene, id);
    ensureShadow(scene);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(y - 1);
    this.sprite = scene.add.sprite(x, y, this.key, 'down-idle0').setOrigin(0.5, GROUND / FH);
    this.base = 1 / ART;
    this.sprite.setScale(this.base);
    this.x = x; this.y = y; this.dir = 'down'; this.flip = false;
    this.moving = false; this.phase = Math.random() * 10; this.blinkAt = 0; this.hop = 0;
    this.water = 0; this.sink = 0; this.sinkTarget = 0;
    // simple wander brain for NPCs
    this.home = { x, y }; this.wander = 0; this.target = null; this.pause = 1000 + Math.random() * 2000;
    this.sync();
  }

  setPosition(x, y) { this.x = x; this.y = y; this.sync(); }

  face(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) * 0.8) { this.dir = 'side'; this.flip = dx < 0; }
    else this.dir = dy < 0 ? 'up' : 'down';
  }

  faceToward(x, y) { this.face(x - this.x, y - this.y); }

  // vx, vy in px/s; dt in ms
  update(dt, vx = 0, vy = 0, time = 0) {
    const speed = Math.hypot(vx, vy);
    const moving = speed > 12;
    if (moving) this.face(vx, vy);
    if (moving !== this.moving || this.lastDir !== this.dir) {
      this.moving = moving; this.lastDir = this.dir;
      if (moving) this.sprite.play(`${this.id}-walk-${this.dir}`, true);
      else { this.sprite.stop(); this.sprite.setFrame(`${this.dir}-idle0`); }
    }
    if (moving) this.sprite.anims.timeScale = Math.min(1.5, 0.6 + speed / 200);
    this.sprite.setFlipX(this.dir === 'side' && this.flip);

    // blink while idle
    if (!moving) {
      if (time > this.blinkAt) { this.sprite.setFrame(`${this.dir}-idle1`); this.blinkAt = time + 2600 + Math.random() * 3000; this.unblink = time + 130; }
      else if (this.unblink && time > this.unblink) { this.sprite.setFrame(`${this.dir}-idle0`); this.unblink = 0; }
    }

    // squash & stretch
    this.phase += dt * (moving ? 0.018 * Math.min(1.4, speed / 150) : 0.003);
    let sy, sx;
    if (moving) { const s = Math.sin(this.phase * 2); sy = 1 + s * 0.045; sx = 1 - s * 0.03; }
    else { const s = Math.sin(this.phase); sy = 1 + s * 0.018; sx = 1 - s * 0.01; }
    if (this.hop > 0) { this.hop = Math.max(0, this.hop - dt); }
    const hopY = this.hop > 0 ? -Math.sin((1 - this.hop / 260) * Math.PI) * 10 : 0;
    this.sprite.setScale(this.base * sx, this.base * sy);
    this.hopY = hopY;
    this.sync();
    this.shadow.setScale(1 - (moving ? Math.abs(Math.sin(this.phase * 2)) * 0.08 : 0) + hopY * 0.01, 1);
  }

  jump() { if (!this.water) this.hop = 260; }

  // 0 = dry, 1 = wading (legs under water), 2 = swimming (just head and shoulders)
  setWater(level) {
    if (level === this.water) return;
    this.water = level;
    const goose = this.id === 'finn';
    this.sinkTarget = level === 0 ? 0 : level === 1 ? 13 : goose ? 26 : 44;
    this.shadow.setVisible(level === 0 && this.sprite.visible);
  }

  sync() {
    if (this.sink !== this.sinkTarget) {
      this.sink += Math.sign(this.sinkTarget - this.sink) * Math.min(Math.abs(this.sinkTarget - this.sink), 2.2);
      const cut = Math.round(this.sink * ART);
      if (cut > 0) this.sprite.setCrop(0, 0, FW * ART, GROUND * ART - cut);
      else this.sprite.isCropped = false;
    }
    const bob = this.water === 2 ? Math.sin(this.phase * 1.3) * 1.5 : 0;
    this.sprite.setPosition(this.x, this.y + (this.hopY || 0) + this.sink + bob);
    this.sprite.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 1).setDepth(this.y - 2);
  }

  setVisible(v) { this.sprite.setVisible(v); this.shadow.setVisible(v && !this.water); }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); }

  // NPC wander: returns velocity for this frame
  brain(dt, player, blocked) {
    const near = player && Math.hypot(player.x - this.x, player.y - this.y) < 130;
    if (near) { this.target = null; this.faceToward(player.x, player.y); return [0, 0]; }
    if (!this.wander) return [0, 0];
    if (!this.target) {
      this.pause -= dt;
      if (this.pause <= 0) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * this.wander;
        this.target = { x: this.home.x + Math.cos(a) * d, y: this.home.y + Math.sin(a) * d * 0.7 };
        this.pause = 1500 + Math.random() * 3500;
        if (Math.random() < 0.25) { this.target = null; this.jump(); this.dir = ['down', 'side'][(Math.random() * 2) | 0]; this.flip = Math.random() < 0.5; }
      }
      return [0, 0];
    }
    const dx = this.target.x - this.x, dy = this.target.y - this.y, d = Math.hypot(dx, dy);
    if (d < 4) { this.target = null; return [0, 0]; }
    const sp = 45;
    const vx = dx / d * sp, vy = dy / d * sp;
    const nx = this.x + vx * dt / 1000, ny = this.y + vy * dt / 1000;
    if (blocked && blocked(nx, ny)) { this.target = null; return [0, 0]; }
    this.x = nx; this.y = ny;
    return [vx, vy];
  }
}
