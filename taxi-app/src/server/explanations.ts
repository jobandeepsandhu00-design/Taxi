import "server-only";
import { prisma } from "@/lib/db";

export type NoExplanationRow = { id: string; text: string; answer: string; category: string; mnemonic: string | null; simple: string | null; hits: number };

/** Veröffentlichte Fragen ohne eigene Erklärung (leer oder identisch mit der richtigen Antwort). */
export async function questionsWithoutExplanation(limit = 2000): Promise<NoExplanationRow[]> {
  return prisma.$queryRaw<NoExplanationRow[]>`
    SELECT q.id, q.text, ans.answer, c.name AS category, q.mnemonic, q."simpleDe" AS simple, COALESCE(m.hits, 0)::int AS hits
    FROM "Question" q
    JOIN "Category" c ON c.id = q."categoryId"
    JOIN LATERAL (SELECT string_agg(o.text, E'\n' ORDER BY o."order") AS answer FROM "AnswerOption" o WHERE o."questionId" = q.id AND o."isCorrect") ans ON true
    LEFT JOIN missing_explanations m ON m.question_id = q.id
    WHERE q.status = 'PUBLISHED'
      AND (btrim(q.explanation) = '' OR regexp_replace(q.explanation, '\s+', ' ', 'g') = regexp_replace(COALESCE(ans.answer, ''), '\s+', ' ', 'g'))
    ORDER BY COALESCE(m.hits, 0) DESC, c."order", q.id
    LIMIT ${limit}`;
}
