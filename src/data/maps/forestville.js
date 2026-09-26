// Forestville: layout, ground painting, props, colliders, areas.
// Fictionalised Northern Beaches suburb: bush on one side, shops and school on the other.

import {
  PAL, fillAll, grassPatch, bushFloor, trackPath, creek, road, footpath, zebra, pavers, pond,
  flowers, gardenBed, lawnStripes, rng, ellipse, rrect, blob, speckle, smoothPath,
} from '../../art/ground.js';
import { samplePath, distToPolyline } from '../../utils/canvas.js';

const W = 3200, H = 2400;

// ---- key geometry ----
export const G = {
  road: { x: 0, y: 1270, w: W, h: 100 },
  footN: { x: 0, y: 1236, w: W, h: 34 },
  footS: { x: 0, y: 1370, w: W, h: 34 },
  currie: { x: 1520, y: 1404, w: 80, h: H - 1404 },
  starkey: { x: 0, y: 2200, w: 1520, h: 80 },
  plaza: { x: 1650, y: 900, w: 1240, h: 336 },
  darley: { x: 1640, y: 640, w: W - 1640, h: 80 },
  crossing: { x: 2090, y: 1270, w: 60, h: 100 },
  pond: { x: 1180, y: 620, rx: 250, ry: 160 },
  jetty: { x: 1144, y: 640, w: 72, h: 150 },
  playground: { x: 1690, y: 1490, w: 360, h: 300 },
  sandpit: { x: 1760, y: 1700, w: 130, h: 70 },
  oval: { x: 2660, y: 2120, rx: 440, ry: 210 },
  schoolYard: { x: 2160, y: 1770, w: 760, h: 90 },
  home: { x: 180, y: 1404, w: 820, h: 796 },
  driveway: { x: 760, y: 1830, w: 120, h: 370 },
};

export const TRACK = [[640, 1236], [610, 1120], [500, 1030], [540, 900], [400, 780], [260, 720], [320, 580], [190, 450], [250, 330], [170, 220], [190, 150]];
export const CREEK = [[230, 70], [300, 150], [440, 220], [560, 300], [700, 360], [820, 440], [940, 540]];
const TRACK_PTS = samplePath(TRACK, 14);
const CREEK_PTS = samplePath(CREEK, 14);
const BUSH_POLY = [[0, 0], [1660, 0], [1620, 230], [1330, 290], [930, 260], [770, 360], [740, 700], [790, 1000], [720, 1232], [0, 1236]];

// Quest-relevant spots (also kept clear of random scenery)
export const SPOTS = {
  start: [640, 1770],
  duckNest: [1405, 500],
  kookaTree: [600, 1068],
  ibis: [2215, 1195],
  sandpit: [1825, 1735],
  grassTree: [420, 905],
  ledge: [170, 150],
  bev: [1150, 2110],
  mo: [1800, 1000],
  aroha: [2000, 1735],
  busStop: [2990, 1232],
  signTrack: [700, 1226],
};

