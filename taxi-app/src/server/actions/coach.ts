"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pickRandomUnique, shuffle } from "@/lib/quiz-logic";
import { coachQuota, LIMIT_REACHED } from "@/server/coach/limits";
import { coachConfigured, coachErrorMessage, parseCoach, UNSURE_SENTENCE } from "@/server/coach/llm";
import { getAnswerKey, publishedWhere } from "@/server/questions";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; limitReached?: boolean };

const simplifiedSchema = z.object({
  text: z.string(),
  options: z.array(z.object({ label: z.string(), text: z.string() })),
});

/** „Einfache Sprache“: Frage in B1-Deutsch – einmal erzeugt, für alle zwischengespeichert. */
export async function simplifyQuestionAction(questionId: string): Promise<Result<{ text: string; options: { id: string; label: string; text: string }[] }>> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).parse(questionId);
  const q = await prisma.question.findFirst({ where: { id, ...publishedWhere }, select: { id: true, text: true, options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true } } } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  const mapOptions = (opts: { label: string; text: string }[]) => q.options.map((o) => ({ id: o.id, label: o.label, text: opts.find((x) => x.label === o.label)?.text ?? o.text }));

  const cached = await prisma.simplifiedQuestion.findUnique({ where: { questionId: id } });
  if (cached) return { ok: true, data: { text: cached.text, options: mapOptions(cached.options as { label: string; text: string }[]) } };
  if (!coachConfigured()) return { ok: false, error: "Der Coach ist noch nicht eingerichtet." };
  const quota = await coachQuota(user);
  if (quota.remaining <= 0) return { ok: false, error: LIMIT_REACHED, limitReached: true };

  try {
    const prompt = `Schreibe diese Prüfungsfrage und ihre Antwortmöglichkeiten in Einfacher Sprache (Niveau B1, kurze Sätze, gebräuchliche Wörter, Fachbegriffe kurz in Klammern erklären).
Wichtig: Inhalt und Bedeutung jeder Antwort müssen exakt gleich bleiben – verrate nicht, welche richtig ist, und mach keine Antwort eindeutiger als im Original. Behalte die Buchstaben bei.

Frage: ${q.text}
${q.options.map((o) => `${o.label}) ${o.text}`).join("\n")}`;
    const out = await parseCoach({
      context: "Aufgabe: sprachliche Vereinfachung ohne inhaltliche Änderung.",
      prompt,
      schema: simplifiedSchema,
      fake: () => ({ text: `Einfach gesagt: ${q.text}`, options: q.options.map((o) => ({ label: o.label, text: o.text })) }),
      maxTokens: 3000,
    });
    if (!out || out.options.length !== q.options.length) return { ok: false, error: "Die Vereinfachung hat nicht geklappt – bitte später erneut versuchen." };
    await prisma.coachMessage.create({ data: { userId: user.id, kind: "simplify", role: "user", content: `Einfache Sprache (${id})` } });
    await prisma.simplifiedQuestion.upsert({ where: { questionId: id }, create: { questionId: id, text: out.text, options: out.options }, update: { text: out.text, options: out.options } });
    return { ok: true, data: { text: out.text, options: mapOptions(out.options) } };
  } catch (err) {
    return { ok: false, error: coachErrorMessage(err) };
  }
}

/** Mündliche Prüfung: 10 Fragen, Schwerpunkt auf Schwächen. */
export async function startOralExamAction(): Promise<Result<{ id: string; text: string; category: string }[]>> {
  const user = await requireUser();
  if (!coachConfigured()) return { ok: false, error: "Der Coach ist noch nicht eingerichtet." };
  const mistakes = await prisma.mistakeEntry.findMany({ where: { userId: user.id, resolved: false, question: publishedWhere }, orderBy: { wrongCount: "desc" }, take: 5, select: { questionId: true } });
  const pool = await prisma.question.findMany({ where: { ...publishedWhere, multipleCorrect: false }, select: { id: true } });
  const ids = Array.from(new Set([...mistakes.map((m) => m.questionId), ...pickRandomUnique(pool.map((p) => p.id), 15)])).slice(0, 10);
  const qs = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, text: true, category: { select: { name: true } } } });
  return { ok: true, data: shuffle(qs.map((q) => ({ id: q.id, text: q.text, category: q.category.name }))) };
}

