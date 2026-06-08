self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const LOGO = '/icon-192.png';
  event.waitUntil(
    self.registration.showNotification(data.title || 'ScaleUp', {
      body: data.body || 'Nova notificação',
      icon: data.icon || LOGO,
      badge: LOGO,
      image: data.image || LOGO,
      vibrate: [200, 100, 200],
      tag: data.tag,
      data,
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const c of wins) {
        if ('focus' in c) { try { c.navigate(url); } catch {} return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
