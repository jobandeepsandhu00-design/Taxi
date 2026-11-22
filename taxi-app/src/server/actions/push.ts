"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isValidHm } from "@/lib/push/schedule";
import { pushConfigured, sendToUser } from "@/lib/push/send";
import { pickText } from "@/lib/push/texts";

const hm = z.string().refine(isValidHm, "Ungültige Uhrzeit");
const prefsSchema = z.object({
  enabled: z.boolean(),
  dailyReminder: z.boolean(),
  reminderTime: hm,
  streakAlerts: z.boolean(),
  dueAlerts: z.boolean(),
  challengeAlerts: z.boolean(),
  duelAlerts: z.boolean(),
  examCountdown: z.boolean(),
  weeklyReport: z.boolean(),
  quietStart: hm,
  quietEnd: hm,
  timezone: z.string().max(40).optional(),
});

export async function saveNotificationPrefsAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Einstellungen." };
  const data = { ...parsed.data };
  if (data.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: data.timezone });
    } catch {
      data.timezone = "Europe/Vienna";
    }
  }
  await prisma.notificationPrefs.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath("/profil/benachrichtigungen");
  return { ok: true };
}

export async function sendTestPushAction(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Push ist auf dem Server noch nicht eingerichtet." };
  const t = pickText("test", {});
  const r = await sendToUser(user.id, "test", { ...t, url: "/profil/benachrichtigungen", actions: [{ action: "open", title: "Öffnen" }] });
  if (r.status === "sent") return { ok: true };
  return { ok: false, error: r.reason === "no-subscription" ? "Auf diesem Konto ist noch kein Gerät angemeldet." : "Senden fehlgeschlagen – bitte Benachrichtigungen neu aktivieren." };
}

export async function removeDeviceAction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/profil/benachrichtigungen");
}

/** Kompatibilität (alter Schalter) */
export async function deletePushSubscriptionAction(endpoint: string): Promise<void> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
}
