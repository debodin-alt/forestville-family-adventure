// Offline support. Bump CACHE when shipping changes that must replace cached files immediately;
// otherwise files refresh in the background (stale-while-revalidate) and show on the next launch.
const CACHE = 'forestville-v6-1';
const CORE = [
  './', './index.html', './styles/game.css', './manifest.webmanifest',
  './vendor/phaser-3.90.0.min.js', './src/main.js',
  './assets/icons/icon-180.png', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
    // warm the cache with baked art for every map (in the background)
    try {
      const res = await fetch('./assets/baked/manifest.json', { cache: 'no-cache' });
      if (res.ok) {
        const m = await res.json(); const c = await caches.open(CACHE);
        await c.put('./assets/baked/manifest.json', res.clone());
        for (const f of m.files) { const u = `./assets/baked/${f.file}`; if (!(await c.match(u))) { try { await c.add(u); } catch { /* keep going */ } } }
      }
    } catch { /* offline during activate: fine */ }
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: req.url.includes('manifest.json') });
    const network = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (isPage) return (await network) || cached || (await cache.match('./index.html'));
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
