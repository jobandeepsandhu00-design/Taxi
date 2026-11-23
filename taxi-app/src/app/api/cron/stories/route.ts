import { NextResponse, type NextRequest } from "next/server";
import { ensureDaily } from "@/server/stories/daily";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Täglich ~05:00 Wien: Tagesauswahl für Stories (Tipp, Wien-Ort, Regel, Zahl). Geschützt über CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  return NextResponse.json(await ensureDaily());
}
