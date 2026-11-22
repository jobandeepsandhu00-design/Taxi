import { NextResponse, type NextRequest } from "next/server";
import { runJob } from "@/server/push-jobs";

export const runtime = "nodejs";

/** Älterer Cron-Pfad: führt den Serien-Check aus (jetzt über /api/cron/push geplant). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  return NextResponse.json(await runJob("streak"));
}
