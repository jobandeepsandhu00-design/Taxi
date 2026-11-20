import "server-only";
import * as webpush from "web-push";
import { prisma } from "@/lib/db";

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

let ready = false;
function init() {
  if (ready || !pushConfigured()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://taxi-pruefung.vercel.app", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

/** Sendet eine Benachrichtigung an alle Geräte eines Nutzers; abgelaufene Abos werden entfernt. */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }): Promise<number> {
  if (!pushConfigured()) return 0;
  init();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 6 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
    }
  }
  return sent;
}
