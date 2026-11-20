"use server";

import { dayKey, dayKeyToDate } from "@/lib/dates";
import { dailyQuestionIds } from "@/lib/challenge";
import { rewardXp } from "@/server/gamification";
import type { QuizMode } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { pickRandomUnique, shuffle } from "@/lib/quiz-logic";
import { quizSettingsSchema } from "@/lib/validation";
import { addStudyTime, recordAnswer, touchStreak } from "@/server/progress";
import { publishedWhere, type AnswerReveal } from "@/server/questions";
import type { ActionResult } from "./types";

const idSchema = z.string().min(1).max(64);

async function createAttempt(
  userId: string,
  data: { mode: QuizMode; title: string; questionIds: string[]; categoryId?: string | null; settings?: Prisma.InputJsonValue },
) {
  // Nur eine offene Sitzung pro Modus: ältere offene Sitzungen werden als abgebrochen markiert
  await prisma.quizAttempt.updateMany({
    where: { userId, mode: data.mode, status: "IN_PROGRESS" },
    data: { status: "ABANDONED" },
  });
  return prisma.quizAttempt.create({ data: { userId, ...data } });
}

export async function startLearnSessionAction(formData: FormData) {
  const user = await requireUser();
  const categoryId = idSchema.parse(formData.get("categoryId"));
  const topicId = formData.get("topicId") ? idSchema.parse(formData.get("topicId")) : null;
  const difficulty = z.enum(["ALL", "EASY", "MEDIUM", "HARD"]).catch("ALL").parse(formData.get("difficulty") ?? "ALL");
  const onlyUnanswered = formData.get("onlyNew") === "on";
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  let questions = await prisma.question.findMany({
    where: {
      ...publishedWhere,
      categoryId,
      ...(topicId ? { topicId } : {}),
      ...(difficulty !== "ALL" ? { difficulty } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (onlyUnanswered) {
    const correct = await prisma.userAnswer.findMany({
      where: { userId: user.id, isCorrect: true, questionId: { in: questions.map((q) => q.id) } },
      select: { questionId: true },
      distinct: ["questionId"],
    });
    const done = new Set(correct.map((c) => c.questionId));
    questions = questions.filter((q) => !done.has(q.id));
  }
  if (questions.length === 0) redirect(`/lernen/${category.slug}?leer=1`);
  const attempt = await createAttempt(user.id, {
    mode: "LEARN",
    title: `Lernmodus: ${category.name}`,
    categoryId,
    questionIds: shuffle(questions.map((q) => q.id)),
    settings: { topicId, difficulty, onlyUnanswered },
  });
  redirect(`/sitzung/${attempt.id}`);
}

export async function startPracticeQuizAction(formData: FormData) {
  const user = await requireUser();
  const parsed = quizSettingsSchema.parse({
    count: formData.get("count"),
    categoryIds: formData.getAll("categoryIds").map(String),
    difficulty: formData.get("difficulty") ?? "ALL",
  });
  const pool = await prisma.question.findMany({
    where: {
      ...publishedWhere,
      ...(parsed.categoryIds.length ? { categoryId: { in: parsed.categoryIds } } : {}),
      ...(parsed.difficulty !== "ALL" ? { difficulty: parsed.difficulty } : {}),
    },
    select: { id: true },
  });
  if (pool.length === 0) redirect("/quiz?leer=1");
  const ids = pickRandomUnique(pool.map((p) => p.id), parsed.count);
  const attempt = await createAttempt(user.id, {
    mode: "PRACTICE",
    title: `Übungsquiz (${ids.length} Fragen)`,
    questionIds: ids,
    settings: parsed,
  });
  redirect(`/sitzung/${attempt.id}`);
}

export async function startMistakeTrainingAction(formData: FormData) {
  const user = await requireUser();
  const categoryId = formData.get("categoryId") ? String(formData.get("categoryId")) : null;
  // Fehlertraining = alle Fragen in Leitner-Fach 1, die schon einmal falsch beantwortet wurden
  const mistakes = await prisma.reviewItem.findMany({
    where: { userId: user.id, box: 1, timesWrong: { gt: 0 }, question: { ...publishedWhere, ...(categoryId ? { categoryId } : {}) } },
    select: { questionId: true },
    orderBy: [{ timesWrong: "desc" }, { lastReviewedAt: "desc" }],
  });
  // Rückfall: noch offene Einträge der Fehlerliste (z. B. vor Umstellung auf Leitner)
  if (mistakes.length === 0) {
    const open = await prisma.mistakeEntry.findMany({
      where: { userId: user.id, resolved: false, question: { ...publishedWhere, ...(categoryId ? { categoryId } : {}) } },
      select: { questionId: true },
      orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
    });
    mistakes.push(...open);
  }
  if (mistakes.length === 0) redirect("/fehler?leer=1");
  const attempt = await createAttempt(user.id, {
    mode: "MISTAKES",
    title: `Fehlertraining (${mistakes.length} Fragen)`,
    categoryId,
    questionIds: shuffle(mistakes.map((m) => m.questionId)),
  });
  redirect(`/sitzung/${attempt.id}`);
}

/** Daily Challenge: 5 Fragen pro Tag, für alle gleich – ein Versuch pro Tag. */
export async function startDailyChallengeAction() {
  const user = await requireUser();
  const day = dayKey();
  const done = await prisma.dailyChallengeResult.findUnique({ where: { userId_day: { userId: user.id, day: dayKeyToDate(day) } } });
  if (done) redirect("/challenge");
  const open = await prisma.quizAttempt.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS", settings: { path: ["dailyChallenge"], equals: day } },
  });
  if (open) redirect(`/sitzung/${open.id}`);
  const pool = await prisma.question.findMany({ where: publishedWhere, select: { id: true } });
  const ids = dailyQuestionIds(day, pool.map((p) => p.id));
  if (ids.length === 0) redirect("/challenge");
  const attempt = await prisma.quizAttempt.create({
    data: { userId: user.id, mode: "PRACTICE", title: `Daily Challenge · ${day.slice(8, 10)}.${day.slice(5, 7)}.`, questionIds: ids, settings: { dailyChallenge: day } },
  });
  redirect(`/sitzung/${attempt.id}`);
}

/** Leitner-Wiederholung: heute fällige Fragen (max. 10 auf einmal), am längsten fällige zuerst. */
export async function startReviewAction() {
  const user = await requireUser();
  const due = await prisma.reviewItem.findMany({
    where: { userId: user.id, dueDate: { lte: dayKeyToDate(dayKey()) }, question: publishedWhere },
    orderBy: [{ dueDate: "asc" }, { lastReviewedAt: "asc" }],
    take: 10,
    select: { questionId: true },
  });
  if (due.length === 0) redirect("/dashboard");
  const attempt = await createAttempt(user.id, {
    mode: "REVIEW",
    title: `Wiederholung (${due.length} ${due.length === 1 ? "Frage" : "Fragen"})`,
    questionIds: due.map((d) => d.questionId),
  });
  redirect(`/sitzung/${attempt.id}`);
}

/** Wiederholt eine abgeschlossene Sitzung – alle oder nur falsch beantwortete Fragen. */
export async function repeatAttemptAction(formData: FormData) {
  const user = await requireUser();
  const attemptId = idSchema.parse(formData.get("attemptId"));
  const onlyWrong = formData.get("onlyWrong") === "1";
  const attempt = await prisma.quizAttempt.findFirstOrThrow({ where: { id: attemptId, userId: user.id } });
  let ids = attempt.questionIds;
  if (onlyWrong) {
    const answers = await prisma.userAnswer.findMany({ where: { quizAttemptId: attempt.id }, orderBy: { createdAt: "asc" } });
    const last = new Map<string, boolean>();
    for (const a of answers) last.set(a.questionId, a.isCorrect);
    ids = ids.filter((id) => last.get(id) === false);
  }
  const published = await prisma.question.findMany({ where: { id: { in: ids }, ...publishedWhere }, select: { id: true } });
  const allowed = new Set(published.map((p) => p.id));
  ids = ids.filter((id) => allowed.has(id));
  if (ids.length === 0) redirect(`/sitzung/${attempt.id}`);
  const next = await createAttempt(user.id, {
    mode: attempt.mode,
    title: `${attempt.title.replace(/ – Wiederholung$/, "")} – Wiederholung`,
    categoryId: attempt.categoryId,
    questionIds: shuffle(ids),
  });
  redirect(`/sitzung/${next.id}`);
}

const submitSchema = z.object({
  attemptId: idSchema,
  questionId: idSchema,
  selectedOptionIds: z.array(idSchema).min(1).max(4),
  timeSpentSec: z.number().int().min(0).max(36000),
  unsure: z.boolean().optional(),
});

export async function submitQuizAnswerAction(input: z.infer<typeof submitSchema>): Promise<ActionResult<AnswerReveal>> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte mindestens eine Antwort auswählen." };
  const { attemptId, questionId, selectedOptionIds, timeSpentSec, unsure } = parsed.data;
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return { ok: false, error: "Sitzung nicht gefunden." };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "Diese Sitzung ist bereits abgeschlossen." };
  const index = attempt.questionIds.indexOf(questionId);
  if (index === -1) return { ok: false, error: "Diese Frage gehört nicht zur Sitzung." };
  const already = await prisma.userAnswer.findFirst({ where: { quizAttemptId: attempt.id, questionId } });
  if (already) return { ok: false, error: "Diese Frage wurde in dieser Sitzung bereits beantwortet." };
  try {
    const reveal = await recordAnswer({ userId: user.id, questionId, selectedOptionIds, mode: attempt.mode, quizAttemptId: attempt.id, timeSpentSec, unsure });
    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        answeredCount: { increment: 1 },
        correctCount: { increment: reveal.isCorrect ? 1 : 0 },
        currentIndex: index,
      },
    });
    return { ok: true, data: reveal };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Antwort konnte nicht gespeichert werden." };
  }
}

