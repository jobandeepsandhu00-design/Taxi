import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { coachQuota, LIMIT_REACHED } from "@/server/coach/limits";
import { coachConfigured, coachErrorMessage, streamCoach, UNSURE_SENTENCE } from "@/server/coach/llm";
import { ndjsonResponse } from "@/server/coach/ndjson";
import { getAnswerKey } from "@/server/questions";

export const maxDuration = 60;

const bodySchema = z.object({ questionId: z.string().min(1).max(64), selectedOptionIds: z.array(z.string().max(64)).max(8) });

/** „Warum?“ nach einer falschen Antwort – Quelle ausschließlich Erklärung + Rechtsquelle der Frage. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!coachConfigured()) return NextResponse.json({ error: "Der Coach ist noch nicht eingerichtet." }, { status: 503 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const quota = await coachQuota(user);
  if (quota.remaining <= 0) return NextResponse.json({ error: LIMIT_REACHED, limitReached: true }, { status: 429 });
  // Nur erlauben, wenn die Person diese Frage tatsächlich beantwortet hat (Lösung wird sonst nicht verraten)
  const answered = await prisma.userAnswer.findFirst({ where: { userId: user.id, questionId: parsed.data.questionId }, select: { id: true } });
  const key = await getAnswerKey(parsed.data.questionId);
  if (!key || !answered) return NextResponse.json({ error: "Frage nicht gefunden." }, { status: 404 });
  const q = await prisma.question.findUniqueOrThrow({ where: { id: key.id }, select: { text: true, explanation: true, sourceDetail: true, options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true, isCorrect: true, explanation: true } } } });

  const chosen = q.options.filter((o) => parsed.data.selectedOptionIds.includes(o.id));
  const correct = q.options.filter((o) => o.isCorrect);
  const source = `Frage: ${q.text}\nAntwortmöglichkeiten:\n${q.options.map((o) => `${o.label}) ${o.text}${o.isCorrect ? " [richtig]" : ""}${o.explanation ? ` – ${o.explanation}` : ""}`).join("\n")}\nGewählt: ${chosen.map((o) => o.label).join(", ") || "–"}\nErklärung (explanation_de): ${q.explanation}\nRechtsquelle (legal_reference): ${q.sourceDetail ?? "keine angegeben"}`;
  const instruction = `Erkläre, warum die gewählte Antwort falsch und ${correct.map((o) => o.label).join(", ")} richtig ist.
Format genau so:
1) 2–4 Sätze zur Regel.
2) Eine Zeile „Beispiel aus dem Alltag: …“ (ein konkretes Taxi-Alltagsbeispiel).
3) Eine Zeile „Rechtsgrundlage: …“ – nur die angegebene Rechtsquelle wörtlich; falls keine angegeben ist: „Rechtsgrundlage: ${UNSURE_SENTENCE}“
Verwende als Quelle ausschließlich die Erklärung und Rechtsquelle oben. Erfinde keine Paragraphen.`;
  await prisma.coachMessage.create({ data: { userId: user.id, kind: "why", role: "user", content: `Warum? (${key.id})` } });

  const fake = () =>
    `${q.explanation.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ")}\nBeispiel aus dem Alltag: Stell dir vor, ein Fahrgast fragt dich genau das während der Fahrt – mit dieser Regel bist du auf der sicheren Seite.\nRechtsgrundlage: ${q.sourceDetail ?? UNSURE_SENTENCE}`;

  return ndjsonResponse(async (send) => {
    send({ type: "meta", remaining: quota.unlimited ? null : quota.remaining - 1 });
    let full = "";
    try {
      for await (const chunk of streamCoach({ context: `Quelle (nur diese verwenden):\n${source}`, messages: [{ role: "user", content: instruction }], fake, maxTokens: 2000 })) {
        full += chunk;
        send({ type: "delta", text: chunk });
      }
    } catch (err) {
      send({ type: "error", message: coachErrorMessage(err) });
    }
    const saved = full ? await prisma.coachMessage.create({ data: { userId: user.id, kind: "why", role: "assistant", content: full } }) : null;
    send({ type: "done", messageId: saved?.id });
  });
}
