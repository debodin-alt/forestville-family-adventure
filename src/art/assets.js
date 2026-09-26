// Shared asset helpers used by both the game and the bake tool (tools/bake.mjs).
// Baked PNG/WebP files are only used when their ART_VERSION matches; otherwise the
// game paints everything procedurally, so a stale bake can never show wrong art.

import { makeCanvas } from '../utils/canvas.js';
import { ANIMALS, FW, FH, ART, DIRS, FRAMES } from './critters.js';

// Bump this whenever any painter in src/art or a map's paintGround/buildProps changes.
export const ART_VERSION = '3.0.0';

export const CHUNK = 1024;
export const SCALABLE = new Set(['gum', 'roundTree', 'shrub', 'fern', 'grassTree', 'rock', 'norfolkPine', 'fig']);

export function propArgs(p) {
  const args = [...p.args];
  if (SCALABLE.has(p.kind) && typeof args[args.length - 1] === 'number' && args.length > 1) args[args.length - 1] = Math.round(args[args.length - 1] / 0.15) * 0.15;
  return args;
}
export const propKey = (kind, args) => `prop-${kind}-${JSON.stringify(args)}`;

export function groundChunks(map) {
  const [big, ctx] = makeCanvas(map.w, map.h);
  map.paintGround(ctx);
  const out = [];
  const nx = Math.ceil(map.w / CHUNK), ny = Math.ceil(map.h / CHUNK);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const w = Math.min(CHUNK, map.w - i * CHUNK), h = Math.min(CHUNK, map.h - j * CHUNK);
    const [c, cx] = makeCanvas(w, h);
    cx.drawImage(big, i * CHUNK, j * CHUNK, w, h, 0, 0, w, h);
    out.push({ key: `${map.id}-g-${i}-${j}`, canvas: c });
  }
  big.width = big.height = 1; // release memory quickly (iOS)
  return out;
}
export const groundKeys = map => {
  const keys = [];
  for (let i = 0; i < Math.ceil(map.w / CHUNK); i++) for (let j = 0; j < Math.ceil(map.h / CHUNK); j++) keys.push(`${map.id}-g-${i}-${j}`);
  return keys;
};

export function animalStrip(kind) {
  const frames = ANIMALS[kind]();
  const w = frames[0].width, h = frames[0].height;
  const [c, ctx] = makeCanvas(w * frames.length, h);
  frames.forEach((f, i) => ctx.drawImage(f, i * w, 0));
  return { canvas: c, w, h, n: frames.length };
}

// Add named frames to an existing texture (painted canvas or baked image).
export function addCritterFrames(tex) {
  if (tex.has('down-idle0')) return;
  DIRS.forEach((d, r) => FRAMES.forEach((f, c) => tex.add(`${d}-${f}`, 0, c * FW * ART, r * FH * ART, FW * ART, FH * ART)));
}
export function addStripFrames(tex, w, h, n) {
  if (tex.has(0) || tex.has('0')) return;
  for (let i = 0; i < n; i++) tex.add(i, 0, i * w, 0, w, h);
}
