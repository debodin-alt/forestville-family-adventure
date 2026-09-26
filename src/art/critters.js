// Procedural character art. Every character is painted with canvas paths:
// original, tiny, no image files. Sheets are painted at 2x for crisp retina display.

import { makeCanvas, ellipse, rrect, shade } from '../utils/canvas.js';
import { CHARACTERS } from '../data/characters.js';

export const ART = 2;                 // texture scale (sprites are shown at 1/ART)
export const FW = 72, FH = 104, GROUND = 98;
export const DIRS = ['down', 'up', 'side'];
export const FRAMES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3'];

const INK = '#3a2a22';
const BLUSH = 'rgba(255,120,130,.35)';

// ---------- shared face bits ----------
function eye(ctx, x, y, r = 2.4, blink = false, sleepy = false) {
  if (blink) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.7, x + r, y); ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, r, r * 1.15, INK);
  ellipse(ctx, x + r * 0.35, y - r * 0.4, r * 0.38, r * 0.38, '#fff');
  if (sleepy) {
    ctx.fillStyle = 'rgba(0,0,0,0)';
  }
}

function lid(ctx, x, y, r, col) {
  // half-closed lid for a deadpan look
  ctx.save();
  ctx.beginPath(); ctx.rect(x - r - 1, y - r * 1.3, r * 2 + 2, r * 1.1); ctx.clip();
  ellipse(ctx, x, y, r + 0.6, r * 1.2 + 0.6, col);
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(x - r - 0.5, y - r * 0.2); ctx.lineTo(x + r + 0.5, y - r * 0.2); ctx.stroke();
}

function smile(ctx, x, y, w = 3, open = false) {
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y + w * 0.9, x + w, y); ctx.stroke();
  if (open) { ellipse(ctx, x, y + 1.2, w * 0.55, w * 0.45, '#b8434f'); }
}

