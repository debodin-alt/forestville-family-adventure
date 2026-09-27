// Circular Quay & Bennelong Point (fictionalised): ferry wharves, the bridge across the water,
// the sail-roofed arts house, the Botanic Garden figs, buskers and a lot of seagulls.

import { PAL, pavers, flowers, rng, ellipse, rrect, blob, speckle, smoothPath } from '../../art/ground.js';

const W = 2800, H = 1800;

export const LAND = [[0, 690], [2040, 690], [2040, 330], [2130, 250], [2600, 250], [2700, 330], [2720, 640], [2800, 700], [W, H], [0, H]];
export const WHARVES = [[380, 430, 120, 262], [780, 430, 120, 262], [1180, 430, 120, 262]];
export const HSPOTS = {
  ferry: [840, 520],
  busk: [1520, 830],
  steps: [2380, 700],
  tripod: [2470, 740],
};
const STEPS = [2090, 600, 580, 110];

const inRect = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const onWharf = (x, y) => WHARVES.some(w => inRect(x, y, w));
const onLand = (x, y) => inPoly(x, y, LAND) || onWharf(x, y);

export const AREAS = [
  { id: 'steps', name: 'BENNELONG POINT', rect: [2040, 240, 760, 620], amb: 'village' },
  { id: 'wharves', name: 'CIRCULAR QUAY', rect: [0, 400, 2040, 560], amb: 'village' },
  { id: 'garden', name: 'BOTANIC GARDEN', rect: [1800, 860, 1000, 940], amb: 'bush' },
  { id: 'city', name: 'THE CITY', rect: [0, 960, 1800, 840], amb: 'village' },
];

export function paintGround(ctx) {
  const r = rng(77);
  // harbour water
  const g = ctx.createLinearGradient(0, 0, 0, 700);
  g.addColorStop(0, '#2f7fa6'); g.addColorStop(1, '#2a6f93');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  speckle(ctx, 0, 0, W, 760, 2600, ['rgba(255,255,255,.2)', 'rgba(10,50,80,.2)'], r, [1.5, 4]);
  // far shore with houses and trees
  ctx.fillStyle = '#5f8f5a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 50); ctx.quadraticCurveTo(1400, 90, 0, 60); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 40; i++) { const x = r() * W, y = 10 + r() * 34; rrect(ctx, x, y, 18, 12, 2, ['#e8dcc4', '#c2643d', '#f3eee4'][i % 3]); }
  // the bridge, seen from the quay
  ctx.fillStyle = '#d6b484'; rrect(ctx, 40, 120, 70, 130, 4, '#d6b484'); rrect(ctx, 1000, 120, 70, 130, 4, '#d6b484');
  ctx.strokeStyle = '#5c666e'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(110, 240); ctx.quadraticCurveTo(555, -40, 1000, 240); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(110, 240); ctx.quadraticCurveTo(555, 20, 1000, 240); ctx.stroke();
  ctx.lineWidth = 2; for (let x = 140; x < 1000; x += 34) { const t = (x - 110) / 890, yTop = 240 - 4 * t * (1 - t) * 280 * 0.5 - 4 * t * (1 - t) * 1; ctx.beginPath(); ctx.moveTo(x, 240 - 4 * t * (1 - t) * 140 - 2); ctx.lineTo(x, 238); ctx.stroke(); }
  ctx.fillStyle = '#4d565e'; ctx.fillRect(-10, 236, 1100, 12);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-10, 250, 1100, 6);
  // land
  ctx.save(); smoothPath(ctx, LAND, true); ctx.fillStyle = '#e4d6bb'; ctx.fill(); ctx.clip();
  pavers(ctx, 0, 690, 2100, 280, '#e6d4b2');
  ctx.fillStyle = '#b9ab91'; ctx.fillRect(0, 690, 2040, 8);             // sea wall edge
  pavers(ctx, 2040, 240, 760, 640, '#ead9b8');                           // forecourt
  // grand steps up to the sails
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#dcc6a0' : '#e8d4ae'; ctx.fillRect(STEPS[0], STEPS[1] + i * 9, STEPS[2], 9); }
  ctx.fillStyle = 'rgba(120,90,50,.18)'; for (let i = 0; i < 12; i++) ctx.fillRect(STEPS[0], STEPS[1] + i * 9 + 7, STEPS[2], 2);
  // city streets and garden
  ctx.fillStyle = '#5d6168'; ctx.fillRect(0, 980, 1800, 90);
  ctx.fillStyle = 'rgba(250,245,230,.8)'; for (let x = 10; x < 1800; x += 44) ctx.fillRect(x, 1023, 24, 4);
  pavers(ctx, 0, 1070, 1800, 730, '#e1d2b4');
  ctx.fillStyle = '#9cc27c'; ctx.fillRect(1800, 880, 1000, 920);
  speckle(ctx, 1800, 880, 1000, 920, 6000, [PAL.grassD, PAL.grassL], r, [1, 2.4]);
  ctx.strokeStyle = PAL.path; ctx.lineWidth = 30; smoothPath(ctx, [[1800, 1300], [2100, 1200], [2400, 1320], [2800, 1200]]); ctx.stroke();
  flowers(ctx, 1900, 1400, 700, 300, 120, r);
  ctx.restore();
  // wharves (timber) + edge foam
  for (const [x, y, w, h] of WHARVES) {
    ctx.fillStyle = '#5b3f2a'; for (let yy = y + 10; yy < y + h; yy += 40) { ctx.fillRect(x - 4, yy, 6, 14); ctx.fillRect(x + w - 2, yy, 6, 14); }
    rrect(ctx, x, y, w, h, 3, '#a8845c');
    ctx.strokeStyle = 'rgba(80,50,30,.35)'; ctx.lineWidth = 1.5; for (let yy = y + 6; yy < y + h; yy += 9) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  }
  ctx.save(); smoothPath(ctx, LAND, true); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
}

