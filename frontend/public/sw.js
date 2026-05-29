const CACHE = 'salestrack-v3';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
];

// --- Background location tracking ---
let trackingInterval = null;
let apiUrl = '';
let authToken = '';

self.addEventListener('message', (e) => {
  const { type, data } = e.data;

  if (type === 'START_TRACKING') {
    apiUrl = data.apiUrl;
    authToken = data.token;
    startBackgroundTracking();
  }

  if (type === 'STOP_TRACKING') {
    stopBackgroundTracking();
  }

  if (type === 'UPDATE_POSITION') {
    // Main page sends position updates to SW for background pinging
    lastPosition = data;
  }

  if (type === 'UPDATE_TOKEN') {
    authToken = data.token;
  }
});

let lastPosition = null;

function startBackgroundTracking() {
  if (trackingInterval) return;

  // Show persistent notification (ongoing-style)
  self.registration.showNotification('SalesTrack - On Duty', {
    body: 'Location tracking is active. Tap to open app.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'duty-tracking',
    renotify: true, // Vibrate/alert again (keeps it alive)
    requireInteraction: true, // Cannot be auto-dismissed
    silent: true,
  });

  // Ping server every 10 seconds with last known position
  trackingInterval = setInterval(async () => {
    if (!lastPosition || !apiUrl || !authToken) return;
    try {
      await fetch(`${apiUrl}/api/location/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(lastPosition),
      });
    } catch {}

    // Re-show notification every 2 minutes to keep SW alive
  }, 10000);

  // Re-show notification periodically to prevent Android from killing SW
  self.keepAliveInterval = setInterval(() => {
    self.registration.showNotification('SalesTrack - On Duty', {
      body: 'Location tracking is active. Tap to open app.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'duty-tracking', // Same tag = replaces existing (no spam)
      renotify: false,
      requireInteraction: true,
      silent: true,
    });
  }, 120000); // Every 2 minutes
}

function stopBackgroundTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (self.keepAliveInterval) {
    clearInterval(self.keepAliveInterval);
    self.keepAliveInterval = null;
  }
  lastPosition = null;
  // Close the tracking notification
  self.registration.getNotifications({ tag: 'duty-tracking' }).then((notifications) => {
    notifications.forEach((n) => n.close());
  });
}

// Handle notification click
self.addEventListener('notificationclick', (e) => {
  const tag = e.notification.tag;
  e.notification.close();

  if (tag === 'duty-tracking') {
    // Open the app to salesman map
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/salesman/map');
        }
      })
    );
    return;
  }

  // Default — open app home
  e.waitUntil(self.clients.openWindow('/'));
});

// --- Standard PWA caching ---
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push notifications (non-tracking)
self.addEventListener('push', (e) => {
  let data = { title: 'SalesTrack', body: 'New notification' };
  try { data = e.data.json(); } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-512.png',
      badge: '/icon-192.png',
    })
  );
});
