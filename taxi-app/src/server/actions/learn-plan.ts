"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { LearnPlan } from "@/lib/learn-plan-types";
import { getLearnPlan } from "@/server/learn-plan";
import { publishedWhere } from "@/server/questions";

export async function getLearnPlanAction(): Promise<LearnPlan> {
  const user = await requireUser();
  return getLearnPlan(user.id);
}

export interface QuestionPreview {
  id: string;
  text: string;
  category: string;
  options: { label: string; text: string; isCorrect: boolean | null }[];
  /** Letzte Antwort – nur wenn schon beantwortet (sonst wird keine Lösung verraten) */
  lastAnswer: { correct: boolean; labels: string[]; at: string } | null;
  explanation: string | null;
  bookmarked: boolean;
}

/** Vorschau einer Frage für den Lernplan (Lösung/Erklärung nur nach dem Beantworten). */
export async function getQuestionPreviewAction(questionId: string): Promise<QuestionPreview | null> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).parse(questionId);
  const q = await prisma.question.findFirst({
    where: { id, ...publishedWhere },
    select: { id: true, text: true, explanation: true, category: { select: { name: true } }, options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true, isCorrect: true } } },
  });
  if (!q) return null;
  const [last, bm] = await Promise.all([
    prisma.userAnswer.findFirst({ where: { userId: user.id, questionId: id }, orderBy: { createdAt: "desc" }, select: { isCorrect: true, selectedOptionIds: true, createdAt: true } }),
    prisma.bookmark.findUnique({ where: { userId_questionId: { userId: user.id, questionId: id } }, select: { id: true } }),
  ]);
  return {
    id: q.id,
    text: q.text,
    category: q.category.name,
    options: q.options.map((o) => ({ label: o.label, text: o.text, isCorrect: last ? o.isCorrect : null })),
    lastAnswer: last ? { correct: last.isCorrect, labels: q.options.filter((o) => last.selectedOptionIds.includes(o.id)).map((o) => o.label), at: last.createdAt.toISOString() } : null,
    explanation: last ? q.explanation : null,
    bookmarked: Boolean(bm),
  };
}