// ---- areas: first match wins ----
export const AREAS = [
  { id: 'bus', name: 'B-LINE STOP', rect: [2880, 1100, 320, 300], amb: 'village' },
  { id: 'village', name: 'FORESTVILLE VILLAGE', rect: [1640, 720, 1560, 516], amb: 'village' },
  { id: 'road', name: 'WARRINGAH ROAD', rect: [0, 1236, W, 168], amb: 'village', quiet: true },
  { id: 'school', name: 'FORESTVILLE PRIMARY', rect: [1650, 1404, 1550, 996], amb: 'suburb' },
  { id: 'home', name: 'HOME', rect: [180, 1404, 820, 796], amb: 'suburb' },
  { id: 'starkey', name: 'STARKEY STREET', rect: [0, 1404, 1650, 996], amb: 'suburb' },
  { id: 'pond', name: 'THE DUCK POND', rect: [780, 250, 860, 986], amb: 'bush' },
  { id: 'darley', name: 'DARLEY STREET', rect: [1640, 0, 1560, 720], amb: 'suburb' },
  { id: 'bush', name: 'GARIGAL TRACK', rect: [0, 0, 1660, 1236], amb: 'bush' },
];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// ---- ground painter ----
export function paintGround(ctx) {
  const r = rng(2024);
  fillAll(ctx, W, H, PAL.grass, r);

  // bush floor + track + creek
  bushFloor(ctx, BUSH_POLY, r);
  creek(ctx, CREEK, 22);
  // waterfall pool at the head of the creek, below the sandstone ledge
  ellipse(ctx, 215, 95, 70, 40, '#b89a6a');
  ellipse(ctx, 215, 92, 58, 32, PAL.waterD);
  ellipse(ctx, 205, 86, 40, 20, PAL.water);
  // sandstone shelf behind the pool
  ctx.fillStyle = '#d6a468'; ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(360, 0); ctx.lineTo(330, 58); ctx.quadraticCurveTo(220, 76, 110, 56); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(140,85,40,.4)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 4, 12 + i * 11); ctx.quadraticCurveTo(220, 20 + i * 13, 340 - i * 4, 10 + i * 11); ctx.stroke(); }
  trackPath(ctx, TRACK, 34, r);
  // stepping stones where the track meets the creek
  for (const [x, y] of [[262, 322], [242, 300], [284, 344]]) ellipse(ctx, x, y, 12, 8, '#cfc3ad');

  // pond park: lawn, loop path, pond
  ctx.save(); ctx.beginPath(); ctx.ellipse(G.pond.x, G.pond.y + 20, 360, 270, 0, 0, Math.PI * 2); ctx.fillStyle = '#a4c985'; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.ellipse(G.pond.x, G.pond.y + 10, 320, 225, 0, 0, Math.PI * 2);
  ctx.strokeStyle = PAL.pathD; ctx.lineWidth = 36; ctx.stroke(); ctx.strokeStyle = PAL.path; ctx.lineWidth = 28; ctx.stroke();
  ctx.fillStyle = PAL.pathD; ctx.fillRect(G.pond.x - 18, 850, 36, 386); ctx.fillStyle = PAL.path; ctx.fillRect(G.pond.x - 14, 850, 28, 386);
  pond(ctx, G.pond.x, G.pond.y, G.pond.rx, G.pond.ry, r);
  flowers(ctx, 850, 820, 180, 120, 60, r);
  flowers(ctx, 1380, 780, 200, 120, 50, r, ['#f2c230', '#f29c38', '#fff']);

  // Darley St houses + laneway behind shops
  footpath(ctx, G.darley.x, G.darley.y - 30, G.darley.w, 30);
  road(ctx, G.darley.x, G.darley.y, G.darley.w, G.darley.h, false, r);
  footpath(ctx, G.darley.x, G.darley.y + G.darley.h, G.darley.w, 30);
  for (let x = 1700; x < W; x += 330) { lawnStripes(ctx, x, 380, 280, 220); gardenBed(ctx, x + 20, 580, 90, 20, r); flowers(ctx, x + 24, 582, 84, 14, 14, r); }
  ctx.fillStyle = '#cfc6b5'; ctx.fillRect(1640, 750, W - 1640, 150);
  speckle(ctx, 1640, 750, W - 1640, 150, 900, ['#bfb6a4', '#d9d1c1'], r, [1, 2]);

  // village plaza
  pavers(ctx, G.plaza.x, G.plaza.y, G.plaza.w, G.plaza.h);
  for (const x of [1690, 2160, 2640]) { gardenBed(ctx, x - 40, 1150, 80, 40, r); flowers(ctx, x - 36, 1154, 72, 32, 16, r); }

  // roads and footpaths
  footpath(ctx, G.footN.x, G.footN.y, G.footN.w, G.footN.h);
  footpath(ctx, G.footS.x, G.footS.y, G.footS.w, G.footS.h);
  road(ctx, G.road.x, G.road.y, G.road.w, G.road.h, false, r);
  // parking bays in front of the shops
  ctx.strokeStyle = 'rgba(250,245,230,.7)'; ctx.lineWidth = 2;
  for (let x = 1680; x < 2860; x += 150) if (x < 2040 || x > 2200) { ctx.beginPath(); ctx.moveTo(x, 1272); ctx.lineTo(x, 1300); ctx.stroke(); }
  zebra(ctx, G.crossing.x, G.crossing.y, G.crossing.w, G.crossing.h, true);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(G.crossing.x - 18, 1240, 8, 26); ctx.fillRect(G.crossing.x + G.crossing.w + 10, 1374, 8, 26);
  footpath(ctx, G.currie.x - 32, G.currie.y, 32, G.currie.h);
  footpath(ctx, G.currie.x + G.currie.w, G.currie.y, 32, G.currie.h);
  road(ctx, G.currie.x, G.currie.y, G.currie.w, G.currie.h, true, r);
  footpath(ctx, 0, G.starkey.y - 34, G.starkey.x - 32, 34);
  footpath(ctx, 0, G.starkey.y + G.starkey.h, G.starkey.x - 32, 30);
  road(ctx, G.starkey.x, G.starkey.y, G.starkey.w, G.starkey.h, false, r);
  ctx.fillStyle = PAL.road; ctx.fillRect(1488, 2200, 32, 80);

  // home: backyard, front lawn, driveway, garden beds
  lawnStripes(ctx, 190, 1420, 800, 390);
  lawnStripes(ctx, 190, 1990, 800, 176);
  ctx.fillStyle = '#d8cfbd'; ctx.fillRect(G.driveway.x, G.driveway.y, G.driveway.w, G.driveway.h);
  ctx.strokeStyle = 'rgba(150,140,120,.3)'; for (let y = G.driveway.y; y < 2200; y += 40) { ctx.beginPath(); ctx.moveTo(G.driveway.x, y); ctx.lineTo(G.driveway.x + G.driveway.w, y); ctx.stroke(); }
  ctx.fillStyle = PAL.pathL; ctx.fillRect(583, 1990, 34, 176);
  for (let y = 1998; y < 2160; y += 24) rrect(ctx, 586, y, 28, 18, 3, '#e8d1a3');
  gardenBed(ctx, 400, 1996, 150, 26, r); flowers(ctx, 404, 1998, 142, 20, 30, r);
  gardenBed(ctx, 640, 1996, 100, 26, r); flowers(ctx, 644, 1998, 92, 20, 20, r);
  gardenBed(ctx, 200, 1700, 120, 80, r);
  for (let i = 0; i < 12; i++) ellipse(ctx, 214 + (i % 4) * 28, 1716 + ((i / 4) | 0) * 24, 8, 6, i % 3 ? '#5f9a4a' : '#e0453b'); // veg patch
  ctx.fillStyle = '#cdb99a'; ctx.fillRect(560, 1810, 260, 12); // back patio edge
  pavers(ctx, 520, 1640, 260, 170, '#dcc6a0');
  // Bev's place
  lawnStripes(ctx, 1010, 1420, 470, 746);
  gardenBed(ctx, 1060, 2030, 260, 40, r); flowers(ctx, 1064, 2034, 252, 32, 60, r, ['#d8413a', '#e0546c', '#f4c6d4']);
  ctx.fillStyle = PAL.pathL; ctx.fillRect(1180, 1990, 30, 176);

  // school grounds
  ctx.fillStyle = '#b9d49a'; ctx.fillRect(1660, 1440, 1520, 950);
  speckle(ctx, 1660, 1440, 1520, 950, 5000, [PAL.grassD, PAL.grassL], r, [1, 2.2]);
  ctx.fillStyle = '#9ea2a6'; ctx.fillRect(G.schoolYard.x, G.schoolYard.y, G.schoolYard.w, G.schoolYard.h);
  ctx.fillStyle = '#f2c230';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(2260 + i * 110, 1815, 18, 0, 7); ctx.fill(); ctx.fillStyle = i % 2 ? '#f2c230' : '#e0453b'; } // painted hopscotch spots
  ctx.fillStyle = '#9ea2a6'; ctx.fillRect(2090, 1404, 60, 380); // entry path from gate
  rrect(ctx, G.playground.x, G.playground.y, G.playground.w, G.playground.h, 30, PAL.softfall);
  speckle(ctx, G.playground.x, G.playground.y, G.playground.w, G.playground.h, 1500, ['#b8663f', '#d88660'], r, [1, 2]);
  rrect(ctx, G.sandpit.x - 6, G.sandpit.y - 6, G.sandpit.w + 12, G.sandpit.h + 12, 10, '#9a6b42');
  rrect(ctx, G.sandpit.x, G.sandpit.y, G.sandpit.w, G.sandpit.h, 8, PAL.sand);
  speckle(ctx, G.sandpit.x, G.sandpit.y, G.sandpit.w, G.sandpit.h, 200, [PAL.sandD, '#f5e6bf'], r, [1, 2]);
  // oval
  ctx.beginPath(); ctx.ellipse(G.oval.x, G.oval.y, G.oval.rx, G.oval.ry, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.oval; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let x = G.oval.x - G.oval.rx; x < G.oval.x + G.oval.rx; x += 60) ctx.fillRect(x, 1900, 30, 460); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(G.oval.x, G.oval.y, G.oval.rx - 30, G.oval.ry - 24, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(G.oval.x, G.oval.y - G.oval.ry + 24); ctx.lineTo(G.oval.x, G.oval.y + G.oval.ry - 24); ctx.stroke();
  ctx.fillStyle = '#e6d6b0'; ctx.fillRect(G.oval.x - 10, G.oval.y - 40, 20, 80); // cricket pitch

  // far south: verge + hedges
  ctx.fillStyle = '#93bb74'; ctx.fillRect(0, 2310, 1488, 90);
}

