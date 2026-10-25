// Taronga Zoo (fictionalised): on the hill across the harbour from the city.
// Ferry wharf at the top, enclosures along the paths, picnic lawn and the bus at the bottom.

import { PAL, flowers, rng, ellipse, rrect, blob, speckle, smoothPath, bushFloor } from '../../art/ground.js';
import { samplePath, distToPolyline } from '../../utils/canvas.js';

const W = 2800, H = 2000;

// shoreline: water above, zoo below
export const LAND = [[0, 262], [500, 250], [1000, 272], [1500, 246], [2000, 262], [2500, 244], [W, 258], [W, H], [0, H]];
export const WHARF = [300, 96, 110, 176];

// Enclosures: rect [x, y, w, h], plus the "gate" spot in front where you bring babies home.
export const PENS = {
  koala:   { name: 'KOALA WALK', rect: [820, 320, 460, 240], gate: [1050, 620], sign: 'KOALAS' },
  giraffe: { name: 'GIRAFFE LOOKOUT', rect: [1700, 300, 720, 290], gate: [2060, 650], sign: 'GIRAFFES' },
  meerkat: { name: 'MEERKAT MOUNDS', rect: [360, 830, 500, 300], gate: [610, 1190], sign: 'MEERKATS' },
  penguin: { name: 'PENGUIN COVE', rect: [1160, 830, 560, 310], gate: [1440, 1200], sign: 'PENGUINS' },
  roo:     { name: 'ROO WALKABOUT', rect: [2160, 830, 560, 340], gate: [2440, 1230], sign: 'KANGAROOS' },
};

export const ZSPOTS = {
  ferry: [355, 300],
  gate: [355, 430],
  tui: [560, 520],
  bus: [2560, 1866],
  fountain: [1450, 1560],
  cafe: [760, 1440],
  gift: [1880, 1440],
  bins: [930, 1430],
};

const PATHS = [
  [[355, 280], [380, 520], [620, 660], [1200, 670], [1900, 680], [2620, 700], [2760, 760]],
  [[120, 1250], [700, 1240], [1440, 1260], [2100, 1290], [2760, 1300]],
  [[1000, 680], [990, 1000], [1010, 1250], [1000, 1600], [1040, 1980]],
  [[2760, 760], [2770, 1300]],
  [[2100, 1290], [2300, 1640], [2560, 1880]],
  [[1010, 1600], [1450, 1640], [1900, 1600], [2300, 1640]],
];
const PATH_PTS = PATHS.map(p => samplePath(p, 14));
const onPath = (x, y) => PATH_PTS.some(p => distToPolyline(x, y, p) < 46);

const inRect = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const onWharf = (x, y) => inRect(x, y, WHARF);
const onLand = (x, y) => inPoly(x, y, LAND) || onWharf(x, y);

export const AREAS = [
  { id: 'entrance', name: 'TARONGA ZOO', rect: [0, 240, 800, 500], amb: 'village' },
  { id: 'koala', name: 'KOALA WALK', rect: [800, 240, 700, 500], amb: 'bush' },
  { id: 'giraffe', name: 'GIRAFFE LOOKOUT', rect: [1500, 240, 1300, 500], amb: 'bush' },
  { id: 'meerkat', name: 'MEERKAT MOUNDS', rect: [0, 740, 980, 600], amb: 'bush' },
  { id: 'penguin', name: 'PENGUIN COVE', rect: [980, 740, 960, 600], amb: 'beach' },
  { id: 'roo', name: 'ROO WALKABOUT', rect: [1940, 740, 860, 600], amb: 'bush' },
  { id: 'lawn', name: 'PICNIC LAWN', rect: [0, 1340, W, 660], amb: 'suburb' },
];

function wall(ctx, [x, y, w, h]) {
  ctx.strokeStyle = 'rgba(80,60,40,.25)'; ctx.lineWidth = 18; ctx.strokeRect(x, y + 4, w, h);
  ctx.strokeStyle = '#d2b98e'; ctx.lineWidth = 14; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = '#b89a6c'; ctx.lineWidth = 2; ctx.strokeRect(x - 7, y - 7, w + 14, h + 14);
  ctx.strokeStyle = 'rgba(255,250,235,.5)'; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
}

