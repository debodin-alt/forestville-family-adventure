// Ground painting helpers used by the map painters.

import { ellipse, rrect, blob, speckle, smoothPath, rng, shade } from '../utils/canvas.js';

export const PAL = {
  grass: '#9cc27c', grassD: '#86b06a', grassL: '#b2d18d',
  bush: '#7fa062', bushD: '#6b8c52', litter: ['#b69a6a', '#a4875a', '#8f9f5f', '#c7ad7c'],
  path: '#e3c48f', pathD: '#c9a36d', pathL: '#efd9ae',
  road: '#5d6168', roadL: '#6b7078', kerb: '#d7d0c2', foot: '#dcd3c2',
  paver: '#e7d4b2', paverLine: 'rgba(160,125,80,.25)',
  water: '#5fa7b6', waterD: '#3f8599', waterL: '#8fc7cf',
  sand: '#ecd7a6', sandD: '#dcc08a', softfall: '#c9744d', oval: '#8fc06d',
  mulch: '#8a5f3e', lawn: '#a6cf82',
};

export function fillAll(ctx, w, h, col, r, spk = PAL.grassD) {
  ctx.fillStyle = col; ctx.fillRect(0, 0, w, h);
  speckle(ctx, 0, 0, w, h, (w * h) / 180, [spk, PAL.grassL, shade(col, -0.08)], r, [1, 2.4]);
}

export function grassPatch(ctx, x, y, w, h, r, col = PAL.grass) {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  speckle(ctx, x, y, w, h, (w * h) / 160, [PAL.grassD, PAL.grassL, '#93bb72'], r, [1, 2.4]);
}

// Organic bush floor with leaf litter.
export function bushFloor(ctx, pts, r) {
  ctx.save();
  smoothPath(ctx, pts, true); ctx.fillStyle = PAL.bush; ctx.fill(); ctx.clip();
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  speckle(ctx, x0, y0, x1 - x0, y1 - y0, ((x1 - x0) * (y1 - y0)) / 90, [...PAL.litter, PAL.bushD, '#8fb06c'], r, [1.2, 3.4]);
  // darker dappled shade blobs
  for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 16000; i++) {
    blob(ctx, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 30 + r() * 60, 20 + r() * 40, r, 8, 0.3);
    ctx.fillStyle = 'rgba(60,85,45,.14)'; ctx.fill();
  }
  ctx.restore();
}

export function trackPath(ctx, pts, width, r) {
  smoothPath(ctx, pts); ctx.strokeStyle = PAL.pathD; ctx.lineWidth = width + 8; ctx.stroke();
  smoothPath(ctx, pts); ctx.strokeStyle = PAL.path; ctx.lineWidth = width; ctx.stroke();
  smoothPath(ctx, pts); ctx.strokeStyle = 'rgba(255,240,210,.35)'; ctx.lineWidth = width * 0.35; ctx.stroke();
  // pebbles
  ctx.save(); smoothPath(ctx, pts); ctx.lineWidth = width; ctx.strokeStyle = '#000';
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    for (let k = 0; k < 16; k++) {
      const t = r(), off = (r() - 0.5) * width * 0.8;
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
      ellipse(ctx, ax + dx * t - dy / l * off, ay + dy * t + dx / l * off, 1.5 + r() * 2, 1 + r() * 1.5, r() > 0.5 ? PAL.pathD : '#f2e0bc');
    }
  }
  ctx.restore();
}

export function creek(ctx, pts, width) {
  smoothPath(ctx, pts); ctx.strokeStyle = '#b89a6a'; ctx.lineWidth = width + 14; ctx.stroke();
  smoothPath(ctx, pts); ctx.strokeStyle = PAL.waterD; ctx.lineWidth = width; ctx.stroke();
  smoothPath(ctx, pts); ctx.strokeStyle = PAL.water; ctx.lineWidth = width * 0.6; ctx.stroke();
  smoothPath(ctx, pts); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.setLineDash([10, 18]); ctx.stroke(); ctx.setLineDash([]);
}

