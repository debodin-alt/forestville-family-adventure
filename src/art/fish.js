// Procedural fish / sea-life painter (used for catch cards, the album and snorkel creatures).

import { makeCanvas, ellipse, rrect } from '../utils/canvas.js';

const BODY = {
  perch: [0.42, 0.22], slim: [0.46, 0.14], eel: [0.5, 0.07], flat: [0.46, 0.12], minnow: [0.36, 0.16],
  jacket: [0.36, 0.24], groper: [0.44, 0.24], pj: [0.46, 0.14], wobbe: [0.48, 0.12],
};

export function paintFish(spec, W = 160, H = 100, silhouette = false) {
  const [c, ctx] = makeCanvas(W, H);
  ctx.scale(W / 160, H / 100); W = 160; H = 100;   // draw in a fixed 160x100 space
  const col = silhouette ? '#b9ad92' : spec.col, belly = silhouette ? '#b9ad92' : spec.belly, fin = silhouette ? '#b9ad92' : (spec.fin || spec.col);
  const cx = W / 2, cy = H / 2, s = spec.shape;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const eye = (x, y, r = 3) => { if (silhouette) return; ellipse(ctx, x, y, r, r, '#fff'); ellipse(ctx, x + 0.6, y, r * 0.55, r * 0.55, '#1b1b1b'); };

  if (BODY[s]) {
    const [kx, ky] = BODY[s];
    const rx = W * kx * 0.9, ry = H * ky * 1.6;
    // tail
    ctx.fillStyle = fin;
    ctx.beginPath(); ctx.moveTo(cx - rx * 0.85, cy); ctx.lineTo(cx - rx * 1.25, cy - ry * 0.9); ctx.quadraticCurveTo(cx - rx * 1.05, cy, cx - rx * 1.25, cy + ry * 0.9); ctx.closePath(); ctx.fill();
    if (s === 'eel') { ctx.strokeStyle = col; ctx.lineWidth = ry * 1.6; ctx.beginPath(); ctx.moveTo(cx - rx, cy + 6); ctx.bezierCurveTo(cx - rx * 0.3, cy - 14, cx + rx * 0.2, cy + 16, cx + rx, cy); ctx.stroke(); eye(cx + rx * 0.85, cy - 2, 2.5); return c; }
    // dorsal fin
    ctx.fillStyle = fin; ctx.beginPath(); ctx.moveTo(cx - rx * 0.5, cy - ry * 0.8); ctx.quadraticCurveTo(cx - rx * 0.1, cy - ry * 1.6, cx + rx * 0.35, cy - ry * 0.85); ctx.closePath(); ctx.fill();
    // body
    ellipse(ctx, cx, cy, rx, ry, col);
    if (!silhouette) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.clip();
      ellipse(ctx, cx, cy + ry * 0.55, rx * 1.1, ry * 0.6, belly);
      if (s === 'flat' || s === 'wobbe') for (let i = 0; i < 14; i++) ellipse(ctx, cx - rx + (i * 37 % (rx * 2)), cy - ry * 0.3 + (i * 13 % (ry)), 3, 2, 'rgba(60,40,20,.35)');
      if (s === 'pj') for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(50,35,20,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - rx * 0.4 + i * 18, cy - ry); ctx.lineTo(cx - rx * 0.2 + i * 18, cy + ry * 0.3); ctx.stroke(); }
      if (s === 'groper') { ellipse(ctx, cx + rx * 0.55, cy - ry * 0.1, rx * 0.35, ry * 0.7, 'rgba(255,255,255,.12)'); }
      if (s === 'jacket') { ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 6; i++) ctx.fillRect(cx - rx + i * 12, cy - ry, 5, ry * 2); }
      ctx.restore();
      if (s === 'jacket') { ctx.strokeStyle = fin; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + rx * 0.2, cy - ry); ctx.lineTo(cx + rx * 0.3, cy - ry * 1.8); ctx.stroke(); }
    }
    ellipse(ctx, cx + rx * 0.3, cy + ry * 0.35, rx * 0.2, ry * 0.25, fin, 0.4);
    eye(cx + rx * 0.62, cy - ry * 0.2, s === 'minnow' ? 2.5 : 3.5);
    return c;
  }
  if (s === 'yabby' ) {
    ellipse(ctx, cx - 10, cy, 30, 12, col); ellipse(ctx, cx - 44, cy, 10, 12, col);
    for (const k of [-1, 1]) { ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 12, cy + k * 6); ctx.lineTo(cx + 34, cy + k * 22); ctx.stroke(); ellipse(ctx, cx + 42, cy + k * 26, 12, 7, col, k * 0.4); }
    ctx.strokeStyle = belly; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 30 + i * 10, cy - 11); ctx.lineTo(cx - 30 + i * 10, cy + 11); ctx.stroke(); }
    eye(cx + 18, cy - 5, 2.5); return c;
  }
  if (s === 'boot') { rrect(ctx, cx - 14, cy - 36, 30, 56, 6, col); rrect(ctx, cx - 14, cy + 6, 56, 20, 8, col); ctx.fillStyle = belly; ctx.fillRect(cx - 14, cy - 36, 30, 6); return c; }
  if (s === 'thong') { ellipse(ctx, cx, cy, 44, 18, col, -0.2); ellipse(ctx, cx, cy, 38, 13, belly, -0.2); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 20, cy - 4); ctx.lineTo(cx - 4, cy - 12); ctx.moveTo(cx + 20, cy - 4); ctx.lineTo(cx - 2, cy + 8); ctx.stroke(); return c; }
  if (s === 'packet') { rrect(ctx, cx - 26, cy - 30, 52, 60, 6, col); ctx.fillStyle = belly; ctx.fillRect(cx - 26, cy - 8, 52, 16); return c; }
  if (s === 'squid' || s === 'cuttle') {
    ellipse(ctx, cx + 8, cy, s === 'cuttle' ? 34 : 38, s === 'cuttle' ? 20 : 13, col);
    if (s === 'cuttle') { ctx.strokeStyle = belly; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx + 8, cy, 36, 22, 0, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 24, cy + i * 3); ctx.quadraticCurveTo(cx - 40, cy + i * 5, cx - 52, cy + i * 7 + 4); ctx.stroke(); }
    eye(cx - 16, cy - 6, 3); return c;
  }
  if (s === 'turtle') {
    for (const [x, y] of [[-30, -20], [-30, 20], [26, -24], [26, 24]]) ellipse(ctx, cx + x, cy + y, 14, 7, belly, x > 0 ? (y > 0 ? 0.6 : -0.6) : 0);
    ellipse(ctx, cx + 42, cy, 12, 10, belly); eye(cx + 46, cy - 3, 2.5);
    ellipse(ctx, cx, cy, 36, 28, col);
    ctx.strokeStyle = 'rgba(40,60,20,.45)'; ctx.lineWidth = 2; for (const [x, y] of [[-12, -8], [12, -8], [0, 10], [-16, 12], [16, 12]]) { ctx.beginPath(); ctx.arc(cx + x, cy + y, 9, 0, 7); ctx.stroke(); }
    return c;
  }
  ellipse(ctx, cx, cy, 40, 16, col); return c;
}
