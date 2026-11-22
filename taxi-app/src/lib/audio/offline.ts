"use client";

/** Offline-Audio: Dateien in Cache Storage („tp-audio-v1“) – der Service Worker liefert sie von dort aus. */
export const AUDIO_CACHE = "tp-audio-v1";

function cachesAvailable() {
  return typeof window !== "undefined" && "caches" in window;
}

export async function isCached(url: string): Promise<boolean> {
  if (!cachesAvailable()) return false;
  try {
    const c = await caches.open(AUDIO_CACHE);
    return Boolean(await c.match(url));
  } catch {
    return false;
  }
}

/** Mehrere Dateien herunterladen (max. 4 gleichzeitig) mit Fortschritt. Gibt die Größe in Bytes zurück. */
export async function cacheAudioUrls(urls: string[], onProgress?: (done: number, total: number) => void): Promise<number> {
  if (!cachesAvailable()) return 0;
  const c = await caches.open(AUDIO_CACHE);
  const list = Array.from(new Set(urls.filter(Boolean)));
  let done = 0;
  let bytes = 0;
  const queue = [...list];
  async function worker() {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      try {
        const hit = await c.match(url);
        if (hit) {
          bytes += Number(hit.headers.get("content-length") ?? 0) || (await hit.clone().blob()).size;
        } else {
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) {
            const blob = await res.clone().blob();
            bytes += blob.size;
            await c.put(url, res);
          }
        }
      } catch {
        /* einzelne Datei überspringen */
      }
      done++;
      onProgress?.(done, list.length);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return bytes;
}

/** Wie viele der URLs liegen schon offline vor? */
export async function cachedCount(urls: string[]): Promise<number> {
  if (!cachesAvailable() || urls.length === 0) return 0;
  const c = await caches.open(AUDIO_CACHE);
  const hits = await Promise.all(urls.map((u) => c.match(u)));
  return hits.filter(Boolean).length;
}

export async function audioCacheInfo(): Promise<{ files: number; bytes: number }> {
  if (!cachesAvailable()) return { files: 0, bytes: 0 };
  const c = await caches.open(AUDIO_CACHE);
  const keys = await c.keys();
  let bytes = 0;
  for (const k of keys) {
    const r = await c.match(k);
    if (r) bytes += Number(r.headers.get("content-length") ?? 0) || (await r.clone().blob()).size;
  }
  return { files: keys.length, bytes };
}

export async function clearAudioCache(): Promise<void> {
  if (cachesAvailable()) await caches.delete(AUDIO_CACHE);
}

export function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("de-AT", { maximumFractionDigits: 1 })} MB`;
}
