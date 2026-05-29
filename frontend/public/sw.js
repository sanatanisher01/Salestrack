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

  // Show persistent notification
  self.registration.showNotification('SalesTrack - On Duty', {
    body: 'Location tracking is active',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'duty-tracking',
    requireInteraction: true,
    silent: true,
    actions: [{ action: 'stop', title: 'End Duty' }],
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
  }, 10000);
}

function stopBackgroundTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  lastPosition = null;
  // Close the tracking notification
  self.registration.getNotifications({ tag: 'duty-tracking' }).then((notifications) => {
    notifications.forEach((n) => n.close());
  });
}

// Handle notification actions
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'stop') {
    // User clicked "End Duty" on notification
    stopBackgroundTracking();
    // Tell the main page to end duty
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'END_DUTY' }));
    });
    return;
  }

  // Default click — open the app
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/salesman/map');
      }
    })
  );
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
