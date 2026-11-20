import "server-only";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { shuffle } from "@/lib/quiz-logic";
import { publishedWhere } from "./questions";

export const LESSON_SIZE = 5;

/**
 * Mini-Lektion zusammenstellen: 2 fällige Wiederholungen + 2 neue Fragen + 1 Schwachstelle.
 * Fehlt eine Sorte, wird mit der nächsten aufgefüllt (fällig → neu → schwach → zufällig).
 */
export async function buildLesson(userId: string, categoryId?: string | null): Promise<string[]> {
  const where = { ...publishedWhere, ...(categoryId ? { categoryId } : {}) };
  const today = dayKeyToDate(dayKey());
  const [due, weak, seen] = await Promise.all([
    prisma.reviewItem.findMany({ where: { userId, dueDate: { lte: today }, question: where }, orderBy: [{ dueDate: "asc" }, { lastReviewedAt: "asc" }], take: 10, select: { questionId: true } }),
    prisma.reviewItem.findMany({ where: { userId, timesWrong: { gt: 0 }, question: where }, orderBy: [{ box: "asc" }, { timesWrong: "desc" }], take: 15, select: { questionId: true } }),
    prisma.reviewItem.findMany({ where: { userId, question: where }, select: { questionId: true } }),
  ]);
  const seenIds = new Set(seen.map((s) => s.questionId));
  const answered = await prisma.userAnswer.findMany({ where: { userId, question: where }, distinct: ["questionId"], select: { questionId: true } });
  answered.forEach((a) => seenIds.add(a.questionId));
  const fresh = await prisma.question.findMany({ where: { ...where, id: { notIn: [...seenIds] } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 20, select: { id: true } });

  const picked: string[] = [];
  const take = (pool: string[], n: number) => {
    for (const id of pool) {
      if (picked.length >= LESSON_SIZE || n <= 0) break;
      if (!picked.includes(id)) {
        picked.push(id);
        n--;
      }
    }
  };
  const duePool = due.map((d) => d.questionId);
  const freshPool = shuffle(fresh.map((q) => q.id));
  const weakPool = weak.map((w) => w.questionId).filter((id) => !duePool.includes(id));

  take(duePool, 2);
  take(freshPool, 2);
  take(weakPool, 1);
  // Auffüllen in Reihenfolge der Sorten
  for (const pool of [duePool, freshPool, weakPool]) take(pool, LESSON_SIZE);
  if (picked.length < LESSON_SIZE) {
    const rest = await prisma.question.findMany({ where: { ...where, id: { notIn: picked } }, select: { id: true }, take: 50 });
    take(shuffle(rest.map((r) => r.id)), LESSON_SIZE);
  }
  return shuffle(picked);
}

export type LessonStatus = "offen" | "erledigt" | "gemeistert";

/** Feste Kategorie-Lektionen: veröffentlichte Fragen in stabiler Reihenfolge, je 5 Fragen. */
export async function categoryLessons(userId: string, categoryId: string): Promise<{ index: number; questionIds: string[]; status: LessonStatus; best: number | null }[]> {
  const [questions, done] = await Promise.all([
    prisma.question.findMany({ where: { ...publishedWhere, categoryId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } }),
    prisma.lesson.findMany({ where: { userId, categoryId, kind: "category", completedAt: { not: null } }, select: { lessonIndex: true, score: true } }),
  ]);
  const best = new Map<number, number>();
  for (const d of done) if (d.lessonIndex !== null) best.set(d.lessonIndex, Math.max(best.get(d.lessonIndex) ?? 0, d.score ?? 0));
  const out = [];
  for (let i = 0; i * LESSON_SIZE < questions.length; i++) {
    const ids = questions.slice(i * LESSON_SIZE, (i + 1) * LESSON_SIZE).map((q) => q.id);
    const b = best.get(i + 1) ?? null;
    out.push({ index: i + 1, questionIds: ids, best: b, status: (b === null ? "offen" : b >= ids.length ? "gemeistert" : "erledigt") as LessonStatus });
  }
  return out;
}

/** Wiederholungs-Lektion: fällige Fragen, max. 10, am längsten fällige zuerst. */
export async function dueReviewIds(userId: string, max = 10): Promise<string[]> {
  const due = await prisma.reviewItem.findMany({
    where: { userId, dueDate: { lte: dayKeyToDate(dayKey()) }, question: publishedWhere },
    orderBy: [{ dueDate: "asc" }, { lastReviewedAt: "asc" }],
    take: max,
    select: { questionId: true },
  });
  return due.map((d) => d.questionId);
}
