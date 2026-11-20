"use client";

/** Kleiner IndexedDB-Speicher für den Fokus-Modus (Stand einer Sitzung, überlebt Neuladen/App-Wechsel). */
export interface FocusSnapshot {
  index: number;
  flags: string[];
  selected: Record<string, string[]>;
  at: number;
}

const DB = "taxifit";
const STORE = "focus";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshot(id: string): Promise<FocusSnapshot | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as FocusSnapshot) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveSnapshot(id: string, snap: FocusSnapshot): Promise<void> {
  try {
    const db = await open();
    db.transaction(STORE, "readwrite").objectStore(STORE).put(snap, id);
  } catch {
    /* ohne IndexedDB (privater Modus) – Server hält den Stand */
  }
}

export async function clearSnapshot(id: string): Promise<void> {
  try {
    const db = await open();
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
  } catch {
    /* ignorieren */
  }
}
