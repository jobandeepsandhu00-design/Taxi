import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pushConfigured } from "@/lib/push/send";

export const runtime = "nodejs";

const schema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  }),
  platform: z.enum(["ios", "android", "desktop"]).optional(),
  oldEndpoint: z.string().url().max(1000).optional(),
});

/** Abo speichern/aktualisieren (auch aus dem Service Worker bei pushsubscriptionchange). */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Push-Erinnerungen sind noch nicht eingerichtet." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiges Abo." }, { status: 400 });
  const { subscription, platform, oldEndpoint } = parsed.data;
  const ua = request.headers.get("user-agent")?.slice(0, 300) ?? null;
  if (oldEndpoint && oldEndpoint !== subscription.endpoint) await prisma.pushSubscription.updateMany({ where: { endpoint: oldEndpoint, userId: user.id }, data: { active: false } });
  const data = { userId: user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, platform: platform ?? null, userAgent: ua, active: true, failedCount: 0 };
  await prisma.pushSubscription.upsert({ where: { endpoint: subscription.endpoint }, create: { endpoint: subscription.endpoint, ...data }, update: data });
  await prisma.notificationPrefs.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
