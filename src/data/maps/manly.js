// Manly & Shelly Beach: promenade, Norfolk pines, surf, rock pools and the headland lookout.

import { PAL, fillAll, bushFloor, trackPath, pavers, flowers, rng, ellipse, rrect, blob, speckle, smoothPath } from '../../art/ground.js';
import { samplePath, distToPolyline } from '../../utils/canvas.js';

const W = 2800, H = 1800;

export const LAND = [[0, 0], [W, 0], [W, 640], [2600, 760], [2560, 900], [2400, 940], [2150, 910], [2120, 1100], [1770, 1100], [1730, 1062], [1200, 1072], [600, 1056], [0, 1066]];
const HEADLAND = [[2250, 0], [W, 0], [W, 640], [2600, 700], [2440, 640], [2320, 560], [2260, 380]];
const TRACK = [[2300, 760], [2380, 660], [2360, 560], [2460, 470], [2420, 370], [2520, 300], [2560, 220], [2610, 190]];
const TRACK_PTS = samplePath(TRACK, 14);
const MARINE = [[1760, 520], [1900, 560], [2020, 610], [2120, 680], [2220, 730], [2300, 760]];
const MARINE_PTS = samplePath(MARINE, 14);

export const MSPOTS = {
  busStop: [150, 452],
  kez: [760, 780],
  rockDuck: [1955, 985],
  lookout: [2610, 176],
  tripod: [2660, 150],
  kiosk: [360, 330],
};

const inRect = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const ROCKS = [1760, 870, 360, 230];
const SHELLY = [2140, 700, 440, 230];

export const AREAS = [
  { id: 'lookout', name: 'SHELLY HEADLAND LOOKOUT', poly: HEADLAND, amb: 'bush' },
  { id: 'rocks', name: 'ROCK POOLS', rect: ROCKS, amb: 'beach' },
  { id: 'shelly', name: 'SHELLY BEACH', rect: [2100, 560, 700, 400], amb: 'beach' },
  { id: 'corso', name: 'THE CORSO', rect: [0, 0, 1700, 470], amb: 'village' },
  { id: 'manly', name: 'MANLY BEACH', rect: [0, 470, 2100, 1330], amb: 'beach' },
];

