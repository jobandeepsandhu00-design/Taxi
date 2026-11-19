"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

/** Markiert Freischaltungen als angezeigt (nach der Feier-Animation). */
export async function markAchievementsSeenAction(keys: string[]): Promise<void> {
  const user = await requireUser();
  const parsed = z.array(z.string().min(1).max(60)).max(20).safeParse(keys);
  if (!parsed.success || parsed.data.length === 0) return;
  await prisma.userAchievement.updateMany({ where: { userId: user.id, key: { in: parsed.data }, seenAt: null }, data: { seenAt: new Date() } });
}
