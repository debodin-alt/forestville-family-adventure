// First-person "driver's seat" view for the kart race.
// Pseudo-3D: the floor is drawn scanline by scanline from a rotated copy of the track,
// with pillars, tyre walls, other karts and ceiling lights as scaled billboards.

import { TRACK, N, HW, KW, KH } from '../data/kart.js';
import { paintPortrait } from '../art/critters.js';

const S = 0.6, GW = 1500, GH = 1000, GB = 40;   // offscreen floor buffer (scaled world)
const CAM_H = 24, CEIL_H = 70, ZMAX = (GH - GB) / S;

export class KartFPV {
  constructor(scene, trackCanvas, colors) {
    this.scene = scene; this.track = trackCanvas; this.colors = colors;
    this.el = document.getElementById('kart-fpv');
    this.ctx = this.el.getContext('2d');
    this.off = document.createElement('canvas'); this.off.width = GW; this.off.height = GH;
    this.og = this.off.getContext('2d');
    this.faces = {};
    // tyre stacks along both edges (skip ones that sit on another part of the track)
    this.tyres = [];
    for (let i = 0; i < N; i += 3) {
      const p = TRACK[i];
      for (const side of [-1, 1]) {
        const x = p.x + p.nx * (HW + 20) * side, y = p.y + p.ny * (HW + 20) * side;
        if (TRACK.some((q, j) => Math.abs(j - i) > 8 && Math.abs(j - i) < N - 8 && Math.hypot(q.x - x, q.y - y) < HW + 10)) continue;
        this.tyres.push({ x, y, c: (i / 3) % 5 === 0 ? '#e8e3d6' : (i / 3) % 5 === 2 ? '#d8352a' : '#1f2023' });
      }
    }
    this.pillars = [];
    for (let x = 160; x < KW; x += 400) for (let y = 160; y < KH; y += 400) if (!TRACK.some(q => Math.hypot(q.x - x, q.y - y) < HW + 70)) this.pillars.push({ x, y });
    this.leds = [];
    for (let x = 200; x < KW; x += 250) for (let y = 120; y < KH; y += 250) this.leds.push({ x, y });
  }

  show(on) {
    this.on = on;
    this.el.hidden = !on;
    if (on) this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    if (this.el.width !== w || this.el.height !== h) { this.el.width = w; this.el.height = h; }
  }

  face(id) {
    if (!this.faces[id]) this.faces[id] = paintPortrait(id, 96, '#ffffff');
    return this.faces[id];
  }

  render(karts, player, time) {
    if (!this.on) return;
    this.resize();
    const ctx = this.ctx, W = this.el.width, H = this.el.height;
    const a = player.a, ca = Math.cos(a), sa = Math.sin(a);
    const cx = player.x + ca * 6, cy = player.y + sa * 6;
    const hY = Math.round(H * 0.42), F = Math.max(W, H * 1.2) * 0.4;
    const shake = Math.min(1, Math.abs(player.v) / 430) * Math.sin(time / 40) * 0.8;

    // 1) floor buffer: world rotated so the kart points up the buffer
    const og = this.og;
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.fillStyle = '#8b8f95'; og.fillRect(0, 0, GW, GH);
    og.translate(GW / 2, GH - GB); og.scale(S, S); og.rotate(-a - Math.PI / 2); og.translate(-cx, -cy);
    og.drawImage(this.track, 0, 0);

    // 2) ceiling: dark concrete with rows of LED strips
    const g = ctx.createLinearGradient(0, 0, 0, hY);
    g.addColorStop(0, '#23252a'); g.addColorStop(1, '#4b4f56');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hY + 1);
    // 3) floor scanlines
    ctx.fillStyle = '#8b8f95'; ctx.fillRect(0, hY, W, H - hY);
    for (let y = hY + 1; y < H; y++) {
      const z = CAM_H * F / (y - hY);
      if (z > ZMAX) continue;
      const sy = GH - GB - z * S, sw = z * (W / 2) / F * S;
      ctx.drawImage(this.off, GW / 2 - sw, sy, sw * 2, 1, 0, y + shake, W, 1.6);
    }
    const haze = ctx.createLinearGradient(0, hY - 4, 0, hY + H * 0.12);
    haze.addColorStop(0, 'rgba(60,63,70,1)'); haze.addColorStop(1, 'rgba(60,63,70,0)');
    ctx.fillStyle = haze; ctx.fillRect(0, hY - 4, W, H * 0.12 + 4);