export function paintGround(ctx) {
  const r = rng(321);
  // harbour
  const g = ctx.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, '#2f7fa6'); g.addColorStop(1, '#3a8fb3');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 300);
  speckle(ctx, 0, 60, W, 220, 1400, ['rgba(255,255,255,.22)', 'rgba(10,50,80,.2)'], r, [1.5, 4]);
  // the city across the water: towers, the bridge and the sails
  ctx.fillStyle = '#7fa6b8'; ctx.fillRect(0, 0, W, 46);
  for (let i = 0; i < 46; i++) {
    const x = 700 + i * 34 + r() * 10, h = 20 + r() * 60, w = 18 + r() * 16;
    ctx.fillStyle = ['#9db4c2', '#b7c6cf', '#8aa3b3', '#c9d3d8'][i % 4]; ctx.fillRect(x, 46 - h, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let yy = 50 - h; yy < 44; yy += 7) ctx.fillRect(x + 3, yy, w - 6, 2);
  }
  ctx.fillStyle = '#6f8f9e'; ctx.fillRect(0, 44, W, 6);
  ctx.strokeStyle = '#5c6a74'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(60, 52); ctx.quadraticCurveTo(330, -30, 600, 52); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, 52); ctx.quadraticCurveTo(330, 4, 600, 52); ctx.stroke();
  rrect(ctx, 46, 20, 24, 34, 2, '#cdb48a'); rrect(ctx, 590, 20, 24, 34, 2, '#cdb48a');
  ctx.fillStyle = '#f6f3ea';
  for (const [x, s] of [[2210, 1], [2240, 0.8], [2270, 0.65]]) { ctx.beginPath(); ctx.moveTo(x, 50); ctx.quadraticCurveTo(x + 4, 50 - 30 * s, x + 26 * s, 50 - 34 * s); ctx.quadraticCurveTo(x + 16 * s, 34, x + 24 * s, 50); ctx.fill(); }
  // land: grass hill
  ctx.save(); smoothPath(ctx, LAND, true); ctx.fillStyle = PAL.grass; ctx.fill(); ctx.clip();
  speckle(ctx, 0, 240, W, H - 240, 16000, [PAL.grassD, PAL.grassL, '#93bb72'], r, [1, 2.4]);
  // sandy shore band
  ctx.strokeStyle = '#e8d7ae'; ctx.lineWidth = 34; smoothPath(ctx, LAND.slice(0, 7)); ctx.stroke();
  // entrance plaza pavers
  ctx.fillStyle = '#e6d4b2'; ctx.beginPath(); ctx.ellipse(400, 470, 250, 150, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(160,125,80,.22)'; ctx.lineWidth = 1.4;
  for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.ellipse(400, 470, k * 36, k * 21, 0, 0, 7); ctx.stroke(); }
  // paths
  for (const p of PATHS) { smoothPath(ctx, p); ctx.strokeStyle = '#d4bd94'; ctx.lineWidth = 92; ctx.stroke(); }
  for (const p of PATHS) { smoothPath(ctx, p); ctx.strokeStyle = '#ead8b4'; ctx.lineWidth = 80; ctx.stroke(); }
  for (const p of PATHS) { smoothPath(ctx, p); ctx.strokeStyle = 'rgba(255,248,230,.45)'; ctx.lineWidth = 24; ctx.stroke(); }
  // paw prints along the main path
  ctx.fillStyle = 'rgba(160,120,80,.35)';
  for (const p of PATH_PTS.slice(0, 2)) for (let i = 4; i < p.length; i += 9) { const [x, y] = p[i]; ellipse(ctx, x, y, 6, 5, 'rgba(160,120,80,.3)'); for (let k = 0; k < 3; k++) ellipse(ctx, x - 6 + k * 6, y - 8, 2.4, 2.4, 'rgba(160,120,80,.3)'); }

  // --- enclosures
  const K = PENS.koala.rect; bushFloor(ctx, [[K[0], K[1]], [K[0] + K[2], K[1]], [K[0] + K[2], K[1] + K[3]], [K[0], K[1] + K[3]]], r);
  const Gi = PENS.giraffe.rect; ctx.fillStyle = '#d9c47e'; ctx.fillRect(...Gi);
  speckle(ctx, Gi[0], Gi[1], Gi[2], Gi[3], 2600, ['#c8b06a', '#e6d394', '#b9a35c'], r, [1, 2.6]);
  rrect(ctx, Gi[0] + Gi[2] - 160, Gi[1] + 30, 110, 60, 6, '#a07a4e'); ctx.fillStyle = '#7fae5a'; ctx.fillRect(Gi[0] + Gi[2] - 150, Gi[1] + 38, 90, 14);
  const M = PENS.meerkat.rect; ctx.fillStyle = PAL.sand; ctx.fillRect(...M);
  speckle(ctx, M[0], M[1], M[2], M[3], 2400, [PAL.sandD, '#f6e8c4', '#d9c08e'], r, [0.8, 2]);
  for (let i = 0; i < 9; i++) { const x = M[0] + 40 + r() * (M[2] - 80), y = M[1] + 40 + r() * (M[3] - 80); ellipse(ctx, x, y + 3, 16, 8, '#c9a870'); ellipse(ctx, x, y, 9, 5, '#5b4530'); }
  const P = PENS.penguin.rect; ctx.fillStyle = '#cfc6b4'; ctx.fillRect(...P);
  speckle(ctx, P[0], P[1], P[2], P[3], 1600, ['#bdb3a0', '#e0d9ca'], r, [1, 3]);
  ctx.save(); blob(ctx, P[0] + P[2] * 0.55, P[1] + P[3] * 0.5, P[2] * 0.38, P[3] * 0.36, r, 10, 0.12); ctx.fillStyle = '#4f9fc0'; ctx.fill(); ctx.clip();
  const pg = ctx.createRadialGradient(P[0] + P[2] * 0.55, P[1] + P[3] * 0.5, 10, P[0] + P[2] * 0.55, P[1] + P[3] * 0.5, P[2] * 0.4);
  pg.addColorStop(0, '#2f7ea3'); pg.addColorStop(1, '#6cc0d8'); ctx.fillStyle = pg; ctx.fillRect(...P);
  speckle(ctx, P[0], P[1], P[2], P[3], 400, ['rgba(255,255,255,.35)'], r, [1.5, 3.5]);
  ctx.restore();
  const R = PENS.roo.rect; ctx.fillStyle = '#c4c07c'; ctx.fillRect(...R);
  speckle(ctx, R[0], R[1], R[2], R[3], 3000, ['#b2ae68', '#d6d290', '#a9a35a'], r, [1, 2.6]);
  for (const pen of Object.values(PENS)) wall(ctx, pen.rect);

  // picnic lawn: mown stripes, flower beds, picnic rugs
  ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < W; x += 120) ctx.fillRect(x, 1340, 60, 660);
  flowers(ctx, 120, 1380, 500, 200, 90, r); flowers(ctx, 2300, 1400, 400, 160, 70, r); flowers(ctx, 1200, 1820, 600, 140, 80, r);
  ctx.restore();
  // wharf
  const [wx, wy, ww, wh] = WHARF;
  ctx.fillStyle = '#5b3f2a'; for (let yy = wy + 10; yy < wy + wh; yy += 40) { ctx.fillRect(wx - 4, yy, 6, 14); ctx.fillRect(wx + ww - 2, yy, 6, 14); }
  rrect(ctx, wx, wy, ww, wh, 3, '#a8845c');
  ctx.strokeStyle = 'rgba(80,50,30,.35)'; ctx.lineWidth = 1.5; for (let yy = wy + 6; yy < wy + wh; yy += 9) { ctx.beginPath(); ctx.moveTo(wx, yy); ctx.lineTo(wx + ww, yy); ctx.stroke(); }
  ctx.save(); smoothPath(ctx, LAND.slice(0, 7)); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
}

