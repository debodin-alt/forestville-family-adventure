// "Level 5 Karting", Moore Park: an indoor electric-kart track on the top floor of a car park.
// Fictionalised: F1-style layout, tyre walls, painted kerbs, LED ceiling strips, concrete pillars.

import { makeCanvas, ellipse, rrect, rng, speckle, smoothPath, samplePath } from '../utils/canvas.js';

export const KW = 2400, KH = 1600, HW = 72;   // world size, track half-width
export const LAPS = 3;

const RAW = [
  [520, 1320], [1200, 1320], [1800, 1320], [2090, 1240], [2170, 1040], [2040, 890], [1780, 900],
  [1570, 1010], [1380, 950], [1300, 770], [1450, 570], [1770, 480], [2040, 390], [2090, 230],
  [1900, 150], [1400, 170], [900, 190], [560, 270], [420, 430], [560, 580], [520, 740],
  [300, 840], [220, 1040], [300, 1250],
];

// Closed centreline sampled evenly-ish.
function buildTrack() {
  const n = RAW.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = RAW[(i - 1 + n) % n], p1 = RAW[i], p2 = RAW[(i + 1) % n], p3 = RAW[(i + 2) % n];
    for (let s = 0; s < 18; s++) {
      const t = s / 18, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const N = out.length;
  out.forEach((p, i) => {
    const a = out[(i - 1 + N) % N], b = out[(i + 1) % N];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    p.tx = tx / l; p.ty = ty / l; p.nx = -p.ty; p.ny = p.tx; p.ang = Math.atan2(p.ty, p.tx);
  });
  // curvature (for AI braking and kerbs)
  out.forEach((p, i) => { const q = out[(i + 6) % N]; let d = q.ang - p.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; p.curve = d; });
  return out;
}
export const TRACK = buildTrack();
export const N = TRACK.length;

export function paintKartTrack() {
  const r = rng(505);
  const [c, ctx] = makeCanvas(KW, KH);
  // concrete car-park deck
  ctx.fillStyle = '#8b8f95'; ctx.fillRect(0, 0, KW, KH);
  speckle(ctx, 0, 0, KW, KH, 26000, ['#83878d', '#94989e', '#7c8086', '#9a9ea4'], r, [0.8, 2.2]);
  // faded parking bays and arrows
  ctx.strokeStyle = 'rgba(245,245,235,.25)'; ctx.lineWidth = 4;
  for (let x = 40; x < KW; x += 110) { ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 120); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, KH - 120); ctx.lineTo(x, KH - 20); ctx.stroke(); }
  ctx.fillStyle = 'rgba(242,194,48,.35)'; ctx.font = '900 110px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('LEVEL 5', 1250, 700);
  ctx.font = '900 40px ui-rounded, system-ui, sans-serif'; ctx.fillStyle = 'rgba(245,245,235,.3)'; ctx.fillText('MOORE PARK', 1250, 760);
  // track layers: tyre-wall shadow, kerbs, asphalt
  const path = () => { ctx.beginPath(); TRACK.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  path(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = HW * 2 + 60; ctx.stroke();
  path(); ctx.strokeStyle = '#f4f1e8'; ctx.lineWidth = HW * 2 + 18; ctx.stroke();
  path(); ctx.strokeStyle = '#d8352a'; ctx.setLineDash([26, 26]); ctx.stroke(); ctx.setLineDash([]);
  path(); ctx.strokeStyle = '#3a3d44'; ctx.lineWidth = HW * 2; ctx.stroke();
  // rubber lines / racing line
  path(); ctx.strokeStyle = 'rgba(20,20,24,.35)'; ctx.lineWidth = 26; ctx.stroke();
  path(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.setLineDash([30, 40]); ctx.stroke(); ctx.setLineDash([]);
  // tyre walls: stacked tyres along both edges, some painted
  for (let i = 0; i < N; i += 2) {
    const p = TRACK[i];
    for (const side of [-1, 1]) {
      const d = HW + 20;
      const x = p.x + p.nx * d * side, y = p.y + p.ny * d * side;
      // skip tyres that would sit on another part of the track
      if (TRACK.some((q, j) => Math.abs(j - i) > 8 && Math.abs(j - i) < N - 8 && Math.hypot(q.x - x, q.y - y) < HW + 10)) continue;
      ellipse(ctx, x + 2, y + 3, 10, 10, 'rgba(0,0,0,.25)');
      ellipse(ctx, x, y, 10, 10, (i / 2) % 6 === 0 ? '#e8e3d6' : (i / 2) % 6 === 3 ? '#d8352a' : '#1f2023');
      ellipse(ctx, x, y, 4, 4, '#4a4b50');
    }
  }
  // start / finish gantry line and grid boxes
  const s = TRACK[0];
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang);
  for (let row = 0; row < 2; row++) for (let k = -HW; k < HW; k += 12) { ctx.fillStyle = ((k / 12 + row) & 1) ? '#fff' : '#111'; ctx.fillRect(row * 12 - 12, k, 12, 12); }
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
  for (let g = 0; g < 4; g++) { const gx = -60 - g * 55, gy = g % 2 ? 26 : -26; ctx.beginPath(); ctx.moveTo(gx, gy - 16); ctx.lineTo(gx - 26, gy - 16); ctx.moveTo(gx, gy + 16); ctx.lineTo(gx - 26, gy + 16); ctx.moveTo(gx, gy - 16); ctx.lineTo(gx, gy + 16); ctx.stroke(); }
  ctx.restore();
  // concrete pillars with hazard stripes (only where they don't touch the track)
  for (let x = 160; x < KW; x += 400) for (let y = 160; y < KH; y += 400) {
    if (TRACK.some(q => Math.hypot(q.x - x, q.y - y) < HW + 70)) continue;
    rrect(ctx, x - 26 + 6, y - 26 + 8, 52, 52, 4, 'rgba(0,0,0,.25)');
    rrect(ctx, x - 26, y - 26, 52, 52, 4, '#b4b7bc');
    ctx.save(); ctx.beginPath(); ctx.rect(x - 26, y + 14, 52, 12); ctx.clip();
    for (let k = -40; k < 40; k += 12) { ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(x + k, y + 26); ctx.lineTo(x + k + 6, y + 26); ctx.lineTo(x + k + 18, y + 14); ctx.lineTo(x + k + 12, y + 14); ctx.fill(); }
    ctx.restore();
  }
  // pit wall + timing screen near the start
  rrect(ctx, 700, 1415, 600, 16, 4, '#dcdfe3');
  rrect(ctx, 880, 1440, 240, 60, 6, '#15171b'); ctx.fillStyle = '#39d98a'; ctx.font = '800 22px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('LIVE TIMING', 1000, 1478);
  return c;
}

// Top-down electric kart (drawn at 2x). Points along +x.
export function paintKart(color, num) {
  const [c, ctx] = makeCanvas(76 * 2, 48 * 2);
  ctx.scale(2, 2);
  const tyre = (x, y) => rrect(ctx, x - 7, y - 4.5, 14, 9, 3, '#17181b');
  tyre(16, 8); tyre(16, 40); tyre(58, 9); tyre(58, 39);
  ctx.fillStyle = '#2b2d33'; ctx.fillRect(14, 21, 48, 6);                    // chassis rail
  rrect(ctx, 22, 12, 34, 24, 8, color);                                      // body
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(52, 14); ctx.lineTo(72, 18); ctx.lineTo(72, 30); ctx.lineTo(52, 34); ctx.closePath(); ctx.fill(); // nose
  rrect(ctx, 6, 14, 8, 20, 3, '#2b2d33');                                    // rear bumper
  ellipse(ctx, 34, 24, 9, 8, '#1d1e22');                                     // seat
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(56, 20, 12, 3);
  rrect(ctx, 44, 16, 10, 16, 3, '#f4f1e8');                                  // number plate
  ctx.fillStyle = '#1d1e22'; ctx.font = '900 11px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(49, 24); ctx.rotate(Math.PI / 2); ctx.fillText(String(num), 0, 0.5); ctx.restore();
  ctx.fillStyle = '#39d98a'; ctx.fillRect(8, 22, 3, 4);                        // "electric" status light
  return c;
}
