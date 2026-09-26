// Small canvas helpers shared by all procedural painters.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d')];
}

// Deterministic RNG so the world looks the same on every load.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function ellipse(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

export function rrect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

// Organic blob path around (x,y).
export function blob(ctx, x, y, rx, ry, rand, points = 9, jitter = 0.18) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + (rand() - 0.5) * 2 * jitter;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const p = pts[i], n = pts[(i + 1) % points];
    const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p[0], p[1], mx, my);
  }
  const p = pts[0], n = pts[1];
  ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
  ctx.closePath();
}

// Scatter small dots for texture. `test(x,y)` can reject points.
export function speckle(ctx, x, y, w, h, count, colors, rand, size = [1, 3], test) {
  for (let i = 0; i < count; i++) {
    const px = x + rand() * w, py = y + rand() * h;
    if (test && !test(px, py)) continue;
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const s = size[0] + rand() * (size[1] - size[0]);
    ctx.beginPath();
    ctx.ellipse(px, py, s, s * 0.7, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Smooth path through points (Catmull-Rom to Bezier).
export function smoothPath(ctx, pts, closed = false) {
  ctx.beginPath();
  if (pts.length < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  const n = pts.length;
  const get = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1]
    );
  }
  if (closed) ctx.closePath();
}

// Sample a Catmull-Rom path into evenly spaced-ish points (for collision / placement).
export function samplePath(pts, stepsPerSeg = 12) {
  const out = [];
  const n = pts.length;
  const get = i => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < stepsPerSeg; s++) {
      const t = s / stepsPerSeg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

export function distToPolyline(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
    if (d < best) best = d;
  }
  return best;
}

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}
