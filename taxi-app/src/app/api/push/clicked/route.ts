import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** Vom Service Worker: Benachrichtigung wurde angetippt (Log-ID ist eine nicht erratbare CUID). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { logId?: unknown } | null;
  const id = typeof body?.logId === "string" && /^c[a-z0-9]{20,30}$/.test(body.logId) ? body.logId : null;
  if (id) await prisma.notificationLog.updateMany({ where: { id, clickedAt: null }, data: { clickedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