export function buildProps() {
  const r = rng(44);
  const P = [];
  const add = (kind, x, y, ...args) => P.push({ kind, args, x, y });
  add('ferry', 355, 96);
  add('zooGate', ZSPOTS.gate[0], ZSPOTS.gate[1]);
  add('signPost', 520, 300, 'FERRY → CITY', '#1f6b47', 110);
  for (const [id, pen] of Object.entries(PENS)) {
    const [x, y, w, h] = pen.rect;
    // fence along the front, with a sign by the gate
    add('fence', x, y + h + 10, w, '#5b4a35');
    add('signPost', pen.gate[0] + 70, pen.gate[1] - 6, pen.sign, '#2f6b47', 96);
  }
  // koala gums (inside their walk) and a few around the zoo
  for (const [x, y] of [[900, 470], [1010, 420], [1130, 500], [1230, 440]]) add('gum', x, y, (x / 10) % 3 | 0, 0.85);
  for (const [x, y] of [[640, 1660], [180, 1500], [2700, 1560], [2380, 1610], [1700, 1900], [140, 1880]]) add('gum', x, y, (x / 7) % 3 | 0, 1);
  for (const [x, y] of [[1780, 560], [2330, 380]]) add('roundTree', x, y, 2, 1.1);
  // meerkat rocks, penguin rocks, roo shade tree
  for (const [x, y] of [[440, 900], [780, 1080], [600, 960]]) add('rock', x, y, 1, 1.1);
  for (const [x, y] of [[1220, 900], [1660, 1100], [1250, 1090]]) add('rock', x, y, 3, 1.2);
  add('fig', 2620, 960, 0.9);
  // the plaza and lawn
  add('fountain', ZSPOTS.fountain[0], ZSPOTS.fountain[1]);
  add('shop', ZSPOTS.cafe[0], ZSPOTS.cafe[1], 'kiosk', { name: 'TARONGA CAFE', sub: 'pies · ice cream' });
  add('shop', ZSPOTS.gift[0], ZSPOTS.gift[1], 'surf', { name: 'ZOO GIFTS', sub: 'plush · hats' });
  add('bins', ZSPOTS.bins[0], ZSPOTS.bins[1]);
  add('busStop', ZSPOTS.bus[0], ZSPOTS.bus[1] - 6, 'TO FORESTVILLE');
  for (const x of [200, 700, 1300, 1900, 2500]) add('lamp', x, 740);
  for (const x of [400, 1200, 2000]) add('lamp', x, 1330);
  for (const [x, y] of [[760, 730], [1600, 735], [2300, 745], [300, 1320], [1700, 1330]]) add('bench', x, y);
  for (const [x, y] of [[420, 1700], [1250, 1720], [2000, 1760]]) add('picnicRug', x, y);
  for (const [x, y] of [[120, 1380], [2700, 1400], [520, 1900], [1500, 1940], [2200, 1940]]) add('shrub', x, y, (x / 10) % 3 | 0, 1);
  add('railing', 1500, 268, 560);
  return P;
}

