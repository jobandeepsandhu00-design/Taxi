import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseKeyPoints } from "@/lib/oral";
import { rateLimit } from "@/lib/rate-limit";
import { coachConfigured, coachErrorMessage, parseCoach, UNSURE_SENTENCE } from "@/server/coach/llm";

export const maxDuration = 60;

const schema = z.object({ explanation: z.string() });

/** „Warum?“ zur mündlichen Antwort: erklärt fehlende Punkte nur anhand der Musterantwort. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const rl = rateLimit(`oral-why:${user.id}`, 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Bitte kurz warten." }, { status: 429 });
  const p = z.object({ attemptId: z.string().min(1).max(64) }).safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const a = await prisma.oralAttempt.findFirst({ where: { id: p.data.attemptId, userId: user.id }, include: { oralQuestion: true } });
  if (!a) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  if (!coachConfigured()) return NextResponse.json({ error: "Die KI ist noch nicht eingerichtet." }, { status: 503 });
  const q = a.oralQuestion;
  const points = parseKeyPoints(q.keyPoints);
  const missing = points.filter((k) => !a.coveredPointIds.includes(k.id));
  try {
    const out = await parseCoach({
      context: `Mündliche Taxi-Prüfung Wien. Erkläre nur anhand dieser Referenz:
Frage: ${q.questionDe}
Musterantwort: ${q.modelAnswerDe}${q.legalReference ? `\nRechtsquelle: ${q.legalReference}` : ""}`,
      prompt: `Die Antwort war: „${a.transcript || "(keine Antwort)"}“. Fehlende Kernpunkte: ${missing.map((m) => m.text).join("; ") || "keine"}.
Erkläre in 2–4 kurzen Sätzen (du-Form), warum diese Punkte wichtig sind und wie man sie sich merkt. Keine erfundenen Paragraphen oder Zahlen. Wenn die Referenz nicht reicht: „${UNSURE_SENTENCE}“`,
      schema,
      fake: () => ({ explanation: missing.length ? `Wichtig ist vor allem: ${missing.map((m) => m.text).join(", ")}. Merk dir die Reihenfolge aus der Musterantwort.` : "Du hast alle Kernpunkte genannt – super! Wiederhole die Antwort ab und zu laut." }),
      maxTokens: 1500,
    });
    return NextResponse.json({ explanation: out?.explanation ?? UNSURE_SENTENCE });
  } catch (err) {
    return NextResponse.json({ error: coachErrorMessage(err) }, { status: 502 });
  }
}
