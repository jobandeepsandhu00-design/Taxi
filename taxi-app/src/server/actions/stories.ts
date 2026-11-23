"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { publishedWhere } from "@/server/questions";
import { recordAnswer } from "@/server/progress";

const slideId = z.string().min(1).max(120);

/** Gesehene Slides (gebündelt vom Viewer gesendet). */
export async function markStoriesSeenAction(ids: string[]): Promise<void> {
  const user = await requireUser();
  const parsed = z.array(slideId).max(60).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return;
  await prisma.storyView.createMany({ data: [...new Set(parsed.data)].map((id) => ({ userId: user.id, slideId: id })), skipDuplicates: true });
}

const eventSchema = z.object({ groupKey: z.string().min(1).max(40), kind: z.enum(["complete", "cta"]), slideId: slideId.optional() });

export async function storyEventAction(input: z.infer<typeof eventSchema>): Promise<void> {
  const user = await requireUser();
  const p = eventSchema.safeParse(input);
  if (!p.success) return;
  await prisma.storyEvent.create({ data: { userId: user.id, groupKey: p.data.groupKey, kind: p.data.kind, slideId: p.data.slideId ?? null } });
}

const quizSchema = z.object({ groupKey: z.string().min(1).max(40), slideId, questionId: z.string().min(1).max(64), selectedOptionIds: z.array(z.string().min(1).max(64)).min(1).max(8), correct: z.boolean().optional() });

/**
 * Story-Quiz: echte Prüfungsfrage → als richtige Antwort gespeichert (Fortschritt, Leitner, XP).
 * Eigene Übungsfragen („local:…“) werden nur für die Statistik gezählt.
 */
export async function answerStoryQuizAction(input: z.infer<typeof quizSchema>): Promise<{ ok: boolean; correct: boolean; correctOptionIds: string[]; explanation?: string; error?: string }> {
  const user = await requireUser();
  const p = quizSchema.safeParse(input);
  if (!p.success) return { ok: false, correct: false, correctOptionIds: [], error: "Ungültige Antwort." };
  const { groupKey, questionId, selectedOptionIds } = p.data;
  if (questionId.startsWith("local:")) {
    await prisma.storyEvent.create({ data: { userId: user.id, groupKey, slideId: p.data.slideId, kind: "quiz", correct: Boolean(p.data.correct) } });
    return { ok: true, correct: Boolean(p.data.correct), correctOptionIds: [] };
  }
  const q = await prisma.question.findFirst({ where: { id: questionId, ...publishedWhere }, select: { id: true } });
  if (!q) return { ok: false, correct: false, correctOptionIds: [], error: "Frage nicht gefunden." };
  try {
    const reveal = await recordAnswer({ userId: user.id, questionId, selectedOptionIds, mode: "LEARN" });
    await prisma.storyEvent.create({ data: { userId: user.id, groupKey, slideId: p.data.slideId, kind: "quiz", correct: reveal.isCorrect } });
    return { ok: true, correct: reveal.isCorrect, correctOptionIds: reveal.correctOptionIds, explanation: reveal.explanation };
  } catch (e) {
    return { ok: false, correct: false, correctOptionIds: [], error: e instanceof Error ? e.message : "Antwort konnte nicht gespeichert werden." };
  }
}
