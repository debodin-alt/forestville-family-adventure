// Versioned save system.
// - V2 lives under its own key; the V1 key is read for migration but never deleted.
// - Malformed data is backed up, never silently erased.
// - Every storage call is guarded (Safari private mode, full quota).

import { FAMILY } from '../data/characters.js';

export const SAVE_KEY = 'forestville-family-v2';
export const V1_KEY = 'forestville-family-v1';
export const FEATHER_IDS = ['pond', 'kooka', 'school', 'bev', 'bush'];

export function freshSave() {
  const now = Date.now();
  return {
    version: 2,
    player: { who: 'dan', map: 'forestville', x: null, y: null },
    quests: {
      intro: false,
      ch1: { feathers: [], kooka: 0, bev: 0, duckMoved: false, ledge: false, sandDug: false, done: false },
      ch2: { unlocked: false, arrived: false, duck: false, lookout: false, photo: false, done: false },
    },
    world: { areasSeen: [], talked: {} },
    settings: { muted: false },
    meta: { created: now, updated: now, migratedFrom: null },
  };
}

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

// Copy only known fields with the right types onto a fresh save.
export function normalize(raw) {
  const s = freshSave();
  if (!isObj(raw)) return s;
  const p = isObj(raw.player) ? raw.player : {};
  s.player.who = FAMILY.includes(p.who) ? p.who : 'dan';
  s.player.map = p.map === 'manly' ? 'manly' : 'forestville';
  s.player.x = num(p.x, null); s.player.y = num(p.y, null);
  const q = isObj(raw.quests) ? raw.quests : {};
  s.quests.intro = bool(q.intro, false);
  const c1 = isObj(q.ch1) ? q.ch1 : {};
  s.quests.ch1.feathers = Array.isArray(c1.feathers) ? [...new Set(c1.feathers.filter(f => FEATHER_IDS.includes(f)))] : [];
  s.quests.ch1.kooka = Math.max(0, Math.min(1, num(c1.kooka, 0)));
  s.quests.ch1.bev = Math.max(0, Math.min(3, num(c1.bev, 0)));
  for (const k of ['duckMoved', 'ledge', 'sandDug', 'done']) s.quests.ch1[k] = bool(c1[k], false);
  const c2 = isObj(q.ch2) ? q.ch2 : {};
  for (const k of ['unlocked', 'arrived', 'duck', 'lookout', 'photo', 'done']) s.quests.ch2[k] = bool(c2[k], false);
  if (s.quests.ch1.feathers.length === 5) { s.quests.ch1.done = true; s.quests.ch2.unlocked = true; }
  if (!s.quests.ch2.unlocked && s.player.map === 'manly') s.player.map = 'forestville';
  const w = isObj(raw.world) ? raw.world : {};
  s.world.areasSeen = Array.isArray(w.areasSeen) ? w.areasSeen.filter(a => typeof a === 'string').slice(0, 50) : [];
  s.world.talked = isObj(w.talked) ? Object.fromEntries(Object.entries(w.talked).filter(([k, v]) => typeof v === 'number').slice(0, 100)) : {};
  s.settings.muted = bool(raw.settings?.muted, false);
  if (isObj(raw.meta)) { s.meta.created = num(raw.meta.created, s.meta.created); s.meta.migratedFrom = raw.meta.migratedFrom ?? null; }
  return s;
}

// V1 shape: { v:1, who, x, y, feathers:['f1'..'f5'], done }
export function migrateV1(v1) {
  const s = freshSave();
  const map = { f1: 'bush', f2: 'kooka', f3: 'pond', f4: 'school', f5: 'bev' };
  s.player.who = FAMILY.includes(v1.who) ? v1.who : 'dan';
  s.quests.ch1.feathers = [...new Set((Array.isArray(v1.feathers) ? v1.feathers : []).map(f => map[f]).filter(Boolean))];
  s.quests.intro = s.quests.ch1.feathers.length > 0 || !!v1.done;
  // Steps behind already-found feathers count as finished.
  const has = f => s.quests.ch1.feathers.includes(f);
  if (has('kooka')) s.quests.ch1.kooka = 1;
  if (has('bev')) s.quests.ch1.bev = 3;
  if (has('pond')) s.quests.ch1.duckMoved = true;
  if (has('school')) s.quests.ch1.sandDug = true;
  if (has('bush')) s.quests.ch1.ledge = true;
  if (s.quests.ch1.feathers.length === 5 || v1.done) {
    s.quests.ch1.feathers = [...FEATHER_IDS];
    s.quests.ch1.done = true; s.quests.ch2.unlocked = true;
  }
  s.meta.migratedFrom = 1;
  return s;
}

function read(key) { try { return localStorage.getItem(key); } catch { return null; } }
function write(key, val) { try { localStorage.setItem(key, val); return true; } catch { return false; } }

// Returns { save, notice } where notice is an optional message for the player.
export function loadSave() {
  const raw = read(SAVE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 2) return { save: normalize(parsed), notice: null };
      throw new Error('bad version');
    } catch {
      write(`${SAVE_KEY}-backup-${Date.now()}`, raw);
      return { save: freshSave(), notice: 'Your save looked damaged, so a backup copy was kept and a new adventure started.' };
    }
  }
  const old = read(V1_KEY);
  if (old) {
    try {
      const v1 = JSON.parse(old);
      if (v1 && v1.v === 1) {
        const s = migrateV1(v1);
        writeSave(s);
        return { save: s, notice: 'Welcome back! Your feathers from the first version came with you.' };
      }
    } catch { /* unreadable V1: leave it alone and start fresh */ }
  }
  return { save: freshSave(), notice: null };
}

let warned = false;
export function writeSave(s) {
  s.meta.updated = Date.now();
  const ok = write(SAVE_KEY, JSON.stringify(s));
  if (!ok && !warned) { warned = true; return 'warn'; }
  return ok;
}

// Reset writes a fresh V2 save (so the old V1 save is not migrated again).
export function resetSave(keepSettings) {
  const s = freshSave();
  if (keepSettings) s.settings = { ...keepSettings };
  s.quests.intro = false;
  s.meta.migratedFrom = 'reset';
  write(SAVE_KEY, JSON.stringify(s));
  return s;
}