// ---------- humanoid critter (everyone except Finn) ----------
function drawHumanoid(ctx, id, dir, frame) {
  const c = CHARACTERS[id];
  const sp = c.species;
  const walk = frame.startsWith('walk') ? +frame[4] : -1;
  const lp = walk < 0 ? 0 : [0, 1, 0, -1][walk];
  const bob = walk < 0 ? 0 : [0, -2, 0, -2][walk];
  const blink = frame === 'idle1';
  const cx = FW / 2, G = GROUND;
  const furD = shade(c.fur, -0.28);
  const stocky = sp === 'wombat' ? 3 : sp === 'bear' ? 1.5 : 0;
  const tall = sp === 'kangaroo' ? 2 : 0;

  const hx = dir === 'side' ? cx + 1 : cx;
  const hy = G - 52 + bob - tall;
  const ty = G - 22 + bob;

  // tails behind
  if (sp === 'kangaroo' && dir !== 'down') {
    ctx.save(); ctx.translate(dir === 'side' ? cx - 10 : cx, G - 10);
    ctx.rotate(dir === 'side' ? 0.5 : 0);
    ellipse(ctx, dir === 'side' ? -8 : 0, 0, dir === 'side' ? 16 : 6, dir === 'side' ? 5 : 12, c.fur);
    ctx.restore();
  }
  if (sp === 'cheetah' && dir !== 'down') {
    ctx.strokeStyle = c.fur; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (dir === 'side') { ctx.moveTo(cx - 8, G - 18); ctx.quadraticCurveTo(cx - 26, G - 16, cx - 24, G - 34); }
    else { ctx.moveTo(cx + 2, G - 16); ctx.quadraticCurveTo(cx + 18, G - 8, cx + 16, G - 30); }
    ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 5;
    ctx.beginPath();
    if (dir === 'side') { ctx.moveTo(cx - 24.5, G - 30); ctx.lineTo(cx - 24, G - 34); }
    else { ctx.moveTo(cx + 16.2, G - 26); ctx.lineTo(cx + 16, G - 30); }
    ctx.stroke();
  }
  if (sp === 'possum' && dir !== 'down') {
    ctx.strokeStyle = '#3f3b38'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 6, G - 16); ctx.quadraticCurveTo(cx - 24, G - 20, cx - 20, G - 38); ctx.stroke();
  }

  // Dan's guitar on his back (visible from behind / side)
  if (id === 'dan' && dir !== 'down') {
    ctx.save();
    ctx.translate(dir === 'side' ? cx - 9 : cx, ty + 1);
    ctx.rotate(dir === 'side' ? -0.25 : 0.35);
    rrect(ctx, -2, -30, 4, 22, 2, '#5b3a24');
    ellipse(ctx, 0, 0, 9, 11, '#c27c3e');
    ellipse(ctx, 0, -8, 7, 6, '#c27c3e');
    ellipse(ctx, 0, -3, 2.6, 2.6, '#4a2e1c');
    ctx.restore();
  }

  // feet
  const footC = sp === 'kangaroo' ? furD : shade(c.fur, -0.35);
  if (dir === 'side') {
    ellipse(ctx, cx - 3 - lp * 6, G - 3 - (lp < 0 ? 2 : 0), sp === 'kangaroo' ? 10 : 7, 4, shade(footC, -0.15));
    ellipse(ctx, cx + 3 + lp * 6, G - 3 - (lp > 0 ? 2 : 0), sp === 'kangaroo' ? 10 : 7, 4, footC);
  } else {
    ellipse(ctx, cx - 7 - stocky, G - 3 - (lp > 0 ? 2.5 : 0), 6.5, 4, footC);
    ellipse(ctx, cx + 7 + stocky, G - 3 - (lp < 0 ? 2.5 : 0), 6.5, 4, footC);
  }
  // legs
  ctx.fillStyle = c.fur;
  if (dir === 'side') {
    rrect(ctx, cx - 6 - lp * 4, G - 14 + bob, 7, 11, 3, c.fur);
    rrect(ctx, cx - 1 + lp * 4, G - 14 + bob, 7, 11, 3, c.fur);
  } else {
    rrect(ctx, cx - 11 - stocky, G - 14 + bob - (lp > 0 ? 2 : 0), 8, 11, 3, c.fur);
    rrect(ctx, cx + 3 + stocky, G - 14 + bob - (lp < 0 ? 2 : 0), 8, 11, 3, c.fur);
  }

  // torso (outfit)
  const trx = 13 + stocky, trY = 13;
  ellipse(ctx, cx, ty, trx, trY, c.outfit);
  // outfit details
  if (id === 'dan') {
    // tee hem + pocket stripe
    ctx.fillStyle = c.outfit2; ctx.fillRect(cx - trx + 2, ty + 7, trx * 2 - 4, 3);
    if (dir === 'down') { rrect(ctx, cx + 3, ty - 5, 5, 5, 1, c.outfit2); }
  }
  if (id === 'jessia') {
    ellipse(ctx, cx, ty - 10, 11, 4, c.outfit2); // hood collar
    if (dir === 'down') {
      ctx.strokeStyle = '#f4eee8'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx - 3, ty - 7); ctx.lineTo(cx - 3.5, ty + 2); ctx.moveTo(cx + 3, ty - 7); ctx.lineTo(cx + 3.5, ty + 2); ctx.stroke();
      rrect(ctx, cx - 7, ty + 3, 14, 6, 3, c.outfit2); // front pocket
    }
    if (dir === 'up') { ellipse(ctx, cx, ty - 7, 10, 7, c.outfit2); }
  }
  if (id === 'jarency') {
    ctx.fillStyle = c.outfit2; // rust scarf
    ctx.beginPath(); ctx.moveTo(cx - 10, ty - 11); ctx.quadraticCurveTo(cx, ty - 4, cx + 10, ty - 11); ctx.lineTo(cx + 5, ty - 6); ctx.lineTo(cx + 2, ty + 4); ctx.lineTo(cx - 1, ty - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9cbb3'; ctx.fillRect(cx - trx + 2, ty + 6, trx * 2 - 4, 2); // belt line
    // tote strap
    if (dir !== 'up') {
      ctx.strokeStyle = '#7f8f5a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 8, ty - 11); ctx.lineTo(cx + 12, ty + 4); ctx.stroke();
    }
  }
  if (sp === 'wombat') { rrect(ctx, cx - 9, ty - 6, 18, 17, 5, c.outfit); ctx.fillStyle = shade(c.outfit, -0.2); ctx.fillRect(cx - 9, ty - 6, 18, 2); }
  if (sp === 'koala') { rrect(ctx, cx - 9, ty - 6, 18, 18, 4, c.outfit); }
  if (sp === 'possum' && dir === 'down') {
    ctx.strokeStyle = c.outfit2; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 6, ty - 11); ctx.lineTo(cx, ty + 1); ctx.lineTo(cx + 6, ty - 11); ctx.stroke();
    rrect(ctx, cx - 2.5, ty, 5, 6, 1, '#fff');
  }
  if (sp === 'kangaroo') {
    ctx.fillStyle = c.outfit2; ctx.fillRect(cx - trx + 1, ty - 3, trx * 2 - 2, 4);
    if (dir === 'down') { ellipse(ctx, cx, ty + 6, 7, 4, shade(c.fur, 0.3)); }
  }

  // arms (swing opposite legs)
  const armY = ty - 3;
  const armC = sp === 'kangaroo' || sp === 'wombat' || sp === 'koala' || id === 'dan' ? c.fur : c.outfit;
  if (dir === 'side') {
    ellipse(ctx, cx + 1 - lp * 5, armY + 2, 4.5, 7.5, armC, -lp * 0.35);
    ellipse(ctx, cx + 1 - lp * 6, armY + 8, 3.6, 3.2, c.fur);
    if (id === 'dan') { rrect(ctx, cx + 1 - lp * 6 + 1, armY + 2, 6, 8, 1.5, '#f3ead8'); ctx.fillStyle = '#6b4a33'; ctx.fillRect(cx + 1 - lp * 6 + 1, armY + 2, 6, 2.2); }
  } else {
    const sL = lp * 2.2, sR = -lp * 2.2;
    ellipse(ctx, cx - trx - 1, armY + sL, 4.5, 7.5, armC, 0.25);
    ellipse(ctx, cx + trx + 1, armY + sR, 4.5, 7.5, armC, -0.25);
    ellipse(ctx, cx - trx - 2, armY + 6 + sL, 3.6, 3.2, c.fur);
    ellipse(ctx, cx + trx + 2, armY + 6 + sR, 3.6, 3.2, c.fur);
    if (id === 'dan' && dir === 'down') { // keep cup
      rrect(ctx, cx + trx - 1, armY - 1 + sR, 7, 9, 1.5, '#f3ead8');
      ctx.fillStyle = '#6b4a33'; ctx.fillRect(cx + trx - 1, armY - 1 + sR, 7, 2.4);
      ctx.fillStyle = '#c9a36d'; ctx.fillRect(cx + trx - 1, armY + 3 + sR, 7, 2);
    }
    if (id === 'jarency' && dir === 'down') { rrect(ctx, cx + trx - 2, ty + 1, 10, 11, 2.5, '#7f8f5a'); ctx.fillStyle = '#e8d9b8'; ctx.fillRect(cx + trx, ty + 5, 6, 2); }
  }
  if (id === 'jarency' && dir === 'side') { rrect(ctx, cx - 10, ty - 1, 9, 11, 2.5, '#7f8f5a'); }

  // ---- ears behind head ----
  drawEars(ctx, c, sp, dir, hx, hy, true);

  // head
  const hr = sp === 'wombat' ? 18.5 : 18;
  if (sp === 'wombat') ellipse(ctx, hx, hy + 1, hr + 2, hr - 1, c.fur);
  else ellipse(ctx, hx, hy, hr, hr - 0.5, c.fur);
  // cheek fluff for koala / cheetah
  if (sp === 'koala' && dir !== 'up') { ellipse(ctx, hx - 13, hy + 6, 6, 5, c.fur); ellipse(ctx, hx + 13, hy + 6, 6, 5, c.fur); }

  drawEars(ctx, c, sp, dir, hx, hy, false);

  if (dir === 'up') {
    // back of head details
    if (sp === 'cheetah') spots(ctx, hx, hy, [[-8, -6], [6, -9], [0, -2], [-4, 6], [8, 3], [-11, 1]], 1.6);
    if (id === 'jarency') { rrect(ctx, hx - 12, hy - 14, 24, 3, 1.5, '#2a2320'); }
    if (id === 'jessia') { ctx.strokeStyle = '#222'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(hx, hy + 14, 11, 0.15, Math.PI - 0.15); ctx.stroke(); }
    if (sp === 'wombat') hat(ctx, c, hx, hy, dir);
    if (sp === 'kangaroo') lifesaverCap(ctx, hx, hy, dir);
    return;
  }

  const side = dir === 'side';
  const fx = side ? hx + 6 : hx;
  // muzzle
  if (sp === 'bear') {
    ellipse(ctx, side ? hx + 12 : hx, hy + 6, side ? 7 : 8.5, side ? 5.5 : 6.5, c.furLight);
    ellipse(ctx, side ? hx + 18 : hx, hy + 2.5, 3.4, 2.5, '#2b1d16');
  } else if (sp === 'rabbit') {
    ellipse(ctx, side ? hx + 12 : hx, hy + 6, side ? 5.5 : 6.5, 4.5, c.furLight);
    ellipse(ctx, side ? hx + 16.5 : hx, hy + 3.5, 2.3, 1.7, '#e98a9a');
  } else if (sp === 'cheetah') {
    spots(ctx, hx, hy, side ? [[-6, -10], [-10, -2], [2, -12], [-12, 6]] : [[-10, -8], [9, -9], [-12, 2], [12, 1], [0, -13]], 1.5);
    ellipse(ctx, side ? hx + 11 : hx, hy + 7, side ? 7 : 8, 5.5, c.furLight);
    ellipse(ctx, side ? hx + 16.5 : hx, hy + 3.5, 2.8, 2, '#3a2616');
  } else if (sp === 'wombat') {
    rrect(ctx, (side ? hx + 12 : hx) - 6, hy + 1, 12, 8, 4, '#3b302a');
  } else if (sp === 'koala') {
    ellipse(ctx, side ? hx + 14 : hx, hy + 5, side ? 4.5 : 5, 6.5, '#2a2624');
  } else if (sp === 'possum') {
    ellipse(ctx, side ? hx + 12 : hx, hy + 6, 6, 4.5, c.furLight);
    ellipse(ctx, side ? hx + 17 : hx, hy + 4, 2.4, 1.8, '#e98a9a');
  } else if (sp === 'kangaroo') {
    ellipse(ctx, side ? hx + 12 : hx, hy + 7, side ? 8 : 7, 6, c.furLight);
    ellipse(ctx, side ? hx + 18 : hx, hy + 4, 2.6, 2, '#3a2616');
  }

  // eyes
  const eyeR = sp === 'possum' ? 3.2 : 2.4;
  if (side) {
    eye(ctx, fx, hy - 2, eyeR, blink);
    if (sp === 'rabbit' && !blink) lid(ctx, fx, hy - 2, eyeR, c.fur);
  } else {
    eye(ctx, hx - 6.5, hy - 2, eyeR, blink);
    eye(ctx, hx + 6.5, hy - 2, eyeR, blink);
    if (sp === 'rabbit' && !blink) { lid(ctx, hx - 6.5, hy - 2, eyeR, c.fur); lid(ctx, hx + 6.5, hy - 2, eyeR, c.fur); }
    ellipse(ctx, hx - 11, hy + 5, 3.2, 2, BLUSH);
    ellipse(ctx, hx + 11, hy + 5, 3.2, 2, BLUSH);
  }
  // tear marks for the cheetah
  if (sp === 'cheetah') {
    ctx.strokeStyle = '#3a2616'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    if (side) { ctx.moveTo(fx + 1.5, hy); ctx.quadraticCurveTo(fx + 4, hy + 4, fx + 7, hy + 8); }
    else { ctx.moveTo(hx - 4, hy); ctx.quadraticCurveTo(hx - 4.5, hy + 5, hx - 3, hy + 8); ctx.moveTo(hx + 4, hy); ctx.quadraticCurveTo(hx + 4.5, hy + 5, hx + 3, hy + 8); }
    ctx.stroke();
  }
  // mouths
  if (!side) {
    if (sp === 'rabbit') { ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(hx, hy + 5); ctx.lineTo(hx, hy + 7); ctx.moveTo(hx - 2.5, hy + 8.3); ctx.quadraticCurveTo(hx, hy + 6.5, hx + 2.5, hy + 8.3); ctx.stroke(); }
    else if (sp === 'wombat' || sp === 'koala') smile(ctx, hx, hy + 11, 2.5);
    else smile(ctx, hx, hy + 9, 2.8, id === 'dan');
  }

  // headwear / accessories
  if (id === 'jarency') { // sunglasses pushed up on head
    ctx.fillStyle = '#2a2320';
    if (side) { rrect(ctx, fx - 3, hy - 14, 9, 5, 2, '#2a2320'); ctx.fillRect(fx - 10, hy - 13, 8, 1.5); }
    else { rrect(ctx, hx - 11, hy - 15, 9, 5.5, 2.2, '#2a2320'); rrect(ctx, hx + 2, hy - 15, 9, 5.5, 2.2, '#2a2320'); ctx.fillRect(hx - 2, hy - 13.5, 4, 1.5); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(side ? fx - 1 : hx - 9, hy - 14, 3, 1.3);
  }
  if (id === 'jessia') { // headphones round the neck
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(hx, hy + 13, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    if (!side) { rrect(ctx, hx - 15, hy + 14, 5, 7, 2, '#2fb3a6'); rrect(ctx, hx + 10, hy + 14, 5, 7, 2, '#2fb3a6'); }
    else rrect(ctx, hx - 2, hy + 16, 6, 7, 2, '#2fb3a6');
  }
  if (sp === 'wombat') hat(ctx, c, hx, hy, dir);
  if (sp === 'kangaroo') lifesaverCap(ctx, hx, hy, dir);
}

function spots(ctx, hx, hy, list, r) {
  ctx.fillStyle = '#5b3a1c';
  for (const [x, y] of list) { ctx.beginPath(); ctx.arc(hx + x, hy + y, r, 0, 7); ctx.fill(); }
}

function hat(ctx, c, hx, hy, dir) {
  ellipse(ctx, hx, hy - 12, 24, 6.5, c.outfit2);
  ellipse(ctx, hx, hy - 16, 12, 8, c.outfit2);
  ctx.fillStyle = '#7a8f4e'; ctx.fillRect(hx - 12, hy - 15, 24, 3);
  ctx.strokeStyle = shade(c.outfit2, -0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(hx, hy - 12, 24, 6.5, 0, 0, Math.PI); ctx.stroke();
}

function lifesaverCap(ctx, hx, hy, dir) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(hx, hy - 6, 17, 13, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#d8352a'; ctx.fillRect(hx - 18, hy - 20, 36, 16);
  ctx.fillStyle = '#f2c230'; ctx.fillRect(hx - 18, hy - 20, 18, 8); ctx.fillRect(hx, hy - 12, 18, 8);
  ctx.restore();
}

function drawEars(ctx, c, sp, dir, hx, hy, behind) {
  const side = dir === 'side';
  const inner = sp === 'possum' || sp === 'rabbit' ? '#f0a8b2' : c.furLight;
  if (sp === 'bear' && behind) {
    if (side) { ellipse(ctx, hx - 5, hy - 15, 7, 7, c.fur); ellipse(ctx, hx - 5, hy - 15, 3.5, 3.5, c.furLight); }
    else { for (const s of [-1, 1]) { ellipse(ctx, hx + s * 13, hy - 13, 7, 7, c.fur); if (dir === 'down') ellipse(ctx, hx + s * 13, hy - 13, 3.5, 3.5, c.furLight); } }
  }
  if (sp === 'koala' && behind) {
    for (const s of side ? [-1] : [-1, 1]) {
      const x = side ? hx - 8 : hx + s * 16;
      ellipse(ctx, x, hy - 9, 10, 9, c.fur);
      if (dir !== 'up') ellipse(ctx, x, hy - 8, 6, 5.5, c.furLight);
    }
  }
  if (sp === 'wombat' && behind) { for (const s of [-1, 1]) ellipse(ctx, hx + s * 13, hy - 12, 5, 5, shade(c.fur, -0.15)); }
  if ((sp === 'cheetah') && behind) {
    for (const s of side ? [-1] : [-1, 1]) {
      const x = side ? hx - 5 : hx + s * 12;
      ellipse(ctx, x, hy - 14, 5.5, 5.5, c.fur);
      ellipse(ctx, x, hy - 13.5, 3, 3, dir === 'up' ? '#3a2616' : c.furLight);
    }
  }
  if ((sp === 'possum' || sp === 'kangaroo') && behind) {
    const len = sp === 'kangaroo' ? 11 : 8, w = sp === 'kangaroo' ? 4.5 : 5;
    for (const s of side ? [-1] : [-1, 1]) {
      const x = side ? hx - 5 : hx + s * 9;
      ellipse(ctx, x, hy - 16 - len * 0.5, w, len, c.fur, side ? -0.3 : s * 0.3);
      if (dir !== 'up') ellipse(ctx, x, hy - 16 - len * 0.5, w * 0.5, len * 0.7, inner, side ? -0.3 : s * 0.3);
    }
  }
  if (sp === 'rabbit' && behind) {
    if (side) {
      ellipse(ctx, hx - 4, hy - 30, 5.5, 13, c.fur, -0.35);
      ellipse(ctx, hx - 4, hy - 30, 2.8, 9.5, inner, -0.35);
      ellipse(ctx, hx - 14, hy - 18, 5, 12, shade(c.fur, -0.1), -1.1); // flopped ear
    } else {
      ellipse(ctx, hx - 7, hy - 29, 5.5, 13.5, c.fur, -0.12);
      if (dir === 'down') ellipse(ctx, hx - 7, hy - 29, 2.8, 10, inner, -0.12);
      ellipse(ctx, hx + 13, hy - 22, 5.5, 12.5, c.fur, 0.95); // one ear flops over
      if (dir === 'down') ellipse(ctx, hx + 13, hy - 22, 2.8, 9, inner, 0.95);
    }
  }
}

// ---------- Finn the goose ----------
function drawGoose(ctx, dir, frame, cap = true) {
  const c = CHARACTERS.finn;
  const walk = frame.startsWith('walk') ? +frame[4] : -1;
  const lp = walk < 0 ? 0 : [0, 1, 0, -1][walk];
  const bob = walk < 0 ? 0 : [0, -2, 0, -2][walk];
  const blink = frame === 'idle1';
  const cx = FW / 2, G = GROUND;
  const orange = '#f0922b', orangeD = '#c96d17';
  const white = c.fur, grey = '#dcd9d0';
  const side = dir === 'side';

  // feet
  if (side) {
    ellipse(ctx, cx - 2 - lp * 6, G - 3 - (lp < 0 ? 2 : 0), 7, 3.5, orangeD);
    ellipse(ctx, cx + 4 + lp * 6, G - 3 - (lp > 0 ? 2 : 0), 7, 3.5, orange);
  } else {
    ellipse(ctx, cx - 7, G - 3 - (lp > 0 ? 2.5 : 0), 6.5, 3.8, orange);
    ellipse(ctx, cx + 7, G - 3 - (lp < 0 ? 2.5 : 0), 6.5, 3.8, orange);
  }
  // legs
  ctx.fillStyle = orange;
  if (side) { ctx.fillRect(cx - 3 - lp * 4, G - 12 + bob, 3, 9); ctx.fillRect(cx + 3 + lp * 4, G - 12 + bob, 3, 9); }
  else { ctx.fillRect(cx - 8, G - 12 + bob, 3, 9); ctx.fillRect(cx + 5, G - 12 + bob, 3, 9); }

  const by = G - 22 + bob;
  // body + tail
  if (side) {
    ctx.fillStyle = white; ctx.beginPath(); ctx.moveTo(cx - 14, by - 2); ctx.lineTo(cx - 24, by - 9); ctx.lineTo(cx - 16, by + 6); ctx.closePath(); ctx.fill();
    ellipse(ctx, cx - 1, by, 17, 13.5, white);
    ellipse(ctx, cx - 4, by - 1, 11, 7.5, grey, -0.15);  // wing
    ctx.strokeStyle = '#c7c3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 12, by); ctx.lineTo(cx + 3, by + 2); ctx.stroke();
  } else {
    if (dir === 'up') { ctx.fillStyle = white; ctx.beginPath(); ctx.moveTo(cx - 6, by + 8); ctx.lineTo(cx, by + 16); ctx.lineTo(cx + 6, by + 8); ctx.fill(); }
    ellipse(ctx, cx, by, 16, 15, white);
    const sw = lp * 2;
    ellipse(ctx, cx - 14, by - 1 + sw, 5.5, 10, grey, 0.2);
    ellipse(ctx, cx + 14, by - 1 - sw, 5.5, 10, grey, -0.2);
  }
  // neck
  const nx = side ? cx + 6 : cx;
  rrect(ctx, nx - 5, G - 52 + bob, 10, 28, 5, white);
  // head
  const hx = side ? cx + 8 : cx, hy = G - 54 + bob;
  ellipse(ctx, hx, hy, 12.5, 12, white);
  if (dir === 'up') {
    if (cap) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy - 1, 13, 12, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.restore();
      ellipse(ctx, hx, hy - 4, 12.8, 9, c.outfit);
      ellipse(ctx, hx, hy + 4, 9, 3.2, c.outfit2); // backwards brim toward camera
      ellipse(ctx, hx, hy - 11, 1.8, 1.8, c.outfit2);
    }
    return;
  }
  if (cap) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(hx, hy - 3, 13, 10.5, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = c.outfit; ctx.fill(); ctx.restore();
    if (side) ellipse(ctx, hx - 13, hy - 4, 7, 2.6, c.outfit2, 0.15); // brim backwards
    else { ctx.fillStyle = c.outfit2; ctx.fillRect(hx - 13, hy - 4, 26, 2.2); }
    ellipse(ctx, hx, hy - 13, 1.8, 1.4, c.outfit2);
  }
  if (side) {
    ctx.fillStyle = orange; ctx.beginPath(); ctx.moveTo(hx + 8, hy - 2); ctx.quadraticCurveTo(hx + 24, hy, hx + 21, hy + 4); ctx.lineTo(hx + 8, hy + 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = orangeD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + 9, hy + 2); ctx.lineTo(hx + 20, hy + 2.5); ctx.stroke();
    eye(ctx, hx + 4, hy - 2, 2.4, blink);
  } else {
    eye(ctx, hx - 5, hy - 1, 2.3, blink);
    eye(ctx, hx + 5, hy - 1, 2.3, blink);
    ellipse(ctx, hx, hy + 6, 6, 4.2, orange);
    ctx.strokeStyle = orangeD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 4.5, hy + 6); ctx.lineTo(hx + 4.5, hy + 6); ctx.stroke();
    ellipse(ctx, hx - 9, hy + 4, 2.6, 1.6, BLUSH); ellipse(ctx, hx + 9, hy + 4, 2.6, 1.6, BLUSH);
  }
}

