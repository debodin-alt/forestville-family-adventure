// Procedural prop painters. Each returns { canvas, ax, ay, collide }.
//   canvas: painted at ART scale
//   ax, ay: anchor in world pixels (feet / base point) measured from canvas top-left / ART
//   collide: optional shape relative to anchor, in world pixels

import { makeCanvas, ellipse, rrect, blob, rng, shade } from '../utils/canvas.js';
import { ART } from './critters.js';

const FONT = '800 {s}px ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';
const font = s => FONT.replace('{s}', s);

function paint(w, h, fn) {
  const [c, ctx] = makeCanvas(w * ART, h * ART);
  ctx.scale(ART, ART);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  fn(ctx);
  return c;
}
const groundShadow = (ctx, x, y, rx, ry, a = 0.22) => ellipse(ctx, x, y, rx, ry, `rgba(40,52,30,${a})`);

// ---------------- vegetation ----------------
const GUM_LEAF = [['#5d7d4f', '#6f8f5a', '#86a56c', '#9db77d'], ['#5a7a5f', '#6c8f73', '#86a88a', '#a2bd9e'], ['#617f47', '#789654', '#91ad66', '#aac27a']];

export function gum(v = 0, scale = 1) {
  const r = rng(101 + v * 17);
  const W = 150 * scale, H = 210 * scale;
  const cx = W / 2, base = H - 12 * scale;
  const pal = GUM_LEAF[v % 3];
  const canvas = paint(W, H, ctx => {
    groundShadow(ctx, cx + 6 * scale, base + 2, 46 * scale, 12 * scale);
    // trunk with forks
    const trunk = (x0, y0, x1, y1, w0, w1) => {
      ctx.beginPath();
      ctx.moveTo(x0 - w0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 - w0 * 0.6, (y0 + y1) / 2, x1 - w1, y1);
      ctx.lineTo(x1 + w1, y1); ctx.quadraticCurveTo((x0 + x1) / 2 + w0 * 0.6, (y0 + y1) / 2, x0 + w0, y0); ctx.closePath();
      ctx.fillStyle = '#e9e1d2'; ctx.fill();
    };
    const s = scale;
    trunk(cx, base, cx + (r() - 0.5) * 10 * s, base - 70 * s, 9 * s, 6 * s);
    trunk(cx, base - 60 * s, cx - 26 * s, base - 120 * s, 6 * s, 3 * s);
    trunk(cx, base - 64 * s, cx + 24 * s, base - 128 * s, 6 * s, 3 * s);
    // bark patches
    for (let i = 0; i < 14; i++) {
      const y = base - r() * 90 * s, x = cx + (r() - 0.5) * 12 * s;
      ellipse(ctx, x, y, (2 + r() * 3) * s, (4 + r() * 6) * s, ['#c9c1b3', '#d8b99a', '#b8b2a6'][i % 3]);
    }
    ctx.fillStyle = 'rgba(80,70,60,.18)'; ctx.fillRect(cx + 2 * s, base - 70 * s, 6 * s, 70 * s);
    // canopy clusters (airy eucalyptus look: several clumps with gaps)
    const clumps = [];
    for (let i = 0; i < 7; i++) clumps.push([cx + (r() - 0.5) * 100 * s, base - (115 + r() * 70) * s, (22 + r() * 16) * s]);
    clumps.sort((a, b) => a[1] - b[1]);
    for (const [x, y, rr] of clumps) {
      blob(ctx, x + 4 * s, y + 6 * s, rr, rr * 0.75, r, 9, 0.25); ctx.fillStyle = 'rgba(40,60,35,.25)'; ctx.fill();
      blob(ctx, x, y, rr, rr * 0.72, r, 9, 0.28); ctx.fillStyle = pal[1]; ctx.fill();
      blob(ctx, x - rr * 0.2, y - rr * 0.2, rr * 0.7, rr * 0.5, r, 8, 0.3); ctx.fillStyle = pal[2]; ctx.fill();
      // hanging leaf tips
      for (let k = 0; k < 9; k++) {
        const a = r() * Math.PI * 2, d = rr * (0.6 + r() * 0.4);
        ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + 3 * s, 2.2 * s, 6 * s, k % 3 ? pal[0] : pal[3], a + 1.5);
      }
    }
  });
  return { canvas, ax: cx, ay: base, collide: { c: 0, y: 0, r: 9 * scale } };
}

export function roundTree(v = 0, scale = 1) {
  const r = rng(301 + v * 7);
  const W = 120 * scale, H = 150 * scale, cx = W / 2, base = H - 10 * scale;
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx + 6 * s, base + 2, 40 * s, 11 * s);
    rrect(ctx, cx - 6 * s, base - 50 * s, 12 * s, 50 * s, 4 * s, '#7b5a3c');
    const cols = v === 3 ? ['#7657ad', '#9272c7', '#b598de'] : v % 2 ? ['#3f6f45', '#4f8452', '#6a9d5d'] : ['#46703f', '#5a8a4b', '#79a55c'];
    blob(ctx, cx, base - 78 * s, 50 * s, 44 * s, r, 11, 0.12); ctx.fillStyle = cols[0]; ctx.fill();
    blob(ctx, cx - 8 * s, base - 86 * s, 40 * s, 34 * s, r, 10, 0.14); ctx.fillStyle = cols[1]; ctx.fill();
    blob(ctx, cx - 16 * s, base - 96 * s, 20 * s, 15 * s, r, 8, 0.2); ctx.fillStyle = cols[2]; ctx.fill();
    if (v === 2) for (let i = 0; i < 12; i++) ellipse(ctx, cx + (r() - 0.5) * 70 * s, base - (60 + r() * 50) * s, 2.5 * s, 2.5 * s, '#e0546c');
  });
  return { canvas, ax: cx, ay: base, collide: { c: 0, y: 0, r: 8 * scale } };
}

export function norfolkPine(scale = 1) {
  const W = 110 * scale, H = 280 * scale, cx = W / 2, base = H - 10 * scale;
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx + 6 * s, base + 2, 34 * s, 10 * s);
    rrect(ctx, cx - 5 * s, base - 250 * s, 10 * s, 250 * s, 4 * s, '#7a5a42');
    for (let i = 0; i < 9; i++) {
      const y = base - 60 * s - i * 24 * s, w = (48 - i * 4.5) * s;
      ctx.fillStyle = i % 2 ? '#3f6b4a' : '#4c7d55';
      ctx.beginPath(); ctx.moveTo(cx - w, y + 6 * s); ctx.quadraticCurveTo(cx, y - 14 * s, cx + w, y + 6 * s); ctx.quadraticCurveTo(cx, y - 2 * s, cx - w, y + 6 * s); ctx.fill();
    }
    ctx.fillStyle = '#4c7d55'; ctx.beginPath(); ctx.moveTo(cx - 8 * s, base - 262 * s); ctx.lineTo(cx, base - 278 * s); ctx.lineTo(cx + 8 * s, base - 262 * s); ctx.fill();
  });
  return { canvas, ax: cx, ay: base, collide: { c: 0, y: 0, r: 7 * scale } };
}