// ---- props ----
// kind: painter name in art/props.js, args, x, y. The scene turns these into sprites.
export function buildProps() {
  const r = rng(77);
  const P = [];
  const add = (kind, x, y, ...args) => P.push({ kind, args, x, y });
  const keepClear = Object.values(SPOTS);
  const clearOf = (x, y, d = 90) => keepClear.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > d);

  // --- bush: gums, rocks, ferns, grass trees, shrubs
  const bushOk = (x, y, margin) => inPoly(x, y, BUSH_POLY) && distToPolyline(x, y, TRACK_PTS) > margin && distToPolyline(x, y, CREEK_PTS) > margin - 10 && clearOf(x, y) && !(x < 380 && y < 140) && Math.hypot(x - G.pond.x, (y - G.pond.y) * 1.4) > 420;
  let tries = 0, placed = 0;
  while (placed < 95 && tries++ < 4000) {
    const x = 20 + r() * 1620, y = 60 + r() * 1180;
    if (!bushOk(x, y, 70)) continue;
    if (P.some(p => p.kind === 'gum' && Math.hypot(p.x - x, p.y - y) < 85)) continue;
    add('gum', x, y, (r() * 3) | 0, 0.85 + r() * 0.35); placed++;
  }
  const scatter = (kind, n, margin, argsFn, spacing = 40) => {
    let t = 0, c = 0;
    while (c < n && t++ < 3000) {
      const x = 20 + r() * 1620, y = 60 + r() * 1180;
      if (!bushOk(x, y, margin)) continue;
      if (P.some(p => Math.hypot(p.x - x, p.y - y) < spacing)) continue;
      add(kind, x, y, ...argsFn()); c++;
    }
  };
  scatter('rock', 22, 40, () => [(r() * 4) | 0, 0.7 + r() * 0.6], 60);
  scatter('fern', 45, 24, () => [0.8 + r() * 0.5], 30);
  scatter('shrub', 40, 30, () => [[1, 2, 0, 4][(r() * 4) | 0], 0.8 + r() * 0.5], 34);
  scatter('grassTree', 10, 40, () => [0.9 + r() * 0.3], 70);
  // feature pieces on the track
  add('grassTree', SPOTS.grassTree[0] - 20, SPOTS.grassTree[1] - 8, 1.25);
  add('rock', 330, 70, 2, 1.4); add('rock', 90, 180, 1, 1.1);
  add('gum', SPOTS.kookaTree[0] - 10, SPOTS.kookaTree[1] - 6, 1, 1.25);
  add('signPost', SPOTS.signTrack[0], SPOTS.signTrack[1], 'GARIGAL TRACK', '#5b3a24', 130);

  // --- pond park
  for (const [x, y, v] of [[860, 380, 0], [1520, 360, 2], [1560, 760, 1], [830, 820, 2], [1500, 1010, 0], [900, 1080, 1], [1600, 1150, 2]]) add('gum', x, y, v, 1);
  add('roundTree', 1010, 960, 1, 1); add('roundTree', 1360, 1100, 0, 1);
  add('bench', 1320, 840); add('bench', 1040, 850);
  add('jetty', G.pond.x, 792);
  add('shrub', 980, 330, 1, 1); add('shrub', 1260, 330, 2, 1.1); add('shrub', 1450, 610, 1, 1);

  // --- Darley St houses
  const roofs = ['#c2643d', '#8f4b3a', '#b85a3a', '#6e7f8a', '#c2643d'];
  const walls = ['#efe3cc', '#e3d3bb', '#f3eee4', '#e9dcc3', '#d9e0d6'];
  let hi = 0;
  for (let x = 1840; x < W; x += 330, hi++) add('house', x, 600, { w: 260, depth: 120, wall: walls[hi % 5], roof: roofs[hi % 5], v: hi, brick: hi % 2 === 1 });
  for (let x = 1700; x < W; x += 330) { add('roundTree', x - 20, 300, hi++ % 3, 0.9); add('mailbox', x + 90, 626); }
  for (const x of [1760, 2200, 2700, 3100]) add('gum', x, 830, (x / 7) % 3 | 0, 0.9);
  add('bins', 2400, 870); add('crate', 1950, 880); add('crate', 1990, 884);

  // --- village shops + furniture
  add('shop', 1790, 960, 'cafe'); add('shop', 2030, 960, 'bakery'); add('shop', 2320, 960, 'grocer');
  add('shop', 2590, 960, 'news'); add('shop', 2790, 960, 'chemist');
  add('outdoorTable', 1700, 1080); add('outdoorTable', 1880, 1100);
  add('bench', 2010, 1170); add('bench', 2480, 1170); add('bench', 2760, 1150);
  add('bins', SPOTS.ibis[0] - 70, 1180);
  for (const x of [1680, 2200, 2680, 2860]) add('lamp', x, 1232);
  for (const x of [1690, 2160, 2640]) add('roundTree', x, 1150, 0, 0.75);
  add('signPost', 2990 + 60, 1110, 'FORESTVILLE VILLAGE', '#2f5f8f', 150);
  add('busStop', SPOTS.busStop[0], SPOTS.busStop[1] - 6, 'TO MANLY');
  // parked cars
  const cc = ['#d8453b', '#2f6fa3', '#f2f0e8', '#3f7a54', '#e9a33c', '#6f54a8'];
  [1760, 1910, 2270, 2420, 2570, 2720].forEach((x, i) => add('car', x, 1304, cc[i % cc.length], i % 2 ? 1 : -1));

  // --- south side of Warringah Rd
  add('signPost', 2040, 1418, 'SCHOOL ZONE', '#c93a2f', 110);
  add('lamp', 900, 1400); add('lamp', 1700, 1400); add('lamp', 2600, 1400);

  // --- home
  add('house', 560, 1990, { w: 320, depth: 150, wall: '#f1e6cf', roof: '#c2643d', door: '#2f6b5a', v: 0 });
  add('house', 1200, 1990, { w: 290, depth: 140, wall: '#e6d6bd', roof: '#8f4b3a', door: '#7a3b2e', v: 1, brick: true });
  add('mailbox', 690, 2156);
  add('mailbox', 1250, 2156);
  add('car', 820, 2090, '#2f6fa3', 1);
  add('roundTree', 300, 2090, 3, 1.05); // jacaranda
  add('hillsHoist', 330, 1610);
  add('outdoorTable', 620, 1740);
  add('guitarCase', 720, 1770);
  add('roundTree', 230, 1500, 2, 0.9);
  add('shrub', 380, 1450, 1, 1); add('shrub', 880, 1460, 2, 1); add('shrub', 950, 1720, 3, 1);
  // back fence along the footpath with a gate gap
  add('fence', 180, 1418, 340, '#7a8a80'); add('fence', 600, 1418, 400, '#7a8a80');
  // hedges between lots
  for (let y = 1480; y < 2140; y += 70) add('shrub', 1000, y, 0, 1.05);
  add('shrub', 1070, 2140, 1, 0.9); add('shrub', 1330, 2140, 1, 0.9);
  add('roundTree', 1400, 1560, 0, 1);
  // south of Starkey St
  for (let x = 40; x < 1480; x += 110) add('shrub', x, 2380, (x / 110) % 5 | 0, 1.1);
  for (const x of [200, 700, 1200]) add('gum', x, 2395, 1, 0.9);

  // --- school
  add('school', 2560, 1760);
  add('fence', 1650, 1432, 440, '#3f7a54'); add('fence', 2150, 1432, 1030, '#3f7a54');
  add('slide', 1770, 1620); add('swings', 1930, 1580);
  add('bench', 2080, 1860);
  for (const [x, y] of [[1700, 1900], [2200, 1990], [3120, 1900], [3130, 2340], [2180, 2360], [1720, 2250], [1900, 2100]]) add('gum', x, y, (x + y) % 3, 1);
  add('roundTree', 2000, 1960, 1, 1);
  add('signPost', 2240, 1960, 'OVAL', '#1f5f46', 60);

  return P;
}