export function paintGround(ctx) {
  const r = rng(515);
  // ocean everywhere first
  const sea = ctx.createLinearGradient(0, 900, 0, H);
  sea.addColorStop(0, '#5bb9c7'); sea.addColorStop(0.5, '#3a9bb3'); sea.addColorStop(1, '#2a7f9e');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
  speckle(ctx, 0, 0, W, H, 3000, ['rgba(255,255,255,.18)', 'rgba(20,80,110,.18)'], r, [1.5, 4]);
  // land
  ctx.save(); smoothPath(ctx, LAND, true); ctx.fillStyle = PAL.sand; ctx.fill(); ctx.clip();
  speckle(ctx, 0, 0, W, H, 9000, [PAL.sandD, '#f6e8c4', '#d9c08e'], r, [0.8, 2]);
  ctx.restore();
  // wet sand + surf foam along the shoreline
  ctx.save(); smoothPath(ctx, LAND, true); ctx.strokeStyle = 'rgba(190,160,110,.55)'; ctx.lineWidth = 50; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 8; ctx.stroke(); ctx.restore();
  // grass verge, promenade, corso pavers
  ctx.fillStyle = '#a6cf82'; ctx.fillRect(0, 420, 1760, 60);
  speckle(ctx, 0, 420, 1760, 60, 600, [PAL.grassD, PAL.grassL], r, [1, 2]);
  pavers(ctx, 0, 0, 1700, 420, '#e9dcc0');
  ctx.fillStyle = '#d9d2c3'; ctx.fillRect(0, 480, 1800, 80);
  ctx.strokeStyle = 'rgba(150,140,120,.25)'; for (let x = 0; x < 1800; x += 30) { ctx.beginPath(); ctx.moveTo(x, 480); ctx.lineTo(x, 560); ctx.stroke(); }
  ctx.fillStyle = '#c9bfae'; ctx.fillRect(0, 556, 1760, 10); // sea wall
  for (let x = 200; x < 1700; x += 420) { ctx.fillStyle = '#d6cdbb'; ctx.fillRect(x, 560, 60, 30); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 3; k++) ctx.fillRect(x, 566 + k * 8, 60, 2); }
  // Marine Parade path to Shelly
  smoothPath(ctx, MARINE); ctx.strokeStyle = '#c9bfae'; ctx.lineWidth = 46; ctx.stroke(); ctx.strokeStyle = '#ddd5c5'; ctx.lineWidth = 38; ctx.stroke();
  // headland bush + track
  bushFloor(ctx, HEADLAND, r);
  trackPath(ctx, TRACK, 30, r);
  // lookout deck
  rrect(ctx, 2560, 120, 150, 90, 8, '#b08457');
  ctx.strokeStyle = 'rgba(80,50,30,.35)'; ctx.lineWidth = 1.5; for (let x = 2566; x < 2708; x += 9) { ctx.beginPath(); ctx.moveTo(x, 122); ctx.lineTo(x, 208); ctx.stroke(); }
  // rock platform + pools
  ctx.save(); blob(ctx, ROCKS[0] + ROCKS[2] / 2, ROCKS[1] + ROCKS[3] / 2, ROCKS[2] / 2, ROCKS[3] / 2, r, 10, 0.12); ctx.fillStyle = '#c98f55'; ctx.fill(); ctx.clip();
  speckle(ctx, ROCKS[0], ROCKS[1], ROCKS[2], ROCKS[3], 900, ['#b87c46', '#ddb07a', '#a86f3c'], r, [1, 3]);
  ctx.strokeStyle = 'rgba(120,70,30,.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(ROCKS[0], ROCKS[1] + 30 + i * 34); ctx.quadraticCurveTo(ROCKS[0] + 180, ROCKS[1] + 10 + i * 36, ROCKS[0] + 360, ROCKS[1] + 40 + i * 30); ctx.stroke(); }
  ctx.restore();
  for (const [x, y, rx, ry] of [[1840, 930, 40, 22], [1955, 990, 46, 26], [2050, 940, 30, 18], [1880, 1040, 34, 18], [2060, 1040, 26, 14]]) {
    ellipse(ctx, x, y + 3, rx + 5, ry + 4, '#a86f3c');
    ellipse(ctx, x, y, rx, ry, '#4fb0bf'); ellipse(ctx, x - rx * 0.2, y - ry * 0.2, rx * 0.5, ry * 0.4, 'rgba(255,255,255,.3)');
    for (let k = 0; k < 4; k++) ellipse(ctx, x + (r() - 0.5) * rx, y + (r() - 0.5) * ry, 3, 2, ['#e0546c', '#f29c38', '#6f8f5a'][k % 3]);
  }
  // beach towels
  const tc = ['#e0453b', '#2f6fa3', '#f2c230', '#6f54a8', '#2fb3a6'];
  for (let i = 0; i < 8; i++) {
    const x = 120 + i * 190 + r() * 60, y = 680 + r() * 220;
    if (x > 600 && x < 820 && y < 820) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate((r() - 0.5) * 0.6);
    rrect(ctx, -30, -16, 60, 32, 3, tc[i % tc.length]); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-30, -4, 60, 6);
    ctx.restore();
  }
  // Shelly Beach grass reserve
  ctx.fillStyle = '#a6cf82'; ctx.beginPath(); ctx.ellipse(2330, 640, 150, 50, 0, 0, Math.PI * 2); ctx.fill();
  flowers(ctx, 2220, 610, 220, 60, 30, r, ['#f2c230', '#fff']);
}