export function shrub(v = 0, scale = 1) {
  const r = rng(501 + v * 13);
  const W = 70 * scale, H = 54 * scale, cx = W / 2, base = H - 6 * scale;
  const flower = [null, '#d8413a', '#f2c230', '#f4f1ea', '#b56ad0'][v % 5];
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx + 3, base, 28 * s, 7 * s);
    blob(ctx, cx, base - 16 * s, 28 * s, 18 * s, r, 10, 0.2); ctx.fillStyle = '#4e7b45'; ctx.fill();
    blob(ctx, cx - 5 * s, base - 21 * s, 20 * s, 12 * s, r, 9, 0.25); ctx.fillStyle = '#679655'; ctx.fill();
    if (flower) {
      for (let i = 0; i < 10; i++) {
        const x = cx + (r() - 0.5) * 44 * s, y = base - (10 + r() * 22) * s;
        if (v % 5 === 1) ellipse(ctx, x, y, 2.2 * s, 5.5 * s, flower, (r() - 0.5)); // bottlebrush spikes
        else ellipse(ctx, x, y, 2.6 * s, 2.6 * s, flower);
      }
    }
  });
  return { canvas, ax: cx, ay: base, collide: null };
}

export function fern(scale = 1) {
  const r = rng(71);
  const W = 64 * scale, H = 44 * scale, cx = W / 2, base = H - 4 * scale;
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx, base, 22 * s, 5 * s, 0.15);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const len = (20 + r() * 8) * s;
      ctx.strokeStyle = i % 2 ? '#5d8f4e' : '#77a85e'; ctx.lineWidth = 2.2 * s;
      ctx.beginPath(); ctx.moveTo(cx, base);
      ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.6, base + Math.sin(a) * len * 0.9, cx + Math.cos(a) * len, base + Math.sin(a) * len * 0.55);
      ctx.stroke();
      for (let k = 1; k < 5; k++) {
        const t = k / 5, px = cx + Math.cos(a) * len * t, py = base + Math.sin(a) * len * t * 0.7;
        ellipse(ctx, px, py, 3 * s, 1.4 * s, ctx.strokeStyle, a + 1.2);
      }
    }
  });
  return { canvas, ax: cx, ay: base, collide: null };
}

export function grassTree(scale = 1) {
  const W = 70 * scale, H = 120 * scale, cx = W / 2, base = H - 6 * scale;
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx + 3, base, 20 * s, 6 * s);
    rrect(ctx, cx - 7 * s, base - 34 * s, 14 * s, 34 * s, 5 * s, '#2e2a26');
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (i / 25 - 0.5) * 2.8;
      ctx.strokeStyle = i % 3 ? '#7f9c52' : '#a3b865'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(cx, base - 34 * s);
      ctx.quadraticCurveTo(cx + Math.cos(a) * 16 * s, base - 34 * s + Math.sin(a) * 18 * s, cx + Math.cos(a) * 30 * s, base - 30 * s + Math.sin(a) * 22 * s + 14 * s);
      ctx.stroke();
    }
    rrect(ctx, cx - 2.5 * s, base - 112 * s, 5 * s, 70 * s, 2 * s, '#7a6440');
    for (let i = 0; i < 16; i++) ellipse(ctx, cx + (i % 2 ? 2 : -2) * s, base - (108 - i * 3) * s, 1.6 * s, 1.6 * s, '#efe4b8');
  });
  return { canvas, ax: cx, ay: base, collide: { c: 0, y: 0, r: 8 * scale } };
}

export function rock(v = 0, scale = 1) {
  const r = rng(801 + v * 11);
  const W = 90 * scale, H = 60 * scale, cx = W / 2, base = H - 8 * scale;
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx + 4, base, 38 * s, 9 * s, 0.25);
    blob(ctx, cx, base - 16 * s, 38 * s, 18 * s, r, 9, 0.15); ctx.fillStyle = '#c98f55'; ctx.fill();
    blob(ctx, cx - 3 * s, base - 22 * s, 32 * s, 12 * s, r, 9, 0.18); ctx.fillStyle = '#ddb07a'; ctx.fill();
    ctx.strokeStyle = 'rgba(150,95,50,.45)'; ctx.lineWidth = 1.5 * s;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 30 * s, base - (8 + i * 6) * s); ctx.quadraticCurveTo(cx, base - (12 + i * 6) * s + r() * 4, cx + 30 * s, base - (8 + i * 6) * s); ctx.stroke(); }
    ellipse(ctx, cx - 12 * s, base - 26 * s, 8 * s, 3 * s, 'rgba(255,240,210,.35)');
    for (let i = 0; i < 4; i++) ellipse(ctx, cx + (r() - 0.5) * 50 * s, base - (18 + r() * 8) * s, 3 * s, 2 * s, 'rgba(120,150,90,.55)'); // lichen
  });
  return { canvas, ax: cx, ay: base, collide: { c: 0, y: -10 * scale, rx: 34 * scale, ry: 12 * scale } };
}

// ---------------- buildings ----------------
function windowPane(ctx, x, y, w, h, frame = '#f7f0e0') {
  rrect(ctx, x - 2, y - 2, w + 4, h + 4, 3, frame);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#a9d3dc'); g.addColorStop(1, '#6fa3b3');
  rrect(ctx, x, y, w, h, 2, null); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = frame; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(x + 3, y + h - 3); ctx.lineTo(x + w * 0.35, y + 3); ctx.lineTo(x + w * 0.45, y + 3); ctx.lineTo(x + 8, y + h - 3); ctx.fill();
}

function tiledRoof(ctx, x, y, w, h, col, hip = true) {
  // hipped terracotta roof, seen from above at a 3/4 angle
  const inset = hip ? Math.min(w * 0.22, h * 0.55) : 0;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + inset, y); ctx.lineTo(x + w - inset, y); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  // side hips darker
  ctx.fillStyle = shade(col, -0.18);
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + inset, y); ctx.lineTo(x + inset + 2, y + h * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(col, 0.12);
  ctx.beginPath(); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w - inset, y); ctx.lineTo(x + w - inset - 2, y + h * 0.5); ctx.closePath(); ctx.fill();
  // tile rows
  ctx.strokeStyle = shade(col, -0.22); ctx.lineWidth = 1.1;
  for (let yy = y + 7; yy < y + h; yy += 7) {
    const t = (yy - y) / h, xl = x + inset * (1 - t), xr = x + w - inset * (1 - t);
    ctx.beginPath(); ctx.moveTo(xl + 2, yy); ctx.lineTo(xr - 2, yy); ctx.stroke();
  }
  ctx.strokeStyle = shade(col, 0.25); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x + inset, y + 1); ctx.lineTo(x + w - inset, y + 1); ctx.stroke();
  // gutter
  rrect(ctx, x - 3, y + h - 3, w + 6, 6, 2, '#e9e3d6');
}

