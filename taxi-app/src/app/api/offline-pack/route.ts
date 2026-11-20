import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { publishedWhere } from "@/server/questions";

/** Offline-Paket einer Kategorie (inkl. Lösungen, damit offline geübt werden kann). Nur für angemeldete Nutzer. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const slug = request.nextUrl.searchParams.get("kategorie");
  const category = slug ? await prisma.category.findFirst({ where: { slug, isActive: true }, select: { id: true, name: true, slug: true } }) : null;
  if (slug && !category) return NextResponse.json({ error: "Kategorie nicht gefunden" }, { status: 404 });
  const questions = await prisma.question.findMany({
    where: { ...publishedWhere, ...(category ? { categoryId: category.id } : {}) },
    take: 200,
    select: {
      id: true,
      text: true,
      explanation: true,
      multipleCorrect: true,
      origin: true,
      category: { select: { name: true } },
      options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true, isCorrect: true } },
    },
  });
  return NextResponse.json(
    { slug: category?.slug ?? "alle", name: category?.name ?? "Alle Kategorien", downloadedAt: new Date().toISOString(), questions },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
