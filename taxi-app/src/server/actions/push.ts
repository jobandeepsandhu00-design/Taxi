"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pushConfigured, sendPushToUser } from "@/server/push";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscriptionAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Push-Erinnerungen sind noch nicht eingerichtet." };
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültiges Abo." };
  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  await sendPushToUser(user.id, { title: "Erinnerungen aktiv 🚕", body: "Wir melden uns, wenn deine Lernserie in Gefahr ist.", tag: "tp-welcome" });
  return { ok: true };
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<void> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
}