export function house(opts = {}) {
  const { w = 300, depth = 150, wall = '#e9dcc3', roof = '#c2643d', trim = '#f7f0e0', door = '#3f6f63', brick = false, veranda = true, v = 0 } = opts;
  const wallH = 58, roofH = depth;
  const W = w + 40, H = roofH + wallH + 30;
  const x0 = 20, roofY = 6, wallY = roofY + roofH - 8;
  const canvas = paint(W, H, ctx => {
    groundShadow(ctx, W / 2 + 10, wallY + wallH + 2, w * 0.55, 14, 0.25);
    // front wall
    rrect(ctx, x0, wallY, w, wallH, 3, wall);
    if (brick) {
      ctx.strokeStyle = 'rgba(120,60,40,.28)'; ctx.lineWidth = 1;
      for (let yy = wallY + 6; yy < wallY + wallH; yy += 6) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); }
      for (let yy = wallY; yy < wallY + wallH; yy += 12) for (let xx = x0 + (yy / 6 % 2 ? 6 : 0); xx < x0 + w; xx += 12) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 6); ctx.stroke(); }
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,.07)'; ctx.lineWidth = 1;
      for (let yy = wallY + 5; yy < wallY + wallH; yy += 5) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x0, wallY, w, 6);
    // door + windows
    const dx = x0 + w * (v % 2 ? 0.3 : 0.62);
    rrect(ctx, dx - 12, wallY + 14, 24, wallH - 14, 3, trim);
    rrect(ctx, dx - 9, wallY + 17, 18, wallH - 17, 2, door);
    ellipse(ctx, dx + 5, wallY + 38, 1.6, 1.6, '#e3c46a');
    const wins = v % 2 ? [0.08, 0.5, 0.75] : [0.1, 0.3, 0.82];
    for (const f of wins) windowPane(ctx, x0 + w * f, wallY + 14, 40, 26, trim);
    // front step
    rrect(ctx, dx - 16, wallY + wallH - 3, 32, 6, 2, '#d9cdb5');
    tiledRoof(ctx, x0 - 8, roofY, w + 16, roofH, roof);
    // veranda posts + awning
    if (veranda) {
      ctx.fillStyle = shade(roof, -0.05);
      rrect(ctx, dx - 40, wallY - 4, 80, 10, 2, shade(roof, -0.12));
      ctx.fillStyle = trim; ctx.fillRect(dx - 38, wallY + 4, 4, wallH - 6); ctx.fillRect(dx + 34, wallY + 4, 4, wallH - 6);
    }
    // chimney / solar panels (very Sydney)
    if (v % 3 === 0) { ctx.fillStyle = '#2c3e5c'; for (let i = 0; i < 4; i++) { rrect(ctx, x0 + w * 0.18 + i * 22, roofY + 30, 19, 28, 2, '#2c3e5c'); ctx.strokeStyle = '#6f8bb5'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 + w * 0.18 + i * 22 + 9.5, roofY + 30); ctx.lineTo(x0 + w * 0.18 + i * 22 + 9.5, roofY + 58); ctx.stroke(); } }
    else rrect(ctx, x0 + w * 0.7, roofY + 16, 18, 26, 2, '#a8563a');
  });
  return { canvas, ax: W / 2, ay: wallY + wallH, collide: { c: 0, rect: [-w / 2 - 4, -(roofH + wallH) + 30, w + 8, roofH + wallH - 34] } };
}

export function shop(kind, opts = {}) {
  const K = {
    cafe: { name: 'THE BUSH BEAN', sub: 'coffee · toasties', wall: '#f1e3c8', awn: ['#2f6b5a', '#f3ead7'], w: 240 },
    grocer: { name: 'FORESTVILLE FRESH', sub: 'grocer · supermarket', wall: '#e8efe6', awn: ['#d8453b', '#fbf5ea'], w: 320 },
    news: { name: 'PAPER & PENS', sub: 'newsagency', wall: '#e8d6c3', awn: ['#2f5f8f', '#f3ead7'], w: 190 },
    bakery: { name: 'CRUST & CO', sub: 'bakery', wall: '#f4e2c6', awn: ['#c46b2d', '#fbf1de'], w: 200 },
    chemist: { name: 'CHEMIST', sub: '', wall: '#eef2f0', awn: ['#3a8a6a', '#ffffff'], w: 170 },
    kiosk: { name: 'SHELLY KIOSK', sub: 'chips · gelato', wall: '#f3ecd9', awn: ['#2a8aa6', '#fff8ea'], w: 200 },
    surf: { name: 'MANLY SURF CO', sub: 'boards · hire', wall: '#e3eef0', awn: ['#e0782f', '#fff'], w: 220 },
  }[kind];
  if (opts.name) K.name = opts.name;
  const w = K.w, h = 110, W = w + 20, H = h + 40, x0 = 10, top = 8;
  const canvas = paint(W, H, ctx => {
    groundShadow(ctx, W / 2 + 8, top + h + 4, w * 0.55, 10, 0.22);
    rrect(ctx, x0, top, w, h, 4, K.wall);
    // parapet
    rrect(ctx, x0 - 3, top, w + 6, 26, 3, shade(K.wall, -0.12));
    ctx.fillStyle = '#2d3b33'; ctx.font = font(15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(K.name, x0 + w / 2, top + 13, w - 12);
    // windows
    windowPane(ctx, x0 + 12, top + 52, w * 0.38, 44, '#f8f3e8');
    windowPane(ctx, x0 + w - 12 - w * 0.3, top + 52, w * 0.3, 44, '#f8f3e8');
    // door
    const dx = x0 + w * 0.58;
    rrect(ctx, dx - 13, top + 50, 26, h - 50, 2, '#39463f');
    rrect(ctx, dx - 10, top + 54, 20, 34, 2, '#8cbfc8');
    // awning stripes
    const ay = top + 30, ah = 18;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0 - 4, ay); ctx.lineTo(x0 + w + 4, ay); ctx.lineTo(x0 + w + 10, ay + ah); ctx.lineTo(x0 - 10, ay + ah); ctx.closePath(); ctx.clip();
    for (let i = -1; i < w / 14 + 2; i++) { ctx.fillStyle = K.awn[i & 1]; ctx.fillRect(x0 - 10 + i * 14, ay, 14, ah); }
    ctx.restore();
    ctx.fillStyle = K.awn[0];
    for (let i = 0; i < (w + 20) / 14; i++) { ctx.beginPath(); ctx.arc(x0 - 3 + i * 14, ay + ah, 7, 0, Math.PI); ctx.fill(); }
    if (K.sub) { ctx.fillStyle = 'rgba(45,59,51,.75)'; ctx.font = font(9); ctx.fillText(K.sub.toUpperCase(), x0 + 12 + w * 0.19, top + 104, w * 0.36); }
    // shop details
    if (kind === 'grocer') { for (let i = 0; i < 3; i++) { rrect(ctx, x0 + 18 + i * 26, top + h - 14, 22, 12, 2, '#8a6a47'); for (let k = 0; k < 4; k++) ellipse(ctx, x0 + 22 + i * 26 + k * 5, top + h - 15, 3, 3, ['#e0453b', '#f2a33a', '#7fb24b'][i]); } }
    if (kind === 'cafe') { const cx = x0 + 12 + w * 0.19, cy = top + 70; rrect(ctx, cx - 9, cy - 8, 18, 16, 4, '#2f6b5a'); ctx.strokeStyle = '#2f6b5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + 10, cy - 1, 4.5, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = 'rgba(47,107,90,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 12); ctx.quadraticCurveTo(cx - 6, cy - 16, cx - 2, cy - 20); ctx.moveTo(cx + 3, cy - 12); ctx.quadraticCurveTo(cx, cy - 16, cx + 4, cy - 20); ctx.stroke(); }
    if (kind === 'bakery') { for (let i = 0; i < 4; i++) ellipse(ctx, x0 + 26 + i * 18, top + 86, 7, 4.5, '#d49a4f'); }
  });
  return { canvas, ax: W / 2, ay: top + h, collide: { c: 0, rect: [-w / 2 - 2, -h + 30, w + 4, h - 34] } };
}