// ---- collision shapes (besides prop colliders) ----
export function colliders() {
  return [
    { ellipse: [G.pond.x, G.pond.y, G.pond.rx - 8, G.pond.ry - 8], except: G.jetty },
    { ellipse: [215, 92, 50, 26] },       // waterfall pool
    { rect: [90, 0, 270, 50] },            // sandstone shelf
    { rect: [1640, 1432, 12, 968] }, { rect: [3180, 1432, 20, 968] }, // school side fences
    { rect: [180, 1404, 6, 796] },         // home west boundary
  ];
}

// ---- footstep surface ----
export function surfaceAt(x, y) {
  if (inRect(x, y, G.jetty)) return 'wood';
  if (distToPolyline(x, y, CREEK_PTS) < 11) return 'water';
  if (inRect(x, y, G.sandpit)) return 'sand';
  if (inRect(x, y, G.playground)) return 'soft';
  if (inPoly(x, y, BUSH_POLY)) return distToPolyline(x, y, TRACK_PTS) < 18 ? 'gravel' : 'leaves';
  if (y > 1236 && y < 1404) return 'hard';
  if (inRect(x, y, G.plaza) || inRect(x, y, G.currie) || inRect(x, y, G.starkey) || inRect(x, y, G.driveway) || inRect(x, y, G.darley)) return 'hard';
  const pd = Math.hypot((x - G.pond.x) / 320, (y - G.pond.y - 10) / 225);
  if (Math.abs(pd - 1) < 0.07) return 'gravel';
  return 'grass';
}

export const forestville = {
  id: 'forestville', w: W, h: H, bg: '#9cc27c', edgeTop: '#6f9056', edgeBottom: '#93bb74',
  spawn: SPOTS.start,
  arriveAt: [2960, 1262],   // stepping off the bus
  family: { dan: [640, 1780], finn: [700, 1795], jarency: [1880, 1150], jessia: [1300, 880] },
  npcs: [
    { id: 'bev', x: SPOTS.bev[0], y: SPOTS.bev[1], wander: 50 },
    { id: 'mo', x: SPOTS.mo[0], y: SPOTS.mo[1], wander: 40 },
    { id: 'aroha', x: SPOTS.aroha[0], y: SPOTS.aroha[1], wander: 60 },
  ],
  areas: AREAS, paintGround, buildProps, colliders, surfaceAt,
  roads: [{ y1: 1318, y2: 1352, x0: -140, x1: W + 140, crossing: G.crossing }],
  water: [{ type: 'ellipse', x: G.pond.x, y: G.pond.y, rx: G.pond.rx, ry: G.pond.ry }],
  creek: CREEK_PTS,
  bushPoly: BUSH_POLY,
};
