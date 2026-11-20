import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { ensureDailyPlan, getWeeklyReport } from "@/server/coach/plans";

export const maxDuration = 300;

/**
 * Täglicher Vercel-Cron (morgens, Wiener Zeit): Tagespläne für aktive Nutzer erzeugen,
 * sonntags zusätzlich die Wochenberichte. Geschützt über CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const today = dayKey();
  const since = dayKeyToDate(addDays(today, -14));
  const users = await prisma.user.findMany({
    where: { isActive: true, role: "STUDENT", dailyActivity: { some: { date: { gte: since } } } },
    select: { id: true },
    take: 2000,
  });
  const sunday = dayKeyToDate(today).getUTCDay() === 0;
  let plans = 0;
  let reports = 0;
  for (const u of users) {
    try {
      await ensureDailyPlan(u.id);
      plans++;
      if (sunday) {
        await getWeeklyReport(u.id);
        reports++;
      }
    } catch (e) {
      console.error("Coach-Cron: Fehler bei Nutzer", u.id, e);
    }
  }
  return NextResponse.json({ users: users.length, plans, reports, sunday });
}
