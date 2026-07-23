// WITHIN Cohort Log service worker.
//
// Plain, dependency-free JS served as a static file at the origin root
// (`/sw.js`) so it can control the whole app. Responsibilities:
//   - cache the app shell (`/today`) so the installed PWA still opens when
//     offline;
//   - handle Web Push notifications and notification clicks.
//
// Deliberately conservative: the fetch handler only ever intervenes for
// same-origin GET navigations. Everything else (API calls, server-action
// POSTs, static assets, cross-origin requests) is left untouched so a bug
// here cannot break online behavior.

const CACHE_VERSION = 'within-cohort-v1';
const SHELL_PATH = '/today';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_VERSION);
        const response = await fetch(SHELL_PATH, { credentials: 'same-origin' });
        // Only cache a real, successful load of the shell. If the browser
        // has no session yet, this request 30x-redirects to /login and
        // `response.redirected` is true; skip caching that so the offline
        // fallback never serves the login page in place of the shell.
        if (response.ok && !response.redirected) {
          await cache.put(SHELL_PATH, response);
        }
      } catch {
        // No network at install time (or some other failure): precaching
        // is best-effort. The fetch handler will try again to populate the
        // cache the next time `/today` loads successfully online.
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle same-origin GET navigations (a real page load, not a
  // fetch()/XHR call). API routes, server actions, static assets, and any
  // cross-origin request fall through to default browser handling.
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return;
  }
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // Keep the offline shell fresh on every successful, real (non-
        // redirected) load of it.
        if (response.ok && !response.redirected && requestUrl.pathname === SHELL_PATH) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(SHELL_PATH, response.clone()).catch(() => {});
        }
        return response;
      } catch (networkError) {
        // Offline, or the network request otherwise failed: fall back to
        // the cached shell so the installed app still opens. If nothing is
        // cached yet, let the browser show its normal offline error.
        const cache = await caches.open(CACHE_VERSION);
        const shellResponse = await cache.match(SHELL_PATH);
        if (shellResponse) return shellResponse;
        throw networkError;
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  let title = 'WITHIN Cohort Log';
  let body = 'You have a new update.';

  if (event.data) {
    try {
      const payload = event.data.json();
      if (typeof payload.title === 'string' && payload.title.trim()) {
        title = payload.title;
      }
      if (typeof payload.body === 'string' && payload.body.trim()) {
        body = payload.body;
      }
    } catch {
      const text = event.data.text();
      if (text) body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/today' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/today';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = allClients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