// ---------- outline pass ----------
function withOutline(drawFn, w, h, color = 'rgba(58,42,34,.9)', px = 1.3) {
  const [src, s] = makeCanvas(w, h);
  drawFn(s);
  const [sil, g] = makeCanvas(w, h);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  const [out, o] = makeCanvas(w, h);
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    o.drawImage(sil, Math.cos(ang) * px, Math.sin(ang) * px);
  }
  o.drawImage(src, 0, 0);
  return out;
}

export function paintCritterFrame(id, dir, frame) {
  return withOutline(ctx => {
    ctx.scale(ART, ART);
    if (id === 'finn') drawGoose(ctx, dir, frame);
    else drawHumanoid(ctx, id, dir, frame);
  }, FW * ART, FH * ART, undefined, 1.3 * ART);
}

// Full sprite sheet: rows = DIRS, cols = FRAMES.
export function paintCritterSheet(id) {
  const [c, ctx] = makeCanvas(FW * ART * FRAMES.length, FH * ART * DIRS.length);
  DIRS.forEach((d, r) => FRAMES.forEach((f, col) => ctx.drawImage(paintCritterFrame(id, d, f), col * FW * ART, r * FH * ART)));
  return c;
}

// Round portrait for HUD/dialogue.
export function paintPortrait(id, size = 96, bg) {
  const [c, ctx] = makeCanvas(size, size);
  const ch = CHARACTERS[id];
  ctx.fillStyle = bg || (ch ? shade(ch.outfit, 0.55) : '#efe4c8');
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, 7); ctx.clip();
  let art;
  if (ch) art = paintCritterFrame(id, 'down', 'idle0');
  else art = paintAnimalPortrait(id);
  const k = size / (FW * ART) * 1.25;
  const headY = id === 'finn' ? (GROUND - 50) : (GROUND - 46);
  ctx.drawImage(art, size / 2 - (FW * ART * k) / 2, size * 0.56 - headY * ART * k, FW * ART * k, FH * ART * k);
  ctx.restore();
  return c;
}

