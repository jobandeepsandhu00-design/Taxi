/* TaxiFit – Service Worker
 * Precache: App-Hülle, Icons, Offline-Seite. Laufzeit:
 *  - Seiten: Network-First (Fallback: Cache → /offline)
 *  - API-GET (unkritisch): Stale-While-Revalidate
 *  - Bilder/Medien: Cache-First (begrenzt), Audio: eigener Offline-Cache
 * POST/Server-Actions werden nie gecacht – der Lernfortschritt landet immer in der Datenbank.
 * Update: neuer SW wartet, bis die App „skip-waiting“ schickt (Toast „Neue Version verfügbar“).
 */
const VERSION = "v-taxifit-3";
const AUDIO_CACHE = "tp-audio-v1";
const STATIC_CACHE = `tp-static-${VERSION}`;
const PAGE_CACHE = `tp-pages-${VERSION}`;
const API_CACHE = `tp-api-${VERSION}`;
const IMG_CACHE = "tp-img-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/badge-96.png",
  "/icons/apple-touch-icon.png",
];
const LIMITS = { [IMG_CACHE]: 150, [API_CACHE]: 60, [PAGE_CACHE]: 80 };
const API_SKIP = ["/api/push", "/api/cron", "/api/admin", "/api/audio/worker", "/api/coach", "/api/oral", "/api/health"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => {
      // Erste Installation: sofort aktiv. Updates warten auf die Bestätigung in der App.
      if (!self.registration.active) return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  const keep = [STATIC_CACHE, PAGE_CACHE, AUDIO_CACHE, API_CACHE, IMG_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name) {
  const max = LIMITS[name];
  if (!max) return;
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

function put(name, request, res) {
  if (!res || !res.ok || res.type === "opaque") return;
  const copy = res.clone();
  caches.open(name).then((c) => c.put(request, copy)).then(() => trim(name));
}

function cacheFirst(request, name) {
  return caches.match(request).then(
    (hit) =>
      hit ||
      fetch(request).then((res) => {
        put(name, request, res);
        return res;
      }),
  );
}

function staleWhileRevalidate(event, name) {
  const { request } = event;
  return caches.open(name).then((c) =>
    c.match(request).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          put(name, request, res);
          return res;
        })
        .catch(() => hit);
      if (hit) {
        event.waitUntil(net.catch(() => undefined));
        return hit;
      }
      return net;
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Vorproduzierte Audios: aus dem Offline-Cache, sonst Netz
  if (url.pathname.includes("/storage/v1/object/public/audio/") || url.pathname.startsWith("/api/audio/file/")) {
    event.respondWith(caches.open(AUDIO_CACHE).then((c) => c.match(request.url)).then((hit) => hit || fetch(request)));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/splash/") || url.pathname.startsWith("/screenshots/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/media/") || url.pathname.startsWith("/_next/image") || request.destination === "image") {
    event.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    if (API_SKIP.some((p) => url.pathname.startsWith(p)) || request.headers.has("range")) return;
    event.respondWith(staleWhileRevalidate(event, API_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected) put(PAGE_CACHE, request, res);
          return res;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) || (await caches.match(OFFLINE_URL))),
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "skip-waiting") {
    self.skipWaiting();
    return;
  }
  // Abmelden: personenbezogene Caches leeren
  if (data.type === "clear-user-caches") {
    event.waitUntil(Promise.all([caches.delete(PAGE_CACHE), caches.delete(API_CACHE)]));
    return;
  }
  // Offline-Pakete: Seiten gezielt zwischenspeichern
  if (data.type === "cache-urls" && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(PAGE_CACHE).then((c) =>
        Promise.all(data.urls.map((u) => fetch(u, { credentials: "same-origin" }).then((res) => res.ok && c.put(u, res)).catch(() => {}))),
      ),
    );
  }
});

// ── Push ────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "Zeit für eine kurze Lerneinheit!",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/badge-96.png",
    tag: data.tag || "tp-reminder",
    renotify: false,
    data: { url: data.url || "/dashboard", logId: data.logId || null },
  };
  if (data.image) options.image = data.image;
  if (Array.isArray(data.actions)) options.actions = data.actions.slice(0, 2);
  const tasks = [self.registration.showNotification(data.title || "TaxiFit", options)];
  if (typeof data.badgeCount === "number" && self.navigator.setAppBadge) tasks.push(self.navigator.setAppBadge(data.badgeCount).catch(() => {}));
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "later") return;
  const { url = "/dashboard", logId = null } = event.notification.data || {};
  const target = new URL(url, self.location.origin).href;
  event.waitUntil(
    Promise.all([
      logId ? fetch("/api/push/clicked", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ logId }) }).catch(() => {}) : null,
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
        const existing = list.find((c) => new URL(c.url).origin === self.location.origin);
        if (existing) {
          await existing.focus();
          return existing.navigate ? existing.navigate(target).catch(() => existing.postMessage({ type: "navigate", url })) : undefined;
        }
        return self.clients.openWindow(target);
      }),
    ]),
  );
});

// Abo wurde vom Browser erneuert → neu speichern (Sitzungs-Cookie wird mitgeschickt)
self.addEventListener("pushsubscriptionchange", (event) => {
  const old = event.oldSubscription;
  const key = old && old.options && old.options.applicationServerKey;
  event.waitUntil(
    (event.newSubscription ? Promise.resolve(event.newSubscription) : key ? self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : Promise.resolve(null)).then((sub) => {
      if (!sub) return;
      return fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), oldEndpoint: old ? old.endpoint : undefined }),
      }).catch(() => {});
    }),
  );
});