export function colliders() {
  const shapes = [{ water: true, fn: (x, y) => !onLand(x, y) }];
  // enclosure interiors (walls + animals): you can look, not climb in
  for (const pen of Object.values(PENS)) { const [x, y, w, h] = pen.rect; shapes.push({ rect: [x - 10, y - 10, w + 20, h + 24] }); }
  // gate pillars
  shapes.push({ ellipse: [ZSPOTS.gate[0] - 130, ZSPOTS.gate[1] - 4, 26, 10] }, { ellipse: [ZSPOTS.gate[0] + 130, ZSPOTS.gate[1] - 4, 26, 10] });
  return shapes;
}

export function surfaceAt(x, y) {
  if (onWharf(x, y)) return 'wood';
  if (!inPoly(x, y, LAND)) return 'water';
  if (onPath(x, y) || Math.hypot((x - 400) / 250, (y - 470) / 150) < 1) return 'hard';
  return 'grass';
}

export function fishWater() { return null; }

export const zoo = {
  id: 'zoo', w: W, h: H, bg: '#3a8fb3', edgeTop: '#2f7fa6', edgeBottom: '#86b06a',
  subtitle: 'Taronga Zoo · across the harbour',
  spawn: ZSPOTS.ferry,
  arriveAt: [ZSPOTS.bus[0] - 40, ZSPOTS.bus[1] - 70],
  arrivals: { ferry: [ZSPOTS.ferry[0], ZSPOTS.ferry[1] + 40], bus: [ZSPOTS.bus[0] - 40, ZSPOTS.bus[1] - 70] },
  family: { dan: [470, 560], finn: [300, 600], jessia: [640, 640], jarency: [420, 640] },
  npcs: [{ id: 'tui', x: ZSPOTS.tui[0], y: ZSPOTS.tui[1], wander: 30 }],
  pens: PENS,
  areas: AREAS, paintGround, buildProps, colliders, surfaceAt, fishWater,
  roads: [],
};
