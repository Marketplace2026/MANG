const CACHE_NAME = 'mang-v2.1.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx', 
  '/src/index.css',
  '/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});

// NOUVEAU: Écouteur pour recevoir la notification Web Push
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'MANG Africa';
    const options = {
      body: data.body || 'Vous avez une nouvelle notification',
      icon: data.icon || '/logo-mang.png.jpg',
      badge: '/logo-mang.png.jpg',
      data: data.url || '/',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// NOUVEAU: Écouteur pour le clic sur la notification
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Si l'app est déjà ouverte, on la met au premier plan et on navigue
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