export function buildProps() {
  const r = rng(99);
  const P = [];
  const add = (kind, x, y, ...args) => P.push({ kind, args, x, y });
  // Corso shops
  add('shop', 160, 330, 'surf'); add('shop', 420, 330, 'kiosk', { name: 'CORSO KIOSK' }); add('shop', 660, 330, 'cafe'); add('shop', 900, 330, 'bakery'); add('shop', 1150, 330, 'news');
  add('shop', 1400, 330, 'chemist');
  add('busStop', MSPOTS.busStop[0], MSPOTS.busStop[1] - 4, 'TO FORESTVILLE');
  add('outdoorTable', 560, 420); add('outdoorTable', 780, 410);
  add('bench', 1000, 470); add('bench', 1300, 470); add('bins', 1560, 470);
  // Norfolk pines along the promenade
  for (let x = 80; x < 1800; x += 170) add('norfolkPine', x + (r() - 0.5) * 20, 474, 0.9 + r() * 0.25);
  for (let x = 120; x < 1700; x += 340) add('lamp', x + 85, 560);
  // beach life
  add('lifeguardTower', 700, 720);
  add('surfFlag', 480, 1010); add('surfFlag', 980, 1010);
  add('beachUmbrella', 330, 780, '#e0453b'); add('beachUmbrella', 1180, 860, '#2f6fa3'); add('beachUmbrella', 1480, 740, '#f2c230');
  add('picnicRug', 420, 820); add('sandcastle', 1300, 950); add('sandcastle', 180, 960);
  // headland bush
  let n = 0, t = 0;
  while (n < 26 && t++ < 2000) {
    const x = 2260 + r() * 540, y = 20 + r() * 640;
    if (!inPoly(x, y, HEADLAND) || distToPolyline(x, y, TRACK_PTS) < 60 || (x > 2530 && y < 240)) continue;
    if (P.some(p => Math.hypot(p.x - x, p.y - y) < 70)) continue;
    add(n % 3 === 0 ? 'roundTree' : n % 3 === 1 ? 'gum' : 'shrub', x, y, n % 3, 0.8 + r() * 0.3); n++;
  }
  for (let i = 0; i < 10; i++) { const x = 2280 + r() * 500, y = 60 + r() * 560; if (inPoly(x, y, HEADLAND) && distToPolyline(x, y, TRACK_PTS) > 40) add('rock', x, y, i % 4, 0.7 + r() * 0.4); }
  add('railing', 2560, 126, 150);
  add('tripod', MSPOTS.tripod[0], MSPOTS.tripod[1] + 30);
  add('signPost', 2300, 800, 'SHELLY BEACH', '#1f5f46', 110);
  add('signPost', 2440, 470, 'LOOKOUT ↑', '#5b3a24', 90);
  add('shop', 2480, 560, 'kiosk');
  add('bench', 2250, 600);
  return P;
}

// Cabbage Tree Bay (aquatic reserve) off Shelly Beach: snorkelling spot, no fishing.
export const BAY = [[2130, 905], [2420, 945], [2580, 905], [2620, 770], [W, 640], [W, 1560], [2150, 1560], [2080, 1180]];
const LAND_EDGE = [...LAND, LAND[0]];
const inBay = (x, y) => inPoly(x, y, BAY);
const seaDepth = (x, y) => (inPoly(x, y, LAND) ? 0 : distToPolyline(x, y, LAND_EDGE));

export function colliders(opts = {}) {
  return [
    // wade up to ~55px into the surf; deeper only with snorkel gear inside the bay
    { fn: (x, y) => { const d = seaDepth(x, y); return d > 55 && !(opts.canSwim && opts.canSwim() && inBay(x, y)); } },
    { rect: [2560, 110, 150, 12] },     // lookout railing edge
    { rect: [W - 30, 0, 30, 640] },    // cliff edge
  ];
}

export function surfaceAt(x, y) {
  const d = seaDepth(x, y);
  if (d > 0) return d > 55 ? 'deep' : 'water';
  if (inRect(x, y, [2560, 120, 150, 90])) return 'wood';
  if (inPoly(x, y, HEADLAND)) return distToPolyline(x, y, TRACK_PTS) < 18 ? 'gravel' : 'leaves';
  if (inRect(x, y, ROCKS)) return 'rock';
  if (y < 420) return 'hard';
  if (y < 480) return 'grass';
  if (y < 566) return 'hard';
  if (distToPolyline(x, y, MARINE_PTS) < 22) return 'hard';
  return 'sand';
}

export function fishWater(x, y) {
  if (seaDepth(x, y) <= 0) return null;
  return inBay(x, y) ? 'reserve' : 'surf';
}

export const manly = {
  id: 'manly', w: W, h: H, bg: '#3a9bb3', edgeTop: '#e2d2b2', edgeBottom: '#2a7f9e',
  spawn: [MSPOTS.busStop[0] + 40, MSPOTS.busStop[1] + 60],
  family: { dan: [250, 520], finn: [1860, 860], jarency: [420, 760], jessia: [2250, 740] },
  npcs: [{ id: 'kez', x: MSPOTS.kez[0], y: MSPOTS.kez[1], wander: 50 }],
  areas: AREAS, paintGround, buildProps, colliders, surfaceAt, fishWater, bay: BAY,
  roads: [],
  sea: { yTop: 1060 },
  land: LAND,
};
