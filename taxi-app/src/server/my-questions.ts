import "server-only";
import { prisma } from "@/lib/db";
import type { StoryCard } from "@/lib/lernbuch";

/**
 * Persönliche Ebene über dem Fragenkatalog (nur für die jeweilige Person):
 * eigene Fassungen (override), ausgeblendete Fragen (hide) und eigene Fragen (own).
 */

export type MyOption = { text: string; isCorrect: boolean };
const LABELS = ["A", "B", "C", "D", "E", "F"];

export function parseOptions(raw: unknown): MyOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is { text: unknown; isCorrect: unknown } => Boolean(o) && typeof o === "object")
    .map((o) => ({ text: String(o.text ?? "").slice(0, 5000), isCorrect: Boolean(o.isCorrect) }))
    .filter((o) => o.text.trim());
}

function cardFrom(id: string, text: string, options: MyOption[], explanation: string | null, base?: StoryCard): StoryCard {
  const answer = options.filter((o) => o.isCorrect).map((o) => o.text).join("\n\n");
  return {
    ...(base ?? { legal: null, mnemonic: null, verified: false, status: null, starred: false }),
    id,
    question: text,
    answer,
    answerLabels: options.map((o, i) => (o.isCorrect ? LABELS[i]! : "")).filter(Boolean),
    wrong: options.filter((o) => !o.isCorrect).map((o) => o.text),
    explanation: explanation && explanation.trim() !== answer.trim() ? explanation : null,
  } as StoryCard;
}

/** Eigene Fassungen anwenden, ausgeblendete entfernen, eigene Fragen anhängen. */
export async function applyPersonalLayer(userId: string, categoryId: string, cards: StoryCard[]): Promise<StoryCard[]> {
  const rows = await prisma.userQuestion.findMany({
    where: { userId, OR: [{ baseQuestionId: { in: cards.map((c) => c.id) } }, { categoryId, kind: "own" }] },
    orderBy: { createdAt: "asc" },
  });
  if (!rows.length) return cards;
  const byBase = new Map(rows.filter((r) => r.baseQuestionId).map((r) => [r.baseQuestionId!, r]));
  const out: StoryCard[] = [];
  for (const c of cards) {
    const r = byBase.get(c.id);
    if (r?.kind === "hide") continue;
    if (r?.kind === "override") {
      const opts = parseOptions(r.options);
      out.push(cardFrom(c.id, r.text || c.question, opts.length ? opts : [{ text: c.answer, isCorrect: true }], r.explanation, c));
    } else out.push(c);
  }
  for (const r of rows.filter((x) => x.kind === "own")) out.push(cardFrom(`uq:${r.id}`, r.text ?? "", parseOptions(r.options), r.explanation));
  return out;
}

/** Karten eines eigenen Kapitels */
export async function getMyChapterCards(userId: string, userChapterId: string): Promise<StoryCard[]> {
  const rows = await prisma.userQuestion.findMany({ where: { userId, userChapterId, kind: "own" }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => cardFrom(`uq:${r.id}`, r.text ?? "", parseOptions(r.options), r.explanation));
}
