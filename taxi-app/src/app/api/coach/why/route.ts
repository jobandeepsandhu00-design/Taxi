import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isHelperLang } from "@/lib/languages";
import { coachQuota, LIMIT_REACHED } from "@/server/coach/limits";
import { coachConfigured, coachErrorMessage } from "@/server/coach/llm";
import { ndjsonResponse } from "@/server/coach/ndjson";
import { getAnswerKey } from "@/server/questions";
import { getOrCreateWhyWrong, getVariant, streamWhy, type WhyContent } from "@/server/variants";

export const maxDuration = 60;

const bodySchema = z.object({
  questionId: z.string().min(1).max(64),
  selectedOptionIds: z.array(z.string().max(64)).max(8),
  lang: z.string().max(8).optional(),
});

/**
 * „Warum?“ – Erklärung aus explanation_de + legal_reference der Frage (nie erfundene Paragraphen).
 * Zwischengespeichert in QuestionVariant (kind „why“ bzw. „why_wrong_{Buchstabe}“); nur Neuerzeugung zählt fürs Tageslimit.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const lang = parsed.data.lang && parsed.data.lang !== "de" && isHelperLang(parsed.data.lang) ? parsed.data.lang : "de";
  const { questionId, selectedOptionIds } = parsed.data;

  // Nur nach dem Beantworten (die Erklärung verrät die Lösung)
  // (im Lernbuch ist die Antwort bereits sichtbar → gelesene Karten zählen auch)
  const answered =
    (await prisma.userAnswer.findFirst({ where: { userId: user.id, questionId }, select: { id: true } })) ??
    (await prisma.readProgress.findFirst({ where: { userId: user.id, questionId }, select: { id: true } }));
  const key = await getAnswerKey(questionId);
  if (!key || !answered) return NextResponse.json({ error: "Frage nicht gefunden." }, { status: 404 });
  const chosenWrong = key.options.filter((o) => selectedOptionIds.includes(o.id) && !o.isCorrect);
  const wrongLabel = chosenWrong.length === 1 ? key.options.find((o) => o.id === chosenWrong[0].id)?.label : undefined;

  const cachedWhy = await getVariant<WhyContent>(questionId, "why", lang);
  const cachedWrong = wrongLabel ? await getVariant<WhyContent>(questionId, `why_wrong_${wrongLabel}`, lang) : null;
  const needsAi = !cachedWhy || (wrongLabel && !cachedWrong);
  let remaining: number | null = null;
  if (needsAi) {
    if (!coachConfigured()) return NextResponse.json({ error: "Der Coach ist noch nicht eingerichtet." }, { status: 503 });
    const quota = await coachQuota(user);
    if (quota.remaining <= 0) return NextResponse.json({ error: LIMIT_REACHED, limitReached: true }, { status: 429 });
    remaining = quota.unlimited ? null : quota.remaining - 1;
    await prisma.coachMessage.create({ data: { userId: user.id, kind: "why", role: "user", content: `Warum? (${questionId}, ${lang})` } });
  }

  return ndjsonResponse(async (send) => {
    if (cachedWhy) {
      send({ type: "meta", remaining, variantId: cachedWhy.id, cached: true, verified: cachedWhy.verified });
      send({ type: "delta", text: cachedWhy.content.text });
    } else {
      send({ type: "meta", remaining });
      try {
        const gen = streamWhy(questionId, lang);
        let step = await gen.next();
        while (!step.done) {
          send({ type: "delta", text: step.value });
          step = await gen.next();
        }
        if (step.value) send({ type: "meta", variantId: step.value.id, verified: false });
      } catch (err) {
        send({ type: "error", message: coachErrorMessage(err) });
        return;
      }
    }
    if (wrongLabel) {
      try {
        const w = cachedWrong ?? (await getOrCreateWhyWrong(questionId, wrongLabel, lang));
        if (w) send({ type: "extra", kind: "why_wrong", label: wrongLabel, text: w.content.text, variantId: w.id });
      } catch {
        /* optional – Erklärung oben reicht */
      }
    }
    send({ type: "done" });
  });
}