export function school() {
  const w = 560, h = 120, W = w + 40, H = h + 150, x0 = 20, roofTop = 8, top = 110;
  const canvas = paint(W, H, ctx => {
    groundShadow(ctx, W / 2 + 10, top + h + 2, w * 0.55, 14, 0.25);
    // long skillion roof (blue colorbond)
    ctx.fillStyle = '#5b86a6'; ctx.beginPath(); ctx.moveTo(x0 - 10, top + 4); ctx.lineTo(x0 + 10, roofTop); ctx.lineTo(x0 + w - 10, roofTop); ctx.lineTo(x0 + w + 10, top + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a7090'; ctx.lineWidth = 1.2;
    for (let x = x0; x < x0 + w; x += 10) { ctx.beginPath(); ctx.moveTo(x, roofTop + 2); ctx.lineTo(x - (x - x0 - w / 2) * 0.04, top + 2); ctx.stroke(); }
    // brick wall
    rrect(ctx, x0, top, w, h, 3, '#b8674a');
    ctx.strokeStyle = 'rgba(80,35,25,.25)'; ctx.lineWidth = 1;
    for (let yy = top + 6; yy < top + h; yy += 6) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x0, top, w, 7);
    for (let i = 0; i < 8; i++) windowPane(ctx, x0 + 24 + i * 66, top + 22, 42, 34, '#f1efe6');
    // doors
    rrect(ctx, x0 + w / 2 - 26, top + 64, 52, h - 64, 3, '#f1efe6');
    rrect(ctx, x0 + w / 2 - 22, top + 68, 20, h - 68, 2, '#2f6fa3'); rrect(ctx, x0 + w / 2 + 2, top + 68, 20, h - 68, 2, '#2f6fa3');
    // covered walkway posts
    ctx.fillStyle = '#e8e3d6'; for (let i = 0; i < 9; i++) ctx.fillRect(x0 + 8 + i * 68, top + 60, 5, h - 60);
    rrect(ctx, x0 - 6, top + 56, w + 12, 8, 2, '#4a7090');
    // sign board
    rrect(ctx, x0 + w / 2 - 150, roofTop + 40, 300, 42, 6, '#1f5f46');
    ctx.fillStyle = '#f7f0d8'; ctx.font = font(17); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FORESTVILLE PRIMARY SCHOOL', x0 + w / 2, roofTop + 56);
    ctx.font = font(9); ctx.fillText('LEARN · PLAY · GROW', x0 + w / 2, roofTop + 72);
  });
  return { canvas, ax: W / 2, ay: top + h, collide: { c: 0, rect: [-w / 2 - 6, -h - 100, w + 12, h + 96] } };
}

// ---------------- street furniture ----------------
export function bench(side = false) {
  const W = side ? 40 : 90, H = side ? 70 : 50;
  const canvas = paint(W, H, ctx => {
    if (side) {
      groundShadow(ctx, 20, 64, 16, 6);
      rrect(ctx, 8, 6, 24, 58, 3, '#9a6b42'); ctx.fillStyle = '#7d5433'; for (let y = 12; y < 60; y += 10) ctx.fillRect(8, y, 24, 2);
      rrect(ctx, 30, 4, 5, 62, 2, '#6f7479');
    } else {
      groundShadow(ctx, 45, 45, 40, 6);
      ctx.fillStyle = '#6f7479'; ctx.fillRect(10, 26, 4, 18); ctx.fillRect(76, 26, 4, 18);
      rrect(ctx, 4, 6, 82, 9, 3, '#9a6b42'); rrect(ctx, 4, 17, 82, 7, 3, '#9a6b42');
      rrect(ctx, 2, 26, 86, 10, 3, '#b07b4d'); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(2, 33, 86, 3);
    }
  });
  return { canvas, ax: W / 2, ay: H - 4, collide: side ? { c: 0, rect: [-14, -58, 28, 58] } : { c: 0, rect: [-42, -20, 84, 20] } };
}

export function bins() {
  const canvas = paint(96, 64, ctx => {
    groundShadow(ctx, 48, 58, 44, 6);
    const lids = ['#d8352a', '#f2c230', '#5a9a3a'];
    lids.forEach((l, i) => {
      const x = 6 + i * 30;
      rrect(ctx, x, 16, 26, 42, 3, '#2f5a3a');
      rrect(ctx, x - 1, 10, 28, 8, 3, l);
      ellipse(ctx, x + 4, 58, 3, 3, '#222'); ellipse(ctx, x + 22, 58, 3, 3, '#222');
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 3, 20, 4, 34);
    });
  });
  return { canvas, ax: 48, ay: 58, collide: { c: 0, rect: [-44, -14, 88, 14] } };
}

export function mailbox() {
  // brick pillar letterbox, a Sydney suburban classic
  const canvas = paint(40, 70, ctx => {
    groundShadow(ctx, 20, 64, 16, 5);
    rrect(ctx, 6, 14, 28, 50, 2, '#b8674a');
    ctx.strokeStyle = 'rgba(80,35,25,.3)'; ctx.lineWidth = 1;
    for (let y = 20; y < 64; y += 6) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(34, y); ctx.stroke(); }
    rrect(ctx, 4, 8, 32, 8, 2, '#d7cbb6');
    rrect(ctx, 11, 24, 18, 5, 1, '#2d2b2a');
    rrect(ctx, 12, 34, 16, 12, 2, '#efe6d0');
    ctx.fillStyle = '#2d3b33'; ctx.font = font(9); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('12', 20, 40.5);
  });
  return { canvas, ax: 20, ay: 64, collide: { c: 0, rect: [-14, -12, 28, 12] } };
}

