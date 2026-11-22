/** Push-Abstraktion im Browser. "web" jetzt; eine "native"-Variante (Capacitor/FCM/APNs) kann später dieselbe Schnittstelle erfüllen. */
import { platform, pushSupported } from "@/lib/platform";

export type PermissionState = "granted" | "denied" | "default" | "unsupported";

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function permission(): PermissionState {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await registration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), platform: platform() }) });
  return res.ok;
}

/** Muss aus einer Nutzeraktion heraus aufgerufen werden (Klick). */
export async function enablePush(vapidKey: string): Promise<{ ok: boolean; state: PermissionState; error?: string }> {
  if (!pushSupported()) return { ok: false, state: "unsupported" };
  const perm = (await Notification.requestPermission()) as PermissionState;
  if (perm !== "granted") return { ok: false, state: perm };
  try {
    const reg = await registration();
    if (!reg) return { ok: false, state: perm, error: "Service Worker nicht bereit – bitte Seite neu laden." };
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(vapidKey) });
    const ok = await save(sub);
    return ok ? { ok, state: perm } : { ok, state: perm, error: "Speichern fehlgeschlagen." };
  } catch {
    return { ok: false, state: perm, error: "Push konnte nicht aktiviert werden." };
  }
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}

/** Beim App-Start: Abo fehlt/geändert → neu anlegen bzw. erneut speichern (falls Erlaubnis besteht). */
export async function syncPush(vapidKey: string | null): Promise<void> {
  if (!vapidKey || permission() !== "granted") return;
  try {
    const reg = await registration();
    if (!reg) return;
    let sub = await reg.pushManager.getSubscription();
    const key = sub?.options.applicationServerKey;
    const expected = keyToBytes(vapidKey);
    const same = key && new Uint8Array(key).every((b, i) => b === expected[i]);
    if (sub && !same) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expected });
    const last = sessionStorage.getItem("tp-push-synced");
    if (last !== sub.endpoint) {
      if (await save(sub)) sessionStorage.setItem("tp-push-synced", sub.endpoint);
    }
  } catch {
    /* still ignorieren */
  }
}

/** App-Icon-Zähler (fällige Fragen), wo unterstützt */
export function setBadge(count: number) {
  const n = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) void n.setAppBadge?.(count).catch(() => undefined);
    else void n.clearAppBadge?.().catch(() => undefined);
  } catch {
    /* nicht unterstützt */
  }
}
