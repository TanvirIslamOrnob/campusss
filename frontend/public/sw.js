// Minimal service worker: makes the app installable and keeps the shell available offline.
// It never caches API calls or uploads, so data is always fresh and private.
const CACHE = 'campusx-shell-v1';

self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE)); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/') || url.pathname.includes('/uploads/')) return;
  // Network first, fall back to whatever we saved last time.
  e.respondWith(
    fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match(new URL('./', self.registration.scope).href) : undefined)))
  );
});
