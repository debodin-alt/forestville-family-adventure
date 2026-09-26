// Lightweight shape collision (rects, circles, ellipses, polygons) with a coarse grid.
// Movement resolves each axis separately so characters slide along edges.

const CELL = 200;

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function hit(s, x, y) {
  if (s.except && x >= s.except.x && x <= s.except.x + s.except.w && y >= s.except.y && y <= s.except.y + s.except.h) return false;
  if (s.rect) { const [rx, ry, rw, rh] = s.rect; return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh; }
  if (s.circle) { const [cx, cy, r] = s.circle; return (x - cx) ** 2 + (y - cy) ** 2 <= r * r; }
  if (s.ellipse) { const [cx, cy, rx, ry] = s.ellipse; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1; }
  if (s.outsidePoly) return !inPoly(x, y, s.outsidePoly);
  if (s.fn) return s.fn(x, y);
  return false;
}

function bounds(s) {
  if (s.rect) return s.rect;
  if (s.circle) return [s.circle[0] - s.circle[2], s.circle[1] - s.circle[2], s.circle[2] * 2, s.circle[2] * 2];
  if (s.ellipse) return [s.ellipse[0] - s.ellipse[2], s.ellipse[1] - s.ellipse[3], s.ellipse[2] * 2, s.ellipse[3] * 2];
  return null;
}

export class Collision {
  constructor(w, h, shapes) {
    this.w = w; this.h = h; this.global = []; this.grid = new Map();
    for (const s of shapes) this.add(s);
  }

  add(s) {
    const b = bounds(s);
    if (!b) { this.global.push(s); return; }
    const [x, y, w, h] = b;
    for (let gx = Math.floor(x / CELL); gx <= Math.floor((x + w) / CELL); gx++)
      for (let gy = Math.floor(y / CELL); gy <= Math.floor((y + h) / CELL); gy++) {
        const k = gx + ',' + gy;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(s);
      }
  }

  pointBlocked(x, y) {
    if (x < 8 || y < 8 || x > this.w - 8 || y > this.h - 8) return true;
    for (const s of this.global) if (hit(s, x, y)) return true;
    const cell = this.grid.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL));
    if (cell) for (const s of cell) if (hit(s, x, y)) return true;
    return false;
  }

  // Feet are an ellipse ~10 x 6 px: sample 5 points.
  blocked(x, y) {
    return this.pointBlocked(x, y) || this.pointBlocked(x - 10, y) || this.pointBlocked(x + 10, y) || this.pointBlocked(x, y - 5) || this.pointBlocked(x, y + 5);
  }

  // `extra(x, y)` lets the caller add moving obstacles (other characters)
  move(x, y, dx, dy, extra) {
    const B = extra ? (px, py) => this.blocked(px, py) || extra(px, py, x, y) : (px, py) => this.blocked(px, py);
    let nx = x, ny = y;
    if (dx && !B(x + dx, y)) nx = x + dx;
    if (dy && !B(nx, y + dy)) ny = y + dy;
    // unstick: if we somehow start inside something, allow any move
    if (nx === x && ny === y && (dx || dy) && B(x, y)) { nx = x + dx; ny = y + dy; }
    return [nx, ny];
  }
}
