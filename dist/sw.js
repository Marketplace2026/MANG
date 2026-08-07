// Service Worker MANG - Nettoyage automatique des caches obsolètes
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Contournement direct réseau sans blocage de cache statique
  event.respondWith(fetch(event.request));
});
