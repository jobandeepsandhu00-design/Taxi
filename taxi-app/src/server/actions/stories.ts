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

/** Kapitel-Story: heutige Portion laden (Tempo aus dem Cookie). `extra` = „Noch eine Portion“. */
export async function getChapterStoryAction(categoryId: string, extra = 0): Promise<import("@/lib/stories").StorySlideData[]> {
  const user = await requireUser();
  const id = z.string().min(1).max(70).safeParse(categoryId);
  if (!id.success) return [];
  const { cookies } = await import("next/headers");
  const { parsePace, PACE_COOKIE } = await import("@/lib/stories");
  const { chapterSlides } = await import("@/server/stories/chapters");
  const pace = parsePace((await cookies()).get(PACE_COOKIE)?.value);
  return chapterSlides(user.id, id.data, pace, Math.max(0, Math.min(30, Math.round(extra))));
}

/** Tempo speichern (Cookie, 1 Jahr). */
export async function setLearnPaceAction(qpm: number, minutes: number): Promise<void> {
  await requireUser();
  const { cookies } = await import("next/headers");
  const { parsePace, paceToCookie, PACE_COOKIE } = await import("@/lib/stories");
  (await cookies()).set(PACE_COOKIE, paceToCookie(parsePace(`${qpm}-${minutes}`)), { maxAge: 365 * 86400, path: "/", sameSite: "lax" });
}
