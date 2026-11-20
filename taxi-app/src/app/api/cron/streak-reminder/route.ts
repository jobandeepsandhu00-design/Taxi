import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { pushConfigured, sendPushToUser } from "@/server/push";

/**
 * Täglicher Vercel-Cron: erinnert Nutzer mit laufender Serie, die heute noch nicht gelernt haben.
 * Geschützt über CRON_SECRET (Vercel sendet „Authorization: Bearer <CRON_SECRET>“).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ sent: 0, reason: "Push nicht eingerichtet" });
  const yesterday = dayKeyToDate(addDays(dayKey(), -1));
  const atRisk = await prisma.learningStreak.findMany({
    where: { currentStreak: { gt: 0 }, lastActiveDate: yesterday, user: { pushSubscriptions: { some: {} }, isActive: true } },
    select: { userId: true, currentStreak: true },
    take: 5000,
  });
  let sent = 0;
  for (const s of atRisk) {
    sent += await sendPushToUser(s.userId, {
      title: "Deine Serie ist in Gefahr! 🔥",
      body: `${s.currentStreak} ${s.currentStreak === 1 ? "Tag" : "Tage"} in Folge – ein paar Fragen heute halten sie am Leben.`,
      url: "/dashboard",
      tag: "tp-streak",
    });
  }
  return NextResponse.json({ checked: atRisk.length, sent });
}
