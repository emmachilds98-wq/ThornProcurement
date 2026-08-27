const CACHE = 'thornprocurement-v2';
const ASSETS = ['./', './index.html', './thornprocurement-icon.png', './manifest.webmanifest'];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

/* The handbook itself is fetched network-first, with { cache: 'reload' } so
   the browser's own HTTP cache can't hand back a stale copy in between — a
   published update is read straight away, with the cached copy kept as the
   offline fallback. Everything else (icon, manifest) is cache-first — it
   rarely changes and should be instant. */
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const wantsPage = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (wantsPage) {
    event.respondWith(
      fetch(request, { cache: 'reload' }).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