export function buildProps() {
  const r = rng(12);
  const P = [];
  const add = (kind, x, y, ...args) => P.push({ kind, args, x, y });
  add('sailsHouse', 2380, 560);
  add('ferry', 840, 428);   // moored at the end of wharf 3
  for (const [i, [x]] of WHARVES.entries()) add('signPost', x - 40, 716, `WHARF ${i + 2}`, '#1f6b47', 70);
  add('signPost', 700, 760, 'FERRIES → MANLY', '#1f6b47', 130);
  add('signPost', 560, 972, 'BUS → MOORE PARK KARTS', '#c2643d', 170);
  add('sandstoneBuilding', 900, 1240, 'CUSTOMS HOUSE');
  add('shop', 380, 1240, 'cafe', { name: 'QUAY COFFEE' });
  add('shop', 1450, 1240, 'kiosk', { name: 'HARBOUR GELATO' });
  add('busker', HSPOTS.busk[0] - 40, HSPOTS.busk[1] + 20);
  for (let x = 120; x < 2000; x += 260) add('lamp', x, 720);
  for (const x of [300, 1000, 1700]) add('bench', x, 900);
  add('bins', 1250, 920);
  for (const [x, y] of [[1950, 1000], [2250, 1060], [2600, 980], [2000, 1600], [2450, 1650], [2700, 1450]]) add('fig', x, y, 0.9 + r() * 0.3);
  for (const [x, y] of [[100, 1500], [600, 1650], [1300, 1550], [1650, 1400]]) add('roundTree', x, y, (x / 100) % 3 | 0, 1);
  add('tripod', HSPOTS.tripod[0], HSPOTS.tripod[1]);
  add('railing', 2060, 262, 520);
  return P;
}

export function colliders() {
  return [{ fn: (x, y) => !onLand(x, y) }];
}

export function surfaceAt(x, y) {
  if (onWharf(x, y)) return 'wood';
  if (!inPoly(x, y, LAND)) return 'water';
  if (x > 1800 && y > 880) return 'grass';
  return 'hard';
}

export function fishWater(x, y) { return onLand(x, y) ? null : 'harbour'; }

export const harbour = {
  id: 'harbour', w: W, h: H, bg: '#2a6f93', edgeTop: '#5f8f5a', edgeBottom: '#e1d2b4',
  spawn: [HSPOTS.ferry[0], HSPOTS.ferry[1] + 170],
  kartStop: [560, 1060],
  family: { dan: [980, 820], finn: [1250, 880], jessia: [HSPOTS.busk[0], HSPOTS.busk[1]], jarency: [2300, 780] },
  npcs: [],
  areas: AREAS, paintGround, buildProps, colliders, surfaceAt, fishWater,
  roads: [],
};