export function outdoorTable() {
  const canvas = paint(110, 110, ctx => {
    groundShadow(ctx, 60, 100, 46, 10);
    // chairs
    for (const [x, y] of [[20, 80], [92, 80]]) { rrect(ctx, x - 9, y - 18, 18, 22, 3, '#e8e2d2'); rrect(ctx, x - 10, y - 2, 20, 6, 2, '#d4cdbb'); }
    ellipse(ctx, 56, 80, 34, 12, '#b07b4d'); ellipse(ctx, 56, 78, 34, 12, '#c48c58');
    ctx.fillStyle = '#6f7479'; ctx.fillRect(54, 20, 4, 60);
    // umbrella
    ctx.fillStyle = '#2f8a86'; ctx.beginPath(); ctx.moveTo(8, 34); ctx.quadraticCurveTo(56, -6, 104, 34); ctx.quadraticCurveTo(56, 22, 8, 34); ctx.fill();
    ctx.fillStyle = '#f3ead7'; ctx.beginPath(); ctx.moveTo(40, 26); ctx.quadraticCurveTo(56, 4, 72, 26); ctx.quadraticCurveTo(56, 20, 40, 26); ctx.fill();
    rrect(ctx, 44, 72, 7, 8, 1.5, '#f3ead7'); rrect(ctx, 62, 73, 12, 5, 2, '#e9a33c');
  });
  return { canvas, ax: 56, ay: 96, collide: { c: 0, rect: [-44, -26, 88, 26] } };
}

export function hillsHoist() {
  // the classic rotary clothesline
  const canvas = paint(150, 130, ctx => {
    groundShadow(ctx, 75, 122, 50, 10, 0.15);
    ctx.fillStyle = '#a7adb2'; ctx.fillRect(73, 40, 4, 82);
    ctx.strokeStyle = '#c4c9cd'; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(75, 40, 22 + k * 16, (22 + k * 16) * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = '#a7adb2'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(5, 40); ctx.lineTo(145, 40); ctx.moveTo(75, 15); ctx.lineTo(75, 65); ctx.stroke();
    // laundry
    const cl = [['#e0453b', 30, 44], ['#f2c230', 52, 50], ['#2f8a86', 100, 45], ['#6f54a8', 118, 38], ['#fff', 88, 26]];
    for (const [c, x, y] of cl) { rrect(ctx, x - 7, y, 14, 16, 2, c); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x - 7, y + 12, 14, 4); }
  });
  return { canvas, ax: 75, ay: 122, collide: { c: 0, y: 0, r: 6 } };
}

export function car(color = '#d8453b', facing = 1) {
  const canvas = paint(120, 70, ctx => {
    if (facing < 0) { ctx.translate(120, 0); ctx.scale(-1, 1); }
    groundShadow(ctx, 60, 60, 54, 9, 0.28);
    rrect(ctx, 8, 26, 104, 28, 10, color);
    ctx.fillStyle = shade(color, -0.2); ctx.fillRect(8, 44, 104, 6);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(30, 28); ctx.quadraticCurveTo(40, 8, 60, 8); ctx.lineTo(80, 8); ctx.quadraticCurveTo(94, 10, 98, 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9cc6d1'; ctx.beginPath(); ctx.moveTo(38, 27); ctx.quadraticCurveTo(46, 13, 60, 13); ctx.lineTo(62, 27); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(66, 27); ctx.lineTo(66, 13); ctx.lineTo(80, 13); ctx.quadraticCurveTo(88, 15, 92, 27); ctx.closePath(); ctx.fill();
    ellipse(ctx, 32, 54, 10, 10, '#2b2b2e'); ellipse(ctx, 32, 54, 4, 4, '#b8bcc0');
    ellipse(ctx, 90, 54, 10, 10, '#2b2b2e'); ellipse(ctx, 90, 54, 4, 4, '#b8bcc0');
    ellipse(ctx, 110, 36, 3, 4, '#fff3c4'); ellipse(ctx, 10, 36, 2.5, 3.5, '#e0453b');
  });
  return { canvas, ax: 60, ay: 62, collide: { c: 0, rect: [-52, -24, 104, 24] } };
}

export function bus() {
  const canvas = paint(240, 110, ctx => {
    groundShadow(ctx, 120, 100, 112, 10, 0.28);
    rrect(ctx, 6, 14, 228, 78, 12, '#f2f0e8');
    ctx.fillStyle = '#2f6fa3'; ctx.fillRect(6, 62, 228, 12);
    for (let i = 0; i < 6; i++) rrect(ctx, 20 + i * 34, 24, 28, 28, 4, '#7fb0c2');
    rrect(ctx, 214, 24, 16, 46, 4, '#7fb0c2');
    rrect(ctx, 20, 20, 110, 4, 2, '#ffcf3a');
    ellipse(ctx, 50, 94, 12, 12, '#2b2b2e'); ellipse(ctx, 190, 94, 12, 12, '#2b2b2e');
    ctx.fillStyle = '#ffcf3a'; ctx.font = font(11); ctx.textAlign = 'left'; ctx.fillText('B-LINE  MANLY', 140, 20);
  });
  return { canvas, ax: 120, ay: 100, collide: { c: 0, rect: [-112, -30, 224, 30] } };
}

export function busStop(label = 'BUS') {
  const canvas = paint(110, 110, ctx => {
    groundShadow(ctx, 55, 102, 48, 8);
    ctx.fillStyle = '#5a6a72'; ctx.fillRect(10, 26, 4, 76); ctx.fillRect(96, 26, 4, 76);
    rrect(ctx, 4, 18, 102, 12, 3, '#2f6fa3');
    ctx.fillStyle = 'rgba(180,220,230,.45)'; ctx.fillRect(14, 30, 82, 50);
    rrect(ctx, 22, 76, 66, 8, 2, '#9a6b42');
    // stop sign pole
    ctx.fillStyle = '#6f7479'; ctx.fillRect(104, 10, 3, 92);
    rrect(ctx, 96, 4, 20, 22, 4, '#1c7a4a');
    ctx.fillStyle = '#fff'; ctx.font = font(10); ctx.textAlign = 'center'; ctx.fillText('B', 106, 19);
    ctx.fillStyle = '#fff'; ctx.font = font(8); ctx.fillText(label, 55, 27);
  });
  return { canvas, ax: 55, ay: 100, collide: { c: 0, rect: [-50, -22, 100, 22] } };
}

export function lamp() {
  const canvas = paint(30, 130, ctx => {
    groundShadow(ctx, 15, 124, 9, 3);
    ctx.fillStyle = '#4d5a60'; ctx.fillRect(13, 20, 4, 104);
    rrect(ctx, 5, 10, 20, 12, 5, '#4d5a60'); ellipse(ctx, 15, 22, 7, 3, '#fff1c2');
  });
  return { canvas, ax: 15, ay: 124, collide: { c: 0, y: 0, r: 4 } };
}

export function signPost(text, color = '#1f5f46', w = 120) {
  const canvas = paint(w + 20, 90, ctx => {
    groundShadow(ctx, (w + 20) / 2, 84, 20, 4);
    ctx.fillStyle = '#6b4a33'; ctx.fillRect((w + 20) / 2 - 3, 30, 6, 54);
    rrect(ctx, 10, 6, w, 30, 6, color);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(13, 9, w - 6, 24, 4); ctx.stroke();
    ctx.fillStyle = '#fbf3dc'; ctx.font = font(11); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 10 + w / 2, 21.5, w - 14);
  });
  return { canvas, ax: (w + 20) / 2, ay: 84, collide: { c: 0, y: 0, r: 4 } };
}