// ---------- ambient animals ----------
// Each returns an array of frame canvases (drawn at ART scale).
function frameSet(w, h, n, fn, outline = true) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const draw = ctx => { ctx.scale(ART, ART); fn(ctx, i); };
    if (outline) out.push(withOutline(draw, w * ART, h * ART, 'rgba(58,42,34,.85)', 1.1 * ART));
    else { const [c, ctx] = makeCanvas(w * ART, h * ART); draw(ctx); out.push(c); }
  }
  return out;
}

export const ANIMALS = {
  // Pacific black duck: brown body, striped face. frames 0-1 swim/paddle, 2-3 waddle
  duck: () => frameSet(40, 32, 4, (ctx, i) => {
    const bob = i % 2 ? 1 : 0;
    if (i >= 2) { ellipse(ctx, 16 + (i === 2 ? -2 : 2), 29, 3.5, 2, '#e0a02a'); ellipse(ctx, 22 + (i === 2 ? 2 : -2), 29, 3.5, 2, '#e0a02a'); }
    ctx.fillStyle = '#6e5234'; ctx.beginPath(); ctx.moveTo(6, 18 + bob); ctx.lineTo(1, 13 + bob); ctx.lineTo(8, 22 + bob); ctx.fill();
    ellipse(ctx, 18, 20 + bob, 13, 8, '#7b5c3b');
    ellipse(ctx, 16, 19 + bob, 8, 4.5, '#5f4630');
    ctx.fillStyle = '#2e8f7a'; ctx.fillRect(12, 20 + bob, 6, 2);
    ellipse(ctx, 29, 10 + bob, 6.5, 6, '#8a6a47');
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(24, 10 + bob); ctx.lineTo(35, 9 + bob); ctx.stroke();
    ellipse(ctx, 37, 12 + bob, 4.5, 2.2, '#4a4f55');
    ellipse(ctx, 30, 8.5 + bob, 1.3, 1.3, '#111');
    if (i < 2) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(18, 27, 15, 3, 0, 0, Math.PI); ctx.stroke(); }
  }),
  ibis: () => frameSet(44, 56, 3, (ctx, i) => {
    const peck = i === 2;
    ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, 38); ctx.lineTo(16 + (i === 1 ? 3 : 0), 54); ctx.moveTo(22, 38); ctx.lineTo(24 - (i === 1 ? 3 : 0), 54); ctx.stroke();
    ellipse(ctx, 20, 32, 13, 9, '#f1efe8');
    ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.moveTo(8, 30); ctx.quadraticCurveTo(2, 36, 10, 38); ctx.lineTo(16, 36); ctx.fill();
    ctx.strokeStyle = '#2b2622'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(28, 28); ctx.quadraticCurveTo(34, peck ? 30 : 18, 34, peck ? 38 : 12); ctx.stroke();
    ellipse(ctx, 34, peck ? 40 : 11, 4, 4, '#2b2622');
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(36, peck ? 42 : 12); ctx.quadraticCurveTo(44, peck ? 50 : 16, 42, peck ? 55 : 24); ctx.stroke();
  }),
  kookaburra: () => frameSet(40, 40, 3, (ctx, i) => {
    const open = i === 2;
    ellipse(ctx, 18, 26, 11, 12, '#c7b79c');
    ellipse(ctx, 13, 25, 7, 11, '#7a5a3a', 0.2);
    ctx.fillStyle = '#6f8fb0'; ctx.fillRect(9, 27, 6, 4);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(10, 34, 5, 6);
    ellipse(ctx, 22, 12, 10, 9, '#efe6d6');
    ctx.fillStyle = '#6b4c30'; ctx.fillRect(14, 9, 14, 3);
    ellipse(ctx, 25, 11, 1.6, 1.6, '#111');
    ctx.fillStyle = '#3b3530'; ctx.beginPath(); ctx.moveTo(29, 11); ctx.lineTo(40, open ? 9 : 14); ctx.lineTo(29, 15); ctx.fill();
    if (open) { ctx.fillStyle = '#e8d7b6'; ctx.beginPath(); ctx.moveTo(29, 14); ctx.lineTo(39, 18); ctx.lineTo(29, 17); ctx.fill(); }
    if (i === 1) ellipse(ctx, 25, 11, 2, 0.6, '#efe6d6');
  }),
  cockatoo: () => frameSet(44, 32, 2, (ctx, i) => {
    const up = i === 0;
    ellipse(ctx, 22, 18, 11, 7, '#f7f6f0');
    ellipse(ctx, 20, up ? 10 : 22, 16, 5, '#eeeee6', up ? -0.3 : 0.3);
    ellipse(ctx, 34, 15, 6, 5, '#f7f6f0');
    ctx.fillStyle = '#f2cf3a'; ctx.beginPath(); ctx.moveTo(32, 11); ctx.lineTo(28, 2); ctx.lineTo(35, 10); ctx.fill();
    ellipse(ctx, 40, 16, 2.5, 2.2, '#3b3530');
    ellipse(ctx, 35, 14, 1.1, 1.1, '#111');
    ctx.fillStyle = '#f7f6f0'; ctx.beginPath(); ctx.moveTo(12, 18); ctx.lineTo(3, 20); ctx.lineTo(12, 22); ctx.fill();
  }),
  lorikeet: () => frameSet(36, 28, 2, (ctx, i) => {
    const up = i === 0;
    ellipse(ctx, 18, 15, 9, 6, '#3fa84a');
    ellipse(ctx, 17, up ? 9 : 19, 12, 4, '#2f8f3b', up ? -0.3 : 0.3);
    ellipse(ctx, 22, 16, 4, 3.5, '#f07a2a');
    ellipse(ctx, 28, 12, 5, 4.5, '#3a57c8');
    ellipse(ctx, 32.5, 13, 1.8, 1.6, '#e5412f');
    ctx.fillStyle = '#2f8f3b'; ctx.beginPath(); ctx.moveTo(10, 15); ctx.lineTo(1, 18); ctx.lineTo(10, 18); ctx.fill();
  }),
  gull: () => frameSet(40, 26, 2, (ctx, i) => {
    const up = i === 0;
    ellipse(ctx, 20, 14, 10, 5, '#fbfbf8');
    ctx.strokeStyle = '#9aa3aa'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(20, 13); ctx.quadraticCurveTo(10, up ? 2 : 20, 2, up ? 6 : 18); ctx.moveTo(20, 13); ctx.quadraticCurveTo(30, up ? 2 : 20, 38, up ? 6 : 18); ctx.stroke();
    ellipse(ctx, 29, 12, 4, 3.5, '#fbfbf8');
    ctx.fillStyle = '#e5412f'; ctx.fillRect(32, 12, 4, 1.6);
  }),
  pelican: () => frameSet(52, 48, 2, (ctx, i) => {
    ctx.strokeStyle = '#8c8f94'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(22, 38); ctx.lineTo(22, 47); ctx.moveTo(28, 38); ctx.lineTo(28, 47); ctx.stroke();
    ellipse(ctx, 24, 30, 15, 11, '#f4f2ec');
    ellipse(ctx, 20, 30, 11, 8, '#2d2b2a', 0.1);
    ellipse(ctx, 34, 14, 7, 6.5, '#f4f2ec');
    ellipse(ctx, 35, 12.5, 1.3, 1.3, '#111');
    ctx.fillStyle = '#f0b8a0'; ctx.beginPath(); ctx.moveTo(38, 14); ctx.lineTo(52, i ? 20 : 18); ctx.quadraticCurveTo(44, 26, 38, 19); ctx.fill();
  }),
  butterfly: () => frameSet(18, 14, 2, (ctx, i) => {
    const s = i ? 0.35 : 1;
    ctx.fillStyle = '#f29c38';
    ctx.save(); ctx.translate(9, 7); ctx.scale(s, 1);
    ellipse(ctx, -5, -2, 5, 4, '#f29c38'); ellipse(ctx, 5, -2, 5, 4, '#f29c38');
    ellipse(ctx, -4, 3, 3.5, 3, '#e3701f'); ellipse(ctx, 4, 3, 3.5, 3, '#e3701f');
    ctx.restore();
    ctx.fillStyle = '#2b2622'; ctx.fillRect(8.4, 2, 1.2, 10);
  }, false),
  swimmer: () => frameSet(36, 24, 2, (ctx, i) => {
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(18, 18, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ellipse(ctx, 18, 12, 7, 7, '#c98e57');
    ctx.save(); ctx.beginPath(); ctx.ellipse(18, 11, 7.3, 7, 0, Math.PI, 0); ctx.clip();
    ctx.fillStyle = i ? '#f2c230' : '#d8352a'; ctx.fillRect(10, 3, 16, 9); ctx.restore();
    ellipse(ctx, i ? 8 : 28, 14, 3, 2.5, '#c98e57');
  }),
};

export function paintAnimalPortrait(id) {
  const [c, ctx] = makeCanvas(FW * ART, FH * ART);
  const set = { kooka: 'kookaburra', duck: 'duck', ibis: 'ibis' }[id];
  if (set) {
    const f = ANIMALS[set]()[0];
    ctx.drawImage(f, (FW * ART - f.width * 1.4) / 2, (GROUND - 46) * ART - f.height * 0.55, f.width * 1.4, f.height * 1.4);
  } else {
    // signpost icon
    ctx.scale(ART, ART);
    rrect(ctx, 20, 36, 32, 20, 4, '#7a5a3a');
    rrect(ctx, 34, 56, 4, 30, 1, '#5b3a24');
  }
  return c;
}
