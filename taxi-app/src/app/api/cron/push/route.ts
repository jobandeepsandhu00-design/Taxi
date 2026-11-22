import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { jobsForWindow, runJob } from "@/server/push-jobs";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Vercel-Cron (Bearer CRON_SECRET) oder Supabase pg_cron (x-cron-key aus der Tabelle internal_cron_key). */
async function authorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth && same(auth, `Bearer ${secret}`)) return true;
  const key = request.headers.get("x-cron-key");
  if (!key) return false;
  const row = await prisma.internalCronKey.findUnique({ where: { id: 1 } }).catch(() => null);
  return Boolean(row && same(key, row.key));
}

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Alle 15 Minuten (Supabase pg_cron → net.http_get). Wählt nach Wiener Ortszeit die fälligen Jobs:
 * tägliche Erinnerungen (immer), 19:30 Serie, 08:30 Challenge/Countdown, So 18:00 Wochenbericht.
 * `?job=daily|streak|morning|weekly` erzwingt einen Job. Geschützt über CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const forced = request.nextUrl.searchParams.get("job");
  const now = new Date();
  const jobs = forced ? [forced] : jobsForWindow(now);
  const results = [];
  for (const j of jobs) results.push(await runJob(j, now));
  return NextResponse.json({ results });
}