export function slide() {
  const canvas = paint(90, 110, ctx => {
    groundShadow(ctx, 45, 102, 40, 8);
    ctx.fillStyle = '#6f7479'; ctx.fillRect(56, 20, 4, 82); ctx.fillRect(80, 20, 4, 82);
    for (let y = 30; y < 100; y += 12) ctx.fillRect(56, y, 28, 3);
    rrect(ctx, 52, 16, 36, 8, 2, '#2f6fa3');
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(56, 20); ctx.quadraticCurveTo(30, 40, 8, 98); ctx.lineTo(24, 100); ctx.quadraticCurveTo(38, 50, 60, 28); ctx.closePath(); ctx.fill();
  });
  return { canvas, ax: 45, ay: 100, collide: { c: 0, rect: [-38, -14, 76, 14] } };
}

export function swings() {
  const canvas = paint(130, 110, ctx => {
    groundShadow(ctx, 65, 104, 58, 7);
    ctx.strokeStyle = '#d8453b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(8, 104); ctx.lineTo(22, 12); ctx.lineTo(36, 104); ctx.moveTo(94, 104); ctx.lineTo(108, 12); ctx.lineTo(122, 104); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(20, 12); ctx.lineTo(110, 12); ctx.stroke();
    ctx.strokeStyle = '#8a9095'; ctx.lineWidth = 1.5;
    for (const x of [48, 82]) { ctx.beginPath(); ctx.moveTo(x - 8, 14); ctx.lineTo(x - 8, 78); ctx.moveTo(x + 8, 14); ctx.lineTo(x + 8, 78); ctx.stroke(); rrect(ctx, x - 11, 76, 22, 6, 2, '#2b2b2e'); }
  });
  return { canvas, ax: 65, ay: 104, collide: { c: 0, rect: [-60, -10, 18, 10] } };
}

export function tripod() {
  const canvas = paint(50, 80, ctx => {
    groundShadow(ctx, 25, 74, 18, 5);
    ctx.strokeStyle = '#3b3f44'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(25, 30); ctx.lineTo(10, 74); ctx.moveTo(25, 30); ctx.lineTo(40, 74); ctx.moveTo(25, 30); ctx.lineTo(25, 74); ctx.stroke();
    rrect(ctx, 11, 12, 28, 20, 4, '#2b2b2e');
    ellipse(ctx, 25, 22, 7, 7, '#5c6a73'); ellipse(ctx, 25, 22, 4, 4, '#9fd0e0');
    rrect(ctx, 30, 8, 7, 5, 1, '#d8453b');
  });
  return { canvas, ax: 25, ay: 74, collide: { c: 0, y: 0, r: 6 } };
}

export function lifeguardTower() {
  const canvas = paint(110, 150, ctx => {
    groundShadow(ctx, 55, 142, 44, 8);
    ctx.strokeStyle = '#e8e2d2'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(24, 142); ctx.lineTo(34, 70); ctx.moveTo(86, 142); ctx.lineTo(76, 70); ctx.stroke();
    rrect(ctx, 18, 44, 74, 34, 4, '#f2c230');
    ctx.fillStyle = '#d8352a'; ctx.fillRect(18, 44, 74, 10);
    rrect(ctx, 28, 58, 54, 14, 2, '#7fb0c2');
    ctx.fillStyle = '#d8352a'; ctx.beginPath(); ctx.moveTo(10, 44); ctx.lineTo(55, 20); ctx.lineTo(100, 44); ctx.closePath(); ctx.fill();
  });
  return { canvas, ax: 55, ay: 142, collide: { c: 0, rect: [-36, -10, 72, 10] } };
}

export function surfFlag() {
  // red over yellow: swim between the flags
  const canvas = paint(40, 90, ctx => {
    groundShadow(ctx, 12, 84, 8, 3);
    ctx.fillStyle = '#8a8f94'; ctx.fillRect(10, 8, 3, 76);
    ctx.fillStyle = '#d8352a'; ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(38, 8); ctx.lineTo(13, 34); ctx.fill();
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(38, 8); ctx.lineTo(38, 34); ctx.lineTo(13, 34); ctx.fill();
  });
  return { canvas, ax: 12, ay: 84, collide: null };
}

export function beachUmbrella(color = '#e0453b') {
  const canvas = paint(100, 100, ctx => {
    groundShadow(ctx, 60, 92, 40, 10, 0.2);
    rrect(ctx, 16, 76, 50, 18, 3, '#f3ead7'); ctx.fillStyle = color; for (let i = 0; i < 5; i++) ctx.fillRect(16 + i * 10, 76, 5, 18);
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(49, 26, 3, 66);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(6, 34); ctx.quadraticCurveTo(50, -8, 96, 34); ctx.quadraticCurveTo(50, 22, 6, 34); ctx.fill();
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.moveTo(34, 26); ctx.quadraticCurveTo(50, 2, 66, 26); ctx.quadraticCurveTo(50, 20, 34, 26); ctx.fill();
  });
  return { canvas, ax: 50, ay: 92, collide: { c: 0, y: 0, r: 5 } };
}

export function railing(len = 200) {
  const canvas = paint(len + 10, 40, ctx => {
    ctx.fillStyle = '#8a8f94';
    for (let x = 5; x <= len + 5; x += 20) ctx.fillRect(x, 8, 3, 28);
    rrect(ctx, 3, 6, len + 4, 4, 2, '#a7adb2'); rrect(ctx, 3, 20, len + 4, 3, 1.5, '#a7adb2');
  });
  return { canvas, ax: 5, ay: 36, collide: { c: 0, rect: [0, -6, len, 6] } };
}

export function fence(len = 200, color = '#3f7a54') {
  const canvas = paint(len + 10, 46, ctx => {
    ctx.fillStyle = color;
    for (let x = 5; x <= len + 5; x += 8) rrect(ctx, x, 6, 3, 36, 1.5, color);
    ctx.fillRect(3, 10, len + 4, 3); ctx.fillRect(3, 34, len + 4, 3);
    ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(3, 42, len + 4, 3);
  });
  return { canvas, ax: 5, ay: 42, collide: { c: 0, rect: [0, -6, len, 6] } };
}

export function jetty() {
  const canvas = paint(90, 160, ctx => {
    ctx.fillStyle = '#5b3f2a'; for (const x of [10, 76]) for (let y = 20; y < 150; y += 40) ctx.fillRect(x, y, 5, 14);
    rrect(ctx, 8, 0, 74, 150, 3, '#b08457');
    ctx.strokeStyle = 'rgba(80,50,30,.35)'; ctx.lineWidth = 1.5;
    for (let y = 8; y < 150; y += 9) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(82, y); ctx.stroke(); }
  });
  return { canvas, ax: 45, ay: 150, collide: null, flat: true };
}

