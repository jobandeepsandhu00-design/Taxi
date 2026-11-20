import "server-only";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";

export const FREE_DAILY_COACH_MESSAGES = 30;

/** Tageslimit: 30 Coach-Anfragen für Free-Nutzer, unbegrenzt für Premium und Admins. */
export async function coachQuota(user: { id: string; role: string }): Promise<{ unlimited: boolean; used: number; remaining: number; limit: number }> {
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { isPremium: true } });
  const unlimited = Boolean(u?.isPremium) || user.role === "ADMIN";
  const used = await prisma.coachMessage.count({ where: { userId: user.id, role: "user", createdAt: { gte: dayKeyToDate(dayKey()) } } });
  return { unlimited, used, remaining: unlimited ? Infinity : Math.max(0, FREE_DAILY_COACH_MESSAGES - used), limit: FREE_DAILY_COACH_MESSAGES };
}

export const LIMIT_REACHED = `Du hast heute alle ${FREE_DAILY_COACH_MESSAGES} Coach-Nachrichten verbraucht. Morgen geht's weiter – oder hol dir Premium für unbegrenzte Nachrichten. 🚕`;
