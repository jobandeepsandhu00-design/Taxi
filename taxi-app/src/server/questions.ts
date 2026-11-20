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

export type PublicQuestion = Prisma.QuestionGetPayload<{ select: typeof publicQuestionSelect }> & { glossary?: { term: string; definition: string }[] };

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
  /** XP/Level/Abzeichen für diese Antwort (nur bei Lern-/Quizantworten) */
  reward?: import("./gamification").Reward | null;
}

export async function getPublicQuestions(ids: string[]): Promise<PublicQuestion[]> {
  if (ids.length === 0) return [];
  const [rows, glossaries] = await Promise.all([
    prisma.question.findMany({ where: { id: { in: ids } }, select: publicQuestionSelect }),
    prisma.questionVariant.findMany({ where: { questionId: { in: ids }, kind: "glossary", lang: "de" }, select: { questionId: true, content: true } }),
  ]);
  const gMap = new Map(glossaries.map((g) => [g.questionId, ((g.content as { terms?: { term: string; definition: string }[] }).terms ?? [])]));
  const byId = new Map(rows.map((r) => [r.id, { ...r, glossary: gMap.get(r.id) ?? [] } as PublicQuestion]));
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
