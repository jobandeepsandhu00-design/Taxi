import "server-only";
import * as webpush from "web-push";
import { prisma } from "@/lib/db";
import { CAP_EXEMPT, DAILY_CAP, inQuietHours, localParts, QUIET_EXEMPT } from "@/lib/push/schedule";
import { pickText, type PushType } from "@/lib/push/texts";

export type PushAction = { action: string; title: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string; image?: string; actions?: PushAction[]; badgeCount?: number };
export type SendResult = { status: "sent" | "skipped" | "failed"; reason?: string; delivered: number };

const PUBLIC_KEY = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";

export function pushConfigured(): boolean {
  return Boolean(PUBLIC_KEY() && process.env.VAPID_PRIVATE_KEY);
}
export function vapidPublicKey(): string | null {
  return PUBLIC_KEY() || null;
}

let ready = false;
function init() {
  if (ready || !pushConfigured()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://taxi-pruefung.vercel.app", PUBLIC_KEY(), process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

/** Welche Einstellung schaltet welchen Typ? */
const PREF_FOR: Partial<Record<PushType, keyof PrefsRow>> = {
  daily: "dailyReminder",
  lernbuch: "dailyReminder",
  due: "dueAlerts",
  streak: "streakAlerts",
  challenge: "challengeAlerts",
  exam: "examCountdown",
  weekly: "weeklyReport",
  duel: "duelAlerts",
  story: "storyAlerts",
};
type PrefsRow = NonNullable<Awaited<ReturnType<typeof prisma.notificationPrefs.findUnique>>>;

export async function getPrefs(userId: string) {
  return (await prisma.notificationPrefs.findUnique({ where: { userId } })) ?? defaultPrefs(userId);
}
export function defaultPrefs(userId: string): PrefsRow {
  return {
    userId,
    enabled: true,
    dailyReminder: true,
    reminderTime: "18:00",
    streakAlerts: true,
    dueAlerts: true,
    challengeAlerts: true,
    duelAlerts: true,
    examCountdown: true,
    weeklyReport: true,
    storyAlerts: false,
    quietStart: "22:00",
    quietEnd: "08:00",
    timezone: "Europe/Vienna",
    updatedAt: new Date(0),
  };
}

/** Anfang des heutigen Tages (in der Zeitzone des Nutzers) als UTC-Zeitpunkt – grob, für das Tageslimit. */
function startOfLocalDay(now: Date, tz: string): Date {
  const { minutes } = localParts(now, tz);
  return new Date(now.getTime() - minutes * 60_000 - now.getUTCSeconds() * 1000);
}

/** Text passend zum Typ wählen – nie derselbe wie zuletzt. */
export async function composeText(userId: string, type: PushType, vars: Record<string, string | number>) {
  const last = await prisma.notificationLog.findFirst({ where: { userId, type, status: "sent" }, orderBy: { sentAt: "desc" }, select: { body: true } });
  return pickText(type, vars, last?.body);
}

/**
 * Sendet an alle aktiven Geräte eines Nutzers. Beachtet Einstellungen, Ruhezeiten und das Tageslimit (2/Tag; Duelle ausgenommen).
 * 404/410 → Abo deaktivieren, 5xx → ein Wiederholungsversuch. Alles wird in notification_log protokolliert.
 */
export async function sendToUser(userId: string, type: PushType, payload: PushPayload, opts: { now?: Date; ignorePrefs?: boolean } = {}): Promise<SendResult> {
  if (!pushConfigured()) return { status: "skipped", reason: "not-configured", delivered: 0 };
  const now = opts.now ?? new Date();
  const subs = await prisma.pushSubscription.findMany({ where: { userId, active: true } });
  if (!subs.length) return { status: "skipped", reason: "no-subscription", delivered: 0 };

  if (!opts.ignorePrefs) {
    const prefs = await getPrefs(userId);
    if (!prefs.enabled) return { status: "skipped", reason: "disabled", delivered: 0 };
    const key = PREF_FOR[type];
    if (key && !prefs[key]) return { status: "skipped", reason: "type-off", delivered: 0 };
    if (!QUIET_EXEMPT.has(type) && inQuietHours(localParts(now, prefs.timezone).minutes, prefs.quietStart, prefs.quietEnd)) return { status: "skipped", reason: "quiet", delivered: 0 };
    if (!CAP_EXEMPT.has(type)) {
      const today = await prisma.notificationLog.count({ where: { userId, status: "sent", sentAt: { gte: startOfLocalDay(now, prefs.timezone) }, type: { notIn: [...CAP_EXEMPT] } } });
      if (today >= DAILY_CAP) return { status: "skipped", reason: "cap", delivered: 0 };
    }
  }

  init();
  const log = await prisma.notificationLog.create({ data: { userId, type, title: payload.title.slice(0, 120), body: payload.body.slice(0, 300), url: payload.url?.slice(0, 300), status: "failed", sentAt: now } });
  const data = JSON.stringify({ ...payload, tag: payload.tag ?? `tp-${type}`, url: payload.url ?? "/dashboard", logId: log.id });
  let delivered = 0;
  for (const s of subs) {
    const target = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        await webpush.sendNotification(target, data, { TTL: 60 * 60 * 6, urgency: type === "duel" ? "high" : "normal", topic: (payload.tag ?? type).replace(/[^\w-]/g, "").slice(0, 32) || undefined });
        ok = true;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode ?? 0;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.update({ where: { id: s.id }, data: { active: false } }).catch(() => undefined);
          break;
        }
        if (code < 500) break;
      }
    }
    if (ok) {
      delivered++;
      await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastSuccessAt: now, failedCount: 0 } }).catch(() => undefined);
    } else {
      await prisma.pushSubscription
        .update({ where: { id: s.id }, data: { failedCount: { increment: 1 }, ...(s.failedCount + 1 >= 5 ? { active: false } : {}) } })
        .catch(() => undefined);
    }
  }
  await prisma.notificationLog.update({ where: { id: log.id }, data: { status: delivered ? "sent" : "failed" } });
  return { status: delivered ? "sent" : "failed", delivered };
}

/** Kompatibilität (ältere Aufrufer): sendet ohne Typprüfung. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  return (await sendToUser(userId, "test", payload, { ignorePrefs: true })).delivered;
}
