import { NextResponse, type NextRequest } from "next/server";
import { jobsForWindow, runJob } from "@/server/push-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel-Cron alle 15 Minuten. Wählt nach Wiener Ortszeit die fälligen Jobs:
 * tägliche Erinnerungen (immer), 19:30 Serie, 08:30 Challenge/Countdown, So 18:00 Wochenbericht.
 * `?job=daily|streak|morning|weekly` erzwingt einen Job. Geschützt über CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const forced = request.nextUrl.searchParams.get("job");
  const now = new Date();
  const jobs = forced ? [forced] : jobsForWindow(now);
  const results = [];
  for (const j of jobs) results.push(await runJob(j, now));
  return NextResponse.json({ results });
}
