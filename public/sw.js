const CACHE_NAME = 'mang-cache-v4-' + Date.now();
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)))); self.clients.claim(); });
self.addEventListener('fetch', e => { if (e.request.url.includes('/api') || e.request.url.includes('/messages')) return e.respondWith(fetch(e.request)); e.respondWith(fetch(e.request).catch(() => caches.match(e.request))) });