    // 4) billboards (sorted far to near)
    const proj = (x, y) => {
      const dx = x - cx, dy = y - cy, f = dx * ca + dy * sa;
      if (f < 12 || f > 1500) return null;
      const r = -dx * sa + dy * ca, s = F / f, sx = W / 2 + r * s;
      if (sx < -300 || sx > W + 300) return null;
      return { f, s, sx, fy: hY + CAM_H * s + shake, cyy: hY - CEIL_H * s + shake };
    };
    const items = [];
    for (const L of this.leds) { const q = proj(L.x, L.y); if (q) items.push({ q, t: 'led' }); }
    for (const P of this.pillars) { const q = proj(P.x, P.y); if (q) items.push({ q, t: 'pillar' }); }
    for (const T of this.tyres) { const q = proj(T.x, T.y); if (q && q.f < 1100 && q.f > 26) items.push({ q, t: 'tyre', c: T.c }); }
    // karts right beside you would fill the screen, so only draw them once they're a little ahead
    for (const k of karts) if (k !== player) { const q = proj(k.x, k.y); if (q && q.f > 55) items.push({ q, t: 'kart', k }); }
    items.sort((m, n) => n.q.f - m.q.f);
    for (const it of items) {
      const { s, sx, fy, cyy, f } = it.q;
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (f - 1100) / 400));
      if (it.t === 'led') {
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(sx - 60 * s, cyy - 3 * s, 120 * s, 6 * s);
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(sx - 80 * s, cyy - 10 * s, 160 * s, 20 * s);
      } else if (it.t === 'pillar') {
        const w = 52 * s;
        ctx.fillStyle = '#a9adb3'; ctx.fillRect(sx - w / 2, cyy, w, fy - cyy);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(sx + w * 0.15, cyy, w * 0.35, fy - cyy);
        ctx.fillStyle = '#f2c230'; ctx.fillRect(sx - w / 2, fy - 16 * s, w, 12 * s);
        ctx.fillStyle = '#1f2023'; for (let k = 0; k < 4; k++) ctx.fillRect(sx - w / 2 + k * w / 4, fy - 16 * s, w / 8, 12 * s);
      } else if (it.t === 'tyre') {
        const w = 22 * s, h = 9 * s;
        for (let k = 0; k < 3; k++) { ctx.fillStyle = k === 1 ? it.c : '#1f2023'; ctx.beginPath(); ctx.roundRect(sx - w / 2, fy - h * (k + 1), w, h - 0.5, h / 3); ctx.fill(); }
      } else if (it.t === 'kart') {
        const k = it.k, w = 46 * s;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, fy, w * 0.6, 5 * s, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#17181b'; ctx.fillRect(sx - w / 2 - 4 * s, fy - 12 * s, 10 * s, 12 * s); ctx.fillRect(sx + w / 2 - 6 * s, fy - 12 * s, 10 * s, 12 * s);
        ctx.fillStyle = this.colors[k.id]; ctx.beginPath(); ctx.roundRect(sx - w / 2, fy - 16 * s, w, 11 * s, 3 * s); ctx.fill();
        ctx.fillStyle = '#2b2d33'; ctx.fillRect(sx - w / 2 + 3 * s, fy - 7 * s, w - 6 * s, 4 * s);
        const fs = 30 * s; ctx.drawImage(this.face(k.id), sx - fs / 2, fy - 16 * s - fs * 0.9, fs, fs);
        if (s > 0.25) { ctx.font = '800 12px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(20,22,27,.75)'; const tw = ctx.measureText(k.name).width + 12; ctx.beginPath(); ctx.roundRect(sx - tw / 2, fy - 16 * s - fs - 22, tw, 18, 9); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(k.name, sx, fy - 16 * s - fs - 9); }
      }
    }
    ctx.globalAlpha = 1;

    // 5) speed lines
    const sp = Math.min(1, Math.abs(player.v) / 430);
    if (sp > 0.6) {
      ctx.strokeStyle = `rgba(255,255,255,${(sp - 0.6) * 0.5})`; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + time / 300, r1 = Math.min(W, H) * 0.35, r2 = r1 + 40 + (i % 3) * 20;
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(ang) * r1, hY + Math.sin(ang) * r1 * 0.6); ctx.lineTo(W / 2 + Math.cos(ang) * r2, hY + Math.sin(ang) * r2 * 0.6); ctx.stroke();
      }
    }

    // 6) cockpit: nose, steering wheel, gloves
    const col = this.colors[player.id], nb = H * 0.86;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(W * 0.3, H); ctx.lineTo(W * 0.42, nb); ctx.lineTo(W * 0.58, nb); ctx.lineTo(W * 0.7, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(W * 0.47, nb + 6, W * 0.06, 6);
    ctx.fillStyle = '#17181b'; ctx.beginPath(); ctx.roundRect(W * 0.18, H - 34, W * 0.1, 40, 8); ctx.roundRect(W * 0.72, H - 34, W * 0.1, 40, 8); ctx.fill();
    const R = Math.min(H * 0.17, W * 0.2), wx = W / 2, wy = H + R * 0.25;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate((player.steerIn || 0) * 0.9);
    ctx.strokeStyle = '#1d1e22'; ctx.lineWidth = R * 0.18; ctx.beginPath(); ctx.arc(0, 0, R, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.lineWidth = R * 0.12; ctx.beginPath(); ctx.moveTo(-R * 0.95, -R * 0.25); ctx.lineTo(0, 0); ctx.lineTo(R * 0.95, -R * 0.25); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, R * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = '#39d98a'; ctx.fillRect(-R * 0.12, -R * 0.08, R * 0.24, R * 0.1);
    ctx.fillStyle = '#2f3136';
    for (const sd of [-1, 1]) { const an = -Math.PI / 2 + sd * 1.05; ctx.beginPath(); ctx.ellipse(Math.cos(an) * R, Math.sin(an) * R, R * 0.17, R * 0.13, an, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}
