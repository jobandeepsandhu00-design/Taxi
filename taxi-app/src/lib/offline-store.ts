/** Offline-Fragenpakete in IndexedDB (nur im Browser). */
export interface OfflineQuestion {
  id: string;
  text: string;
  explanation: string;
  multipleCorrect: boolean;
  origin: string;
  category: { name: string };
  options: { id: string; label: string; text: string; isCorrect: boolean }[];
}

export interface OfflinePack {
  slug: string;
  name: string;
  downloadedAt: string;
  questions: OfflineQuestion[];
}

const DB = "tp-offline";
const STORE = "packs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "slug" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const savePack = (p: OfflinePack) => tx("readwrite", (s) => s.put(p));
export const listPacks = () => tx<OfflinePack[]>("readonly", (s) => s.getAll() as IDBRequest<OfflinePack[]>);
export const deletePack = (slug: string) => tx("readwrite", (s) => s.delete(slug));
