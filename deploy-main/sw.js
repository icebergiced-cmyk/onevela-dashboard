/* Service Worker — แดชบอร์ดต้นทุนบ้าน วันเวลา
   Strategy:
   - HTML/JSON: network-first (เพื่อให้ได้ข้อมูลใหม่เสมอเมื่อมีเน็ต)
   - Static assets (icon, manifest): cache-first
   - Fonts (googleapis): cache-first
   - Offline fallback: ใช้ cache ล่าสุดของ index.html
*/

const VERSION = 'v3.5.4';
const CACHE_NAME = `wanwela-dashboard-${VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

/* Install: precache shell */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Precache partial fail:', err);
      })
    )
  );
});

/* Activate: cleanup old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: network-first for HTML, cache-first for static */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' ||
                 req.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    /* Network-first: ดึงเน็ต ถ้าไม่ได้ใช้ cache */
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    /* Cache-first สำหรับ static */
    event.respondWith(
      caches.match(req).then((cached) => {
        return cached || fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});
