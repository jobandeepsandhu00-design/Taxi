import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { publishedWhere } from "@/server/questions";

const bodySchema = z.object({
  questionId: z.string().min(1).max(64),
  selectedOptionIds: z.array(z.string().max(64)).max(8),
});

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * „Warum?“ ohne KI: Erklärung, Merkhilfe, Einfache Sprache und Rechtsquelle aus der Datenbank.
 * Fehlt eine echte Erklärung, wird die Frage für die Admin-Liste „Fehlende Erklärungen“ vorgemerkt.
 * Nur nach dem Beantworten bzw. Lesen der Karte (sonst würde die Lösung verraten).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const rl = rateLimit(`why:${user.id}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Kurz durchatmen – in ${rl.retryAfterSec} s geht’s weiter.` }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const { questionId, selectedOptionIds } = parsed.data;

  const answered =
    (await prisma.userAnswer.findFirst({ where: { userId: user.id, questionId }, select: { id: true } })) ??
    (await prisma.readProgress.findFirst({ where: { userId: user.id, questionId }, select: { id: true } }));
  const q = await prisma.question.findFirst({
    where: { id: questionId, ...publishedWhere },
    select: { explanation: true, mnemonic: true, simpleDe: true, sourceDetail: true, options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true, isCorrect: true, explanation: true } } },
  });
  if (!q || !answered) return NextResponse.json({ error: "Frage nicht gefunden." }, { status: 404 });

  const answer = q.options.filter((o) => o.isCorrect).map((o) => o.text).join("\n\n");
  const hasExplanation = Boolean(q.explanation?.trim()) && norm(q.explanation) !== norm(answer);
  if (!hasExplanation) {
    await prisma.missingExplanation
      .upsert({ where: { questionId }, create: { questionId }, update: { hits: { increment: 1 }, lastSeenAt: new Date() } })
      .catch(() => undefined);
  }
  const wrong = q.options.find((o) => selectedOptionIds.includes(o.id) && !o.isCorrect && o.explanation?.trim());
  return NextResponse.json({
    answer,
    explanation: hasExplanation ? q.explanation : null,
    mnemonic: q.mnemonic,
    simple: q.simpleDe,
    legal: q.sourceDetail,
    wrong: wrong ? { label: wrong.label, text: wrong.explanation } : null,
  });
}
