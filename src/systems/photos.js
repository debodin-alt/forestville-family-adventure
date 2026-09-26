// Photo album storage: small JPEG snapshots kept in their own localStorage key
// (separate from the save, so a full album can never break saving progress).

const KEY = 'forestville-family-v2-photos';
const MAX = 30;

export function loadPhotos() {
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(p => p && typeof p.data === 'string' && p.data.startsWith('data:image/')) : []; }
  catch { return []; }
}

export function addPhoto(data, caption) {
  const list = loadPhotos();
  list.unshift({ data, caption, t: Date.now() });
  while (list.length > MAX) list.pop();
  // if storage is full, drop the oldest photos until it fits
  for (let i = 0; i < 12; i++) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { if (list.length <= 1) return false; list.pop(); }
  }
  return false;
}

export function deletePhoto(t) {
  const list = loadPhotos().filter(p => p.t !== t);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// Grab the game canvas (without the HUD) as a small JPEG.
export function snapshot(game, cb, width = 520) {
  game.renderer.snapshot(img => {
    try {
      const k = width / img.width;
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      // warm "print" look + white border drawn by CSS later
      ctx.fillStyle = 'rgba(255,220,160,.08)'; ctx.fillRect(0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.78));
    } catch { cb(null); }
  }, 'image/png');
}
