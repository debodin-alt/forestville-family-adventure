// Unified input: floating virtual joystick, action button, keyboard.

export const input = {
  x: 0, y: 0,            // movement vector, length <= 1
  action: false,         // edge-triggered, consumed by the scene
  keys: new Set(),
  touch: false,
  onKey: null,           // (key) => void for extra shortcuts
};

const vib = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* ignore */ } };
const coarse = matchMedia('(pointer: coarse)');
export const isTouch = () => input.touch || coarse.matches;

export const haptic = { light: () => vib(12), success: () => vib([18, 40, 26]) };

export function initInput({ zone, base, knob, actionBtn }) {
  // ---- keyboard ----
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) { input.keys.add(k); return; }
    input.keys.add(k);
    if (k === 'e' || k === ' ' || k === 'enter') input.action = true;
    input.onKey?.(k, e);
  });
  addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => input.keys.clear());

  // ---- floating joystick ----
  let pid = null, cx = 0, cy = 0;
  const R = 46, DEAD = 0.12;
  const setKnob = (dx, dy) => { knob.style.transform = `translate3d(${dx}px,${dy}px,0)`; };
  const place = (x, y) => { base.style.transform = `translate3d(${x - 60}px,${y - 60}px,0)`; };
  const rest = () => {
    const r = zone.getBoundingClientRect();
    cx = r.left + 90; cy = r.bottom - 90;
    place(cx, cy); setKnob(0, 0); base.classList.remove('live');
  };
  const move = e => {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const l = Math.hypot(dx, dy) || 1;
    // let the base follow a thumb that drifts far away
    if (l > R * 1.6) { cx = e.clientX - dx / l * R * 1.6; cy = e.clientY - dy / l * R * 1.6; place(cx, cy); dx = e.clientX - cx; dy = e.clientY - cy; }
    const m = Math.min(R, Math.hypot(dx, dy));
    const nx = dx / (Math.hypot(dx, dy) || 1), ny = dy / (Math.hypot(dx, dy) || 1);
    setKnob(nx * m, ny * m);
    let mag = m / R; mag = mag < DEAD ? 0 : (mag - DEAD) / (1 - DEAD);
    input.x = nx * mag; input.y = ny * mag;
  };
  zone.addEventListener('pointerdown', e => {
    if (pid !== null) return;
    input.touch = e.pointerType !== 'mouse' || input.touch;
    pid = e.pointerId; zone.setPointerCapture(pid);
    cx = e.clientX; cy = e.clientY; place(cx, cy); base.classList.add('live');
    move(e); e.preventDefault();
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; input.x = input.y = 0; rest(); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  addEventListener('resize', () => { if (pid === null) rest(); });
  rest();

  // ---- action button ----
  actionBtn.addEventListener('pointerdown', e => {
    e.preventDefault(); input.action = true; input.touch = input.touch || e.pointerType !== 'mouse';
    actionBtn.classList.add('pressed'); haptic.light();
  });
  const up = () => actionBtn.classList.remove('pressed');
  actionBtn.addEventListener('pointerup', up); actionBtn.addEventListener('pointercancel', up); actionBtn.addEventListener('pointerleave', up);

  // block iOS double-tap zoom / long-press menus on the game surface
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
}

// Merge keyboard into the joystick vector.
export function readMove() {
  let x = input.x, y = input.y;
  const k = input.keys;
  if (k.has('arrowleft') || k.has('a')) x -= 1;
  if (k.has('arrowright') || k.has('d')) x += 1;
  if (k.has('arrowup') || k.has('w')) y -= 1;
  if (k.has('arrowdown') || k.has('s')) y += 1;
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return [x, y];
}

export function takeAction() { const a = input.action; input.action = false; return a; }