const gradeSchema = z.object({
  verdict: z.enum(["richtig", "teilweise", "falsch"]),
  feedback: z.string(),
  musterantwort: z.string(),
});

export async function gradeOralAnswerAction(input: { questionId: string; answer: string }): Promise<Result<z.infer<typeof gradeSchema>>> {
  const user = await requireUser();
  const parsed = z.object({ questionId: z.string().min(1).max(64), answer: z.string().trim().min(1).max(1500) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte eine Antwort geben." };
  if (!coachConfigured()) return { ok: false, error: "Der Coach ist noch nicht eingerichtet." };
  const quota = await coachQuota(user);
  if (quota.remaining <= 0) return { ok: false, error: LIMIT_REACHED, limitReached: true };
  const key = await getAnswerKey(parsed.data.questionId);
  if (!key) return { ok: false, error: "Frage nicht gefunden." };
  const q = await prisma.question.findUniqueOrThrow({ where: { id: key.id }, select: { text: true, explanation: true, sourceDetail: true, options: { where: { isCorrect: true }, select: { text: true } } } });
  await prisma.coachMessage.create({ data: { userId: user.id, kind: "oral", role: "user", content: parsed.data.answer.slice(0, 1000) } });
  try {
    const out = await parseCoach({
      context: `Du bist Prüfer:in bei der mündlichen Taxi-Prüfung in Wien. Bewerte fair, aber genau.
Referenz (nur diese verwenden):
Frage: ${q.text}
Richtige Antwort: ${q.options.map((o) => o.text).join(" / ")}
Erklärung: ${q.explanation}${q.sourceDetail ? `\nRechtsquelle: ${q.sourceDetail}` : ""}`,
      prompt: `Antwort der Kandidatin/des Kandidaten: „${parsed.data.answer}“

Bewerte: „richtig“ (Kern vollständig getroffen), „teilweise“ (richtige Richtung, aber unvollständig/ungenau) oder „falsch“.
feedback: 1–2 Sätze, du-Form, was gut war bzw. was fehlt. musterantwort: ein Satz mit der richtigen Antwort laut Referenz. Wenn die Referenz nicht reicht: „${UNSURE_SENTENCE}“`,
      schema: gradeSchema,
      fake: () => {
        const ok = q.options.some((o) => parsed.data.answer.toLowerCase().includes(o.text.toLowerCase().split(" ")[0]));
        return { verdict: ok ? ("richtig" as const) : ("teilweise" as const), feedback: ok ? "Gut erklärt!" : "Die Richtung stimmt, aber es fehlt der Kern.", musterantwort: q.options[0]?.text ?? "" };
      },
      maxTokens: 2000,
    });
    if (!out) return { ok: false, error: "Die Bewertung hat nicht geklappt – bitte erneut versuchen." };
    await prisma.coachMessage.create({ data: { userId: user.id, kind: "oral", role: "assistant", content: `${out.verdict}: ${out.feedback}` } });
    return { ok: true, data: out };
  } catch (err) {
    return { ok: false, error: coachErrorMessage(err) };
  }
}

/** 👍/👎 zu einer Coach-Antwort speichern. */
export async function rateCoachMessageAction(messageId: string, value: 1 | -1 | 0): Promise<void> {
  const user = await requireUser();
  const v = z.union([z.literal(1), z.literal(-1), z.literal(0)]).parse(value);
  await prisma.coachMessage.updateMany({ where: { id: messageId, userId: user.id, role: "assistant" }, data: { feedback: v === 0 ? null : v } });
}

/** Tagesplan-Punkt manuell abhaken (zusätzlich zur automatischen Erkennung). */
export async function togglePlanItemAction(itemId: string): Promise<void> {
  const user = await requireUser();
  const { toggleManualDone } = await import("@/server/coach/plans");
  await toggleManualDone(user.id, z.string().min(1).max(80).parse(itemId));
}
