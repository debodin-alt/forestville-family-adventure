// Gentle day cycle: morning → midday → golden hour → sunset → dusk → dawn.
// Implemented as a CSS multiply layer over the game (cheap on phones).

const CYCLE_MS = 16 * 60 * 1000;
const KEYS = [
  [0.00, [255, 238, 215]], [0.18, [255, 253, 248]], [0.50, [255, 250, 242]], [0.64, [255, 224, 180]],
  [0.74, [248, 186, 160]], [0.82, [168, 160, 212]], [0.90, [212, 198, 226]], [1.00, [255, 238, 215]],
];
const NAMES = [[0.12, 'Morning'], [0.56, 'Midday'], [0.7, 'Golden hour'], [0.79, 'Sunset'], [0.9, 'Dusk'], [1.01, 'Dawn']];

export const daylight = {
  phase: 0.04, el: null, acc: 0,
  init(el) { this.el = el; this.apply(); },
  tick(dt) {
    this.phase = (this.phase + dt / CYCLE_MS) % 1;
    this.acc += dt;
    if (this.acc > 800) { this.acc = 0; this.apply(); }
  },
  color() {
    const p = this.phase;
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [a, ca] = KEYS[i], [b, cb] = KEYS[i + 1];
      if (p >= a && p <= b) { const t = (p - a) / (b - a); return ca.map((v, k) => Math.round(v + (cb[k] - v) * t)); }
    }
    return KEYS[0][1];
  },
  // 0 in daylight, up to 1 at dusk: used for lamp glow
  get dark() { const p = this.phase; return p < 0.72 ? 0 : p < 0.82 ? (p - 0.72) / 0.1 : p < 0.92 ? 1 - (p - 0.82) / 0.1 * 0.7 : Math.max(0, 0.3 - (p - 0.92) * 4); },
  get name() { return NAMES.find(([t]) => this.phase < t)[1]; },
  apply() { if (this.el) { const [r, g, b] = this.color(); this.el.style.backgroundColor = `rgb(${r},${g},${b})`; } },
};
