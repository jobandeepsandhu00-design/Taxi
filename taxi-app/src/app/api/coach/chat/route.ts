import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { buildCoachContext, contextToPrompt, type CoachContext } from "@/server/coach/context";
import { coachQuota, LIMIT_REACHED } from "@/server/coach/limits";
import { coachConfigured, coachErrorMessage, streamCoach, UNSURE_SENTENCE, type CoachMessageParam } from "@/server/coach/llm";
import { ndjsonResponse } from "@/server/coach/ndjson";
import { retrieveQuestions, type RetrievedQuestion } from "@/server/coach/retrieval";

export const maxDuration = 60;

const bodySchema = z.object({ message: z.string().trim().min(1).max(1000) });

/** Antwort im Testmodus (ohne API) – nutzt echte Daten, damit die Oberfläche realistisch getestet werden kann. */
function fakeAnswer(message: string, ctx: CoachContext, cites: RetrievedQuestion[]): string {
  const m = message.toLowerCase();
  if (m.includes("heute")) {
    const weakest = [...ctx.categories].sort((a, b) => a.masteredPct - b.masteredPct)[0];
    return `Servus ${ctx.name}! Heute würde ich so vorgehen:\n- ${ctx.leitner.dueToday} fällige Wiederholungen erledigen\n- 10 Fragen zu „${weakest?.name ?? "deiner schwächsten Kategorie"}“\n- zum Abschluss die Daily Challenge`;
  }
  if (m.includes("wie stehe")) return `Du hast ${Math.round(ctx.prognosis.coverage * 100)} % der Fragen gemeistert, deine Serie liegt bei ${ctx.streak} Tagen. Weiter so!`;
  if (cites.length) return `Dazu habe ich ${cites.length} passende Fragen gefunden. Kurz zusammengefasst: ${cites[0].explanation.slice(0, 160)}`;
  return `Dazu finde ich in deinen Lernunterlagen nichts Passendes. ${UNSURE_SENTENCE}`;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!coachConfigured()) return NextResponse.json({ error: "Der Coach ist noch nicht eingerichtet." }, { status: 503 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Nachricht." }, { status: 400 });
  const quota = await coachQuota(user);
  if (quota.remaining <= 0) return NextResponse.json({ error: LIMIT_REACHED, limitReached: true }, { status: 429 });

  const message = parsed.data.message;
  const [ctx, cites, history] = await Promise.all([
    buildCoachContext(user.id),
    retrieveQuestions(message, 5),
    prisma.coachMessage.findMany({ where: { userId: user.id, kind: "chat" }, orderBy: { createdAt: "desc" }, take: 8, select: { role: true, content: true } }),
  ]);
  await prisma.coachMessage.create({ data: { userId: user.id, kind: "chat", role: "user", content: message } });

  const contextBlock = `Lernstand (JSON):\n${contextToPrompt(ctx)}\n\nPassende Fragen aus dem Fragenpool (nur diese als Quelle verwenden):\n${
    cites.length
      ? cites.map((c, i) => `[${i + 1}] (${c.category}) ${c.text}\nRichtig: ${c.correctAnswers.join(" / ")}\nErklärung: ${c.explanation}${c.legalReference ? `\nQuelle: ${c.legalReference}` : ""}`).join("\n\n")
      : "(keine passenden Fragen gefunden)"
  }\n\nBeziehe dich bei Fachfragen auf die Fragen mit [Nummer]. Antworte in höchstens 8 Sätzen.`;
  const messages: CoachMessageParam[] = [
    ...history.reverse().map((h) => ({ role: h.role === "assistant" ? ("assistant" as const) : ("user" as const), content: h.content })),
    { role: "user", content: message },
  ];

  return ndjsonResponse(async (send) => {
    send({ type: "meta", citations: cites.map((c) => ({ id: c.id, text: c.text, category: c.category })), remaining: quota.unlimited ? null : quota.remaining - 1 });
    let full = "";
    try {
      for await (const chunk of streamCoach({ context: contextBlock, messages, fake: () => fakeAnswer(message, ctx, cites) })) {
        full += chunk;
        send({ type: "delta", text: chunk });
      }
    } catch (err) {
      send({ type: "error", message: coachErrorMessage(err) });
    }
    const saved = full
      ? await prisma.coachMessage.create({ data: { userId: user.id, kind: "chat", role: "assistant", content: full, citations: cites.map((c) => ({ id: c.id, text: c.text, category: c.category })) } })
      : null;
    send({ type: "done", messageId: saved?.id });
  });
}
