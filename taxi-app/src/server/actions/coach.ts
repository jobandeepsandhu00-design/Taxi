"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** 👍/👎 zu einer Coach-Antwort speichern. */
export async function rateCoachMessageAction(messageId: string, value: 1 | -1 | 0): Promise<void> {
  const user = await requireUser();
  const v = z.union([z.literal(1), z.literal(-1), z.literal(0)]).parse(value);
  await prisma.coachMessage.updateMany({ where: { id: messageId, userId: user.id, role: "assistant" }, data: { feedback: v === 0 ? null : v } });
}

/** Tagesplan-Punkt manuell abhaken (zusätzlich zur automatischen Erkennung). */
export async function togglePlanItemAction(itemId: string): Promise<void> {
  const user = await requireUser();
  const { toggleManualDone } = await import("@/server/coach/plans");
  await toggleManualDone(user.id, z.string().min(1).max(80).parse(itemId));
}
