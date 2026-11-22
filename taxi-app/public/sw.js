/* TaxiFit – Service Worker
 * Strategie: statische Assets cache-first, Seiten network-first mit Offline-Fallback.
 * API-/Server-Action-Anfragen (POST) werden nie gecacht – Lernfortschritt wird immer in der Datenbank gespeichert.
 */
const VERSION = "v-taxifit-2";
const AUDIO_CACHE = "tp-audio-v1";
const STATIC_CACHE = `tp-static-${VERSION}`;
const PAGE_CACHE = `tp-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGE_CACHE, AUDIO_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Vorproduzierte Audios (Supabase Storage oder lokal): aus dem Offline-Cache, sonst Netz
  if (url.pathname.includes("/storage/v1/object/public/audio/") || url.pathname.startsWith("/api/audio/file/")) {
    event.respondWith(caches.open(AUDIO_CACHE).then((c) => c.match(request.url)).then((hit) => hit || fetch(request)));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/media/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/api/media/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL))),
    );
  }
});

// Offline-Pakete: Seiten gezielt für die Offline-Nutzung zwischenspeichern
self.addEventListener("message", (event) => {
  if (event.data?.type === "cache-urls" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(PAGE_CACHE).then((c) =>
        Promise.all(event.data.urls.map((u) => fetch(u, { credentials: "same-origin" }).then((res) => res.ok && c.put(u, res)).catch(() => {}))),
      ),
    );
  }
});

// Push-Erinnerungen (z. B. „Deine Serie ist in Gefahr!“)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "TaxiFit", {
      body: data.body || "Zeit für eine kurze Lerneinheit!",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "tp-reminder",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