export async function goToQuestionAction(attemptId: string, index: number): Promise<ActionResult> {
  const user = await requireUser();
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" } });
  if (!attempt) return { ok: false, error: "Sitzung nicht gefunden." };
  const safe = Math.min(Math.max(0, Math.floor(index)), attempt.questionIds.length - 1);
  await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { currentIndex: safe } });
  return { ok: true, data: undefined };
}

export async function finishQuizAction(attemptId: string): Promise<ActionResult> {
  const user = await requireUser();
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return { ok: false, error: "Sitzung nicht gefunden." };
  if (attempt.status === "IN_PROGRESS") {
    const finishedAt = new Date();
    await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { status: "COMPLETED", finishedAt } });
    // Prüfungsreife nach jeder Sitzung aktualisieren
    const { refreshReadiness } = await import("@/server/readiness");
    await refreshReadiness(user.id).catch(() => undefined);
    // Mini-Lektion: Ergebnis speichern
    const lessonId = (attempt.settings as { lesson?: string } | null)?.lesson;
    if (lessonId) {
      const score = await prisma.userAnswer.count({ where: { quizAttemptId: attempt.id, isCorrect: true } });
      await prisma.lesson.updateMany({ where: { id: lessonId, userId: user.id }, data: { score, completedAt: finishedAt } });
    }
    // Daily Challenge: Ergebnis einmal pro Tag für die Rangliste speichern
    const challengeDay = (attempt.settings as { dailyChallenge?: string } | null)?.dailyChallenge;
    if (challengeDay) {
      const correct = await prisma.userAnswer.count({ where: { quizAttemptId: attempt.id, isCorrect: true } });
      const created = await prisma.dailyChallengeResult
        .create({
          data: {
            userId: user.id,
            day: dayKeyToDate(challengeDay),
            correct,
            total: attempt.questionIds.length,
            durationSec: Math.max(1, Math.round((finishedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
          },
        })
        .catch(() => null);
      if (created) await rewardXp(user.id, 20 + correct * 5).catch(() => null);
    }
  }
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function abandonQuizAction(formData: FormData) {
  const user = await requireUser();
  const attemptId = idSchema.parse(formData.get("attemptId"));
  await prisma.quizAttempt.updateMany({
    where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" },
    data: { status: "ABANDONED", finishedAt: new Date() },
  });
  redirect("/dashboard");
}

/** Einzelfrage beantworten (z. B. aus der Fragensuche / Merkliste) */
export async function answerSingleQuestionAction(input: {
  questionId: string;
  selectedOptionIds: string[];
  timeSpentSec: number;
  unsure?: boolean;
}): Promise<ActionResult<AnswerReveal>> {
  const user = await requireUser();
  const parsed = submitSchema.omit({ attemptId: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte mindestens eine Antwort auswählen." };
  const q = await prisma.question.findFirst({ where: { id: parsed.data.questionId, ...publishedWhere }, select: { id: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  try {
    const reveal = await recordAnswer({ userId: user.id, mode: "LEARN", ...parsed.data });
    return { ok: true, data: reveal };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Antwort konnte nicht gespeichert werden." };
  }
}

export async function toggleBookmarkAction(questionId: string): Promise<ActionResult<{ bookmarked: boolean }>> {
  const user = await requireUser();
  const id = idSchema.safeParse(questionId);
  if (!id.success) return { ok: false, error: "Ungültige Frage." };
  const existing = await prisma.bookmark.findUnique({ where: { userId_questionId: { userId: user.id, questionId: id.data } } });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { ok: true, data: { bookmarked: false } };
  }
  const q = await prisma.question.findUnique({ where: { id: id.data }, select: { id: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  await prisma.bookmark.create({ data: { userId: user.id, questionId: id.data } });
  return { ok: true, data: { bookmarked: true } };
}

const flashcardSchema = z.object({ questionId: idSchema, result: z.enum(["LEARNED", "NOT_LEARNED"]) });

export async function markFlashcardAction(input: z.infer<typeof flashcardSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = flashcardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Eingabe." };
  const { questionId, result } = parsed.data;
  const learned = result === "LEARNED";
  await prisma.flashcardProgress.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    create: {
      userId: user.id,
      questionId,
      status: learned ? "LEARNED" : "LEARNING",
      reviewCount: 1,
      difficultCount: learned ? 0 : 1,
      lastReviewedAt: new Date(),
    },
    update: {
      status: learned ? "LEARNED" : "LEARNING",
      reviewCount: { increment: 1 },
      difficultCount: { increment: learned ? 0 : 1 },
      lastReviewedAt: new Date(),
    },
  });
  await touchStreak(user.id);
  return { ok: true, data: undefined };
}

export async function resetFlashcardsAction() {
  const user = await requireUser();
  await prisma.flashcardProgress.deleteMany({ where: { userId: user.id } });
  revalidatePath("/lernkarten");
}

export async function heartbeatAction(seconds: number): Promise<void> {
  const user = await requireUser();
  if (!Number.isFinite(seconds)) return;
  await addStudyTime(user.id, seconds);
}

/** 3-Minuten-Lektion starten: Leitner-Mix (optional je Kategorie) oder feste Kategorie-Lektion. */
export async function startLessonAction(formData: FormData) {
  const user = await requireUser();
  const categoryId = formData.get("categoryId") ? idSchema.parse(formData.get("categoryId")) : null;
  const lessonIndex = formData.get("lessonIndex") ? z.coerce.number().int().min(1).max(500).parse(formData.get("lessonIndex")) : null;
  const { buildLesson, categoryLessons } = await import("@/server/lessons");
  let questionIds: string[];
  let kind = "mix";
  let title = "3-Minuten-Lektion";
  if (categoryId && lessonIndex) {
    const lessons = await categoryLessons(user.id, categoryId);
    const l = lessons.find((x) => x.index === lessonIndex);
    if (!l) redirect("/lernen");
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } });
    questionIds = l.questionIds;
    kind = "category";
    title = `Lektion ${lessonIndex} · ${cat?.name ?? ""}`;
  } else {
    questionIds = await buildLesson(user.id, categoryId);
  }
  if (questionIds.length === 0) redirect("/lernen");
  // nur eine offene Lektion: ältere offene Lektionen abbrechen (andere Sitzungen bleiben unberührt)
  await prisma.quizAttempt.updateMany({ where: { userId: user.id, status: "IN_PROGRESS", settings: { path: ["lesson"], not: Prisma.DbNull } }, data: { status: "ABANDONED" } });
  const lesson = await prisma.lesson.create({ data: { userId: user.id, kind, categoryId, lessonIndex, questionIds } });
  const attempt = await prisma.quizAttempt.create({
    data: { userId: user.id, mode: "PRACTICE", title, categoryId, questionIds, settings: { lesson: lesson.id, kind } },
  });
  await prisma.lesson.update({ where: { id: lesson.id }, data: { quizAttemptId: attempt.id } });
  redirect(`/sitzung/${attempt.id}`);
}