export function picnicRug() {
  const canvas = paint(90, 60, ctx => {
    ctx.save(); ctx.beginPath(); ctx.roundRect(4, 6, 82, 48, 4); ctx.clip();
    for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? '#e0453b' : '#fbf1de'; ctx.fillRect(4 + i * 7, 6 + j * 7, 7, 7); }
    ctx.restore();
    rrect(ctx, 56, 16, 20, 14, 3, '#8a5a3c'); ellipse(ctx, 26, 36, 8, 6, '#f2c230');
  });
  return { canvas, ax: 45, ay: 54, collide: null, flat: true };
}

export function guitarCase() {
  const canvas = paint(60, 40, ctx => {
    groundShadow(ctx, 30, 34, 24, 4);
    ellipse(ctx, 18, 22, 13, 11, '#2b2b2e'); rrect(ctx, 24, 17, 32, 9, 4, '#2b2b2e');
    ctx.fillStyle = '#6f54a8'; ctx.fillRect(10, 18, 6, 3);
  });
  return { canvas, ax: 30, ay: 34, collide: null };
}

export function sandcastle() {
  const canvas = paint(60, 50, ctx => {
    groundShadow(ctx, 30, 44, 24, 5, 0.15);
    rrect(ctx, 10, 20, 40, 24, 3, '#dcc08a');
    for (const x of [10, 22, 34]) { rrect(ctx, x, 12, 14, 10, 2, '#e6cc96'); }
    ctx.fillStyle = '#d8352a'; ctx.fillRect(29, 0, 2, 12); ctx.beginPath(); ctx.moveTo(31, 0); ctx.lineTo(40, 3); ctx.lineTo(31, 6); ctx.fill();
  });
  return { canvas, ax: 30, ay: 44, collide: null };
}

export function crate(label = 'MILK') {
  const canvas = paint(40, 36, ctx => {
    groundShadow(ctx, 20, 32, 17, 4);
    rrect(ctx, 4, 6, 32, 26, 3, '#2f6fa3');
    ctx.strokeStyle = '#255a85'; ctx.lineWidth = 2; for (let x = 10; x < 36; x += 8) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 28); ctx.stroke(); }
  });
  return { canvas, ax: 20, ay: 32, collide: { c: 0, rect: [-15, -10, 30, 10] } };
}

export function featherItem() {
  const canvas = paint(34, 44, ctx => {
    ctx.save(); ctx.translate(17, 22); ctx.rotate(-0.4);
    ctx.fillStyle = '#fbfaf5'; ctx.strokeStyle = '#c8c1b0'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(10, -6, 5, 12); ctx.lineTo(-1, 16); ctx.quadraticCurveTo(-10, -2, 0, -18); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#e0a02a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(3, 0, -1, 20); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,190,170,.8)'; ctx.lineWidth = 0.8;
    for (let i = -10; i < 12; i += 4) { ctx.beginPath(); ctx.moveTo(1, i); ctx.lineTo(6, i - 3); ctx.moveTo(0, i); ctx.lineTo(-5, i - 3); ctx.stroke(); }
    ctx.restore();
  });
  return { canvas, ax: 17, ay: 40, collide: null };
}

export function secateurs() {
  const canvas = paint(30, 24, ctx => {
    ctx.strokeStyle = '#9aa3aa'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(16, 12); ctx.moveTo(4, 16); ctx.lineTo(16, 12); ctx.stroke();
    rrect(ctx, 15, 8, 12, 4, 2, '#d8352a'); rrect(ctx, 15, 13, 12, 4, 2, '#d8352a');
  });
  return { canvas, ax: 15, ay: 20, collide: null };
}

export function marker() {
  // soft bobbing chevron shown above the nearest interactable
  const canvas = paint(24, 20, ctx => {
    ctx.fillStyle = '#fff8e6'; ctx.strokeStyle = 'rgba(58,42,34,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(12, 15); ctx.lineTo(21, 4); ctx.quadraticCurveTo(12, 8, 3, 4); ctx.closePath(); ctx.stroke(); ctx.fill();
  });
  return { canvas, ax: 12, ay: 18, collide: null };
}

export function shed() {
  // little colorbond garden shed where the fishing rod lives
  const canvas = paint(110, 110, ctx => {
    groundShadow(ctx, 58, 102, 50, 9);
    rrect(ctx, 10, 40, 90, 62, 3, '#6f8f73');
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1;
    for (let x = 14; x < 100; x += 6) { ctx.beginPath(); ctx.moveTo(x, 42); ctx.lineTo(x, 100); ctx.stroke(); }
    ctx.fillStyle = '#5b7a60'; ctx.beginPath(); ctx.moveTo(4, 44); ctx.lineTo(55, 16); ctx.lineTo(106, 44); ctx.closePath(); ctx.fill();
    rrect(ctx, 38, 56, 34, 46, 2, '#4d6a52');
    ctx.fillStyle = '#c9c4b6'; ctx.fillRect(66, 76, 3, 8);
    // rod leaning on the wall
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(86, 102); ctx.lineTo(100, 20); ctx.stroke();
    ellipse(ctx, 89, 90, 4, 4, '#2b2b2e');
  });
  return { canvas, ax: 55, ay: 102, collide: { c: 0, rect: [-46, -58, 92, 56] } };
}

export function bobber() {
  const canvas = paint(16, 18, ctx => {
    ellipse(ctx, 8, 10, 6, 6, '#fbfaf5');
    ctx.save(); ctx.beginPath(); ctx.ellipse(8, 10, 6, 6, 0, Math.PI, 0); ctx.clip(); ctx.fillStyle = '#e0453b'; ctx.fillRect(0, 0, 16, 10); ctx.restore();
    ctx.fillStyle = '#2b2b2e'; ctx.fillRect(7.3, 1, 1.4, 4);
  });
  return { canvas, ax: 8, ay: 14, collide: null };
}

export function ferry() {
  // green-and-cream harbour ferry, side view
  const canvas = paint(320, 150, ctx => {
    ctx.fillStyle = 'rgba(20,60,80,.25)'; ctx.beginPath(); ctx.ellipse(160, 138, 150, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#1f6b47'; ctx.beginPath(); ctx.moveTo(10, 96); ctx.lineTo(310, 96); ctx.lineTo(292, 134); ctx.lineTo(28, 134); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f3ead7'; ctx.fillRect(12, 90, 296, 8);
    rrect(ctx, 40, 50, 240, 42, 6, '#f3ead7');
    for (let i = 0; i < 10; i++) rrect(ctx, 50 + i * 22, 58, 16, 20, 3, '#7fb0c2');
    rrect(ctx, 110, 20, 100, 32, 6, '#f3ead7');
    for (let i = 0; i < 4; i++) rrect(ctx, 118 + i * 23, 27, 17, 15, 3, '#7fb0c2');
    rrect(ctx, 150, 4, 18, 18, 3, '#1f6b47'); ctx.fillStyle = '#f2c230'; ctx.fillRect(150, 8, 18, 4);
    ctx.fillStyle = '#f3ead7'; ctx.font = '800 12px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NARRABEEN', 160, 124);
  });
  return { canvas, ax: 160, ay: 134, collide: null };
}

