import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Auswahl für die Lernansicht – OHNE isCorrect/Erklärungen, damit nichts vor dem Absenden verraten wird. */
export const publicQuestionSelect = {
  id: true,
  text: true,
  difficulty: true,
  multipleCorrect: true,
  imageUrl: true,
  tags: true,
  origin: true,
  sourceDetail: true,
  category: { select: { id: true, name: true, slug: true, color: true } },
  topic: { select: { name: true } },
  source: { select: { title: true, verified: true } },
  options: { select: { id: true, label: true, text: true }, orderBy: { order: "asc" } },
} satisfies Prisma.QuestionSelect;

export type PublicQuestion = Prisma.QuestionGetPayload<{ select: typeof publicQuestionSelect }>;

export interface AnswerReveal {
  questionId: string;
  isCorrect: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  explanation: string;
  options: { id: string; label: string; isCorrect: boolean; explanation: string | null }[];
  sourceTitle: string | null;
  sourceDetail: string | null;
  sourceUrl: string | null;
}

export async function getPublicQuestions(ids: string[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.question.findMany({ where: { id: { in: ids } }, select: publicQuestionSelect });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((q): q is PublicQuestion => Boolean(q));
}

export async function getAnswerKey(questionId: string) {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      categoryId: true,
      status: true,
      explanation: true,
      sourceDetail: true,
      source: { select: { title: true, url: true } },
      options: { select: { id: true, label: true, isCorrect: true, explanation: true }, orderBy: { order: "asc" } },
    },
  });
}

export function buildReveal(
  key: NonNullable<Awaited<ReturnType<typeof getAnswerKey>>>,
  selectedOptionIds: string[],
  isCorrect: boolean,
): AnswerReveal {
  return {
    questionId: key.id,
    isCorrect,
    selectedOptionIds,
    correctOptionIds: key.options.filter((o) => o.isCorrect).map((o) => o.id),
    explanation: key.explanation,
    options: key.options,
    sourceTitle: key.source?.title ?? null,
    sourceDetail: key.sourceDetail,
    sourceUrl: key.source?.url ?? null,
  };
}

export const publishedWhere: Prisma.QuestionWhereInput = {
  status: "PUBLISHED",
  category: { isActive: true },
};