export function road(ctx, x, y, w, h, vertical, r) {
  // footpath + kerb + asphalt
  ctx.fillStyle = PAL.road; ctx.fillRect(x, y, w, h);
  speckle(ctx, x, y, w, h, (w * h) / 120, ['#565a61', '#666b73', '#51555b'], r, [0.8, 1.8]);
  ctx.fillStyle = PAL.kerb;
  if (vertical) { ctx.fillRect(x - 4, y, 4, h); ctx.fillRect(x + w, y, 4, h); }
  else { ctx.fillRect(x, y - 4, w, 4); ctx.fillRect(x, y + h, w, 4); }
  // centre dashes
  ctx.fillStyle = 'rgba(250,245,230,.85)';
  if (vertical) for (let yy = y + 10; yy < y + h; yy += 44) ctx.fillRect(x + w / 2 - 2, yy, 4, 24);
  else for (let xx = x + 10; xx < x + w; xx += 44) ctx.fillRect(xx, y + h / 2 - 2, 24, 4);
}

export function footpath(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.foot; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(150,140,120,.25)'; ctx.lineWidth = 1;
  if (w > h) for (let xx = x; xx < x + w; xx += 28) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
  else for (let yy = y; yy < y + h; yy += 28) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
}

export function zebra(ctx, x, y, w, h, vertical) {
  ctx.fillStyle = '#f7f3e8';
  if (vertical) for (let yy = y + 4; yy < y + h; yy += 18) ctx.fillRect(x, yy, w, 10);
  else for (let xx = x + 4; xx < x + w; xx += 18) ctx.fillRect(xx, y, 10, h);
}

export function pavers(ctx, x, y, w, h, col = PAL.paver) {
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.paverLine; ctx.lineWidth = 1;
  for (let yy = y; yy < y + h; yy += 16) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  for (let yy = y, row = 0; yy < y + h; yy += 16, row++) for (let xx = x + (row % 2 ? 16 : 0); xx < x + w; xx += 32) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 16); ctx.stroke(); }
}

export function pond(ctx, cx, cy, rx, ry, r) {
  ellipse(ctx, cx, cy + 6, rx + 22, ry + 20, '#c9ae7d');
  ellipse(ctx, cx, cy, rx + 12, ry + 10, '#b89a6a');
  const g = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.3, 10, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, PAL.waterL); g.addColorStop(0.55, PAL.water); g.addColorStop(1, PAL.waterD);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  // lily pads
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = 0.55 + r() * 0.35;
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    ellipse(ctx, x, y, 9, 6, '#5f9a52'); ctx.fillStyle = PAL.water; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 9, 0.2, 0.7); ctx.fill();
    if (i % 4 === 0) ellipse(ctx, x + 3, y - 2, 3, 3, '#f4c6d4');
  }
  // reeds
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 0.96 + r() * 0.1;
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    ctx.strokeStyle = r() > 0.5 ? '#6f9a4f' : '#8fb062'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 6, y - 12 - r() * 10); ctx.stroke();
  }
}

export function flowers(ctx, x, y, w, h, n, r, cols = ['#f2c230', '#f4f1ea', '#e0546c', '#b56ad0', '#f29c38']) {
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h, c = cols[(r() * cols.length) | 0];
    ctx.strokeStyle = '#5f8f4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py + 5); ctx.lineTo(px, py); ctx.stroke();
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ellipse(ctx, px + Math.cos(a) * 2.2, py + Math.sin(a) * 2.2, 1.8, 1.8, c); }
    ellipse(ctx, px, py, 1.2, 1.2, '#f7d24a');
  }
}

export function gardenBed(ctx, x, y, w, h, r) {
  rrect(ctx, x - 3, y - 3, w + 6, h + 6, 8, '#c9b089');
  rrect(ctx, x, y, w, h, 6, PAL.mulch);
  speckle(ctx, x, y, w, h, (w * h) / 40, ['#7a5236', '#9a6a45', '#6d4a31'], r, [1, 2]);
}

export function lawnStripes(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.lawn; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let xx = x; xx < x + w; xx += 36) ctx.fillRect(xx, y, 18, h);
}

export function softShadow(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(40,55,30,.12)'; ctx.fillRect(x, y, w, h);
}

export { rng, ellipse, rrect, blob, speckle, smoothPath };