export function sailsHouse() {
  // a fictionalised harbour-side performing arts house: sandstone podium and white sail shells
  const W = 560, H = 340;
  const canvas = paint(W, H, ctx => {
    groundShadow(ctx, 290, 322, 260, 18, 0.2);
    rrect(ctx, 20, 250, 520, 72, 6, '#d9b98a');
    ctx.fillStyle = 'rgba(120,80,40,.25)'; for (let x = 24; x < 540; x += 22) ctx.fillRect(x, 254, 2, 66);
    const shell = (x, base, w, h, lean) => {
      ctx.fillStyle = '#f4f1e8';
      ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.quadraticCurveTo(x - w * 0.45 + lean * 0.3, base - h * 0.7, x + lean, base - h); ctx.quadraticCurveTo(x + w * 0.5 + lean * 0.2, base - h * 0.45, x + w / 2, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(170,165,150,.45)';
      ctx.beginPath(); ctx.moveTo(x + lean, base - h); ctx.quadraticCurveTo(x + w * 0.5 + lean * 0.2, base - h * 0.45, x + w / 2, base); ctx.lineTo(x + w * 0.1, base); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(190,185,170,.6)'; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + k * w / 6, base); ctx.quadraticCurveTo(x - w * 0.2 + k * 4, base - h * 0.5, x + lean, base - h); ctx.stroke(); }
      ctx.fillStyle = '#c9a36d'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, base); ctx.quadraticCurveTo(x, base - h * 0.28, x + w / 2 - 6, base); ctx.closePath(); ctx.fill();
    };
    shell(110, 256, 120, 150, 30); shell(190, 256, 130, 190, 34); shell(270, 256, 110, 130, 24);
    shell(360, 256, 130, 200, 36); shell(440, 256, 120, 160, 30); shell(500, 256, 80, 100, 20);
  });
  return { canvas, ax: 280, ay: 322, collide: { c: 0, rect: [-262, -90, 524, 88] } };
}

export function fig(scale = 1) {
  // Moreton Bay fig: huge dark canopy and buttress roots
  const r = rng(1234);
  const W = 230 * scale, H = 210 * scale, cx = W / 2, base = H - 14 * scale;
  const canvas = paint(W, H, ctx => {
    const s = scale;
    groundShadow(ctx, cx + 10, base, 100 * s, 24 * s, 0.28);
    ctx.fillStyle = '#8a7a66';
    ctx.beginPath(); ctx.moveTo(cx - 34 * s, base); ctx.quadraticCurveTo(cx - 12 * s, base - 30 * s, cx - 10 * s, base - 80 * s); ctx.lineTo(cx + 12 * s, base - 80 * s); ctx.quadraticCurveTo(cx + 14 * s, base - 30 * s, cx + 38 * s, base); ctx.closePath(); ctx.fill();
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + k * 8 * s, base - 20 * s); ctx.quadraticCurveTo(cx + k * 40 * s, base - 6 * s, cx + k * 56 * s, base + 2); ctx.lineTo(cx + k * 46 * s, base + 2); ctx.closePath(); ctx.fill(); }
    for (let i = 0; i < 9; i++) {
      const x = cx + (r() - 0.5) * 170 * s, y = base - (95 + r() * 60) * s, rr = (40 + r() * 20) * s;
      blob(ctx, x + 6, y + 8, rr, rr * 0.7, r, 10, 0.2); ctx.fillStyle = 'rgba(20,40,20,.25)'; ctx.fill();
      blob(ctx, x, y, rr, rr * 0.7, r, 10, 0.2); ctx.fillStyle = ['#2f5a34', '#3b6b3d', '#2a4f2e'][i % 3]; ctx.fill();
      blob(ctx, x - rr * 0.25, y - rr * 0.25, rr * 0.5, rr * 0.35, r, 8, 0.25); ctx.fillStyle = '#4f8250'; ctx.fill();
    }
  });
  return { canvas, ax: cx, ay: base, collide: { c: 0, y: -4 * scale, rx: 30 * scale, ry: 10 * scale } };
}

export function sandstoneBuilding(label = 'CUSTOMS HOUSE') {
  const w = 360, h = 150, W = w + 20, H = h + 60;
  const canvas = paint(W, H, ctx => {
    groundShadow(ctx, W / 2 + 8, 50 + h, w * 0.55, 12, 0.22);
    rrect(ctx, 10, 50, w, h, 3, '#dcb98a');
    rrect(ctx, 4, 34, w + 12, 20, 3, '#caa574');
    ctx.fillStyle = '#b8935f'; ctx.beginPath(); ctx.moveTo(W / 2 - 70, 34); ctx.lineTo(W / 2, 4); ctx.lineTo(W / 2 + 70, 34); ctx.closePath(); ctx.fill();
    ellipse(ctx, W / 2, 24, 9, 9, '#f7f0e0'); ctx.strokeStyle = '#3b3530'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2, 24); ctx.lineTo(W / 2, 18); ctx.moveTo(W / 2, 24); ctx.lineTo(W / 2 + 5, 24); ctx.stroke();
    for (let i = 0; i < 8; i++) { ctx.fillStyle = '#efdcb8'; ctx.fillRect(22 + i * 44, 60, 10, h - 14); }
    for (let i = 0; i < 7; i++) { windowPane(ctx, 40 + i * 44, 76, 20, 30, '#efdcb8'); windowPane(ctx, 40 + i * 44, 130, 20, 30, '#efdcb8'); }
    ctx.fillStyle = '#5b4a36'; ctx.font = font(12); ctx.textAlign = 'center'; ctx.fillText(label, W / 2, 48);
  });
  return { canvas, ax: W / 2, ay: 50 + h, collide: { c: 0, rect: [-w / 2, -h + 30, w, h - 34] } };
}

export function busker() {
  // open guitar case with a few coins
  const canvas = paint(60, 36, ctx => {
    groundShadow(ctx, 30, 30, 26, 4);
    ellipse(ctx, 22, 18, 16, 12, '#2b2b2e'); rrect(ctx, 30, 12, 26, 12, 5, '#2b2b2e');
    ellipse(ctx, 22, 18, 13, 9, '#7a2f3a'); rrect(ctx, 32, 14, 22, 8, 4, '#7a2f3a');
    for (const [x, y] of [[18, 16], [24, 20], [28, 15], [40, 18]]) ellipse(ctx, x, y, 2.4, 2.4, '#e9c46a');
  });
  return { canvas, ax: 30, ay: 30, collide: null };
}
