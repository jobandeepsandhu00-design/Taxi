import "server-only";
import type { QuizMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate, dateToDayKey } from "@/lib/dates";
import { gradeAnswer, nextMistakeState, updateStreak } from "@/lib/quiz-logic";
import { getSettings } from "@/lib/settings";
import { rewardAnswer } from "./gamification";
import { buildReveal, getAnswerKey, type AnswerReveal } from "./questions";

const MAX_TIME_PER_ANSWER = 600;

/** Markiert heute als Lerntag und aktualisiert die Serie. */
export async function touchStreak(userId: string) {
  const today = dayKey();
  const existing = await prisma.learningStreak.findUnique({ where: { userId } });
  const next = updateStreak(
    existing
      ? {
          currentStreak: existing.currentStreak,
          longestStreak: existing.longestStreak,
          lastActiveDayKey: existing.lastActiveDate ? dateToDayKey(existing.lastActiveDate) : null,
        }
      : null,
    today,
  );
  const data = {
    currentStreak: next.currentStreak,
    longestStreak: next.longestStreak,
    lastActiveDate: next.lastActiveDayKey ? dayKeyToDate(next.lastActiveDayKey) : null,
  };
  await prisma.learningStreak.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

export async function addStudyTime(userId: string, seconds: number) {
  const secs = Math.min(Math.max(0, Math.round(seconds)), 120);
  if (!secs) return;
  const date = dayKeyToDate(dayKey());
  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, secondsStudied: secs },
    update: { secondsStudied: { increment: secs } },
  });
}

/**
 * Bewertet eine Antwort serverseitig und speichert sie inkl. Fortschritt, Fehlerliste, Tagesaktivität und Serie.
 */
export async function recordAnswer(params: {
  userId: string;
  questionId: string;
  selectedOptionIds: string[];
  mode: QuizMode;
  quizAttemptId?: string | null;
  timeSpentSec?: number;
}): Promise<AnswerReveal> {
  const { userId, questionId, mode } = params;
  const key = await getAnswerKey(questionId);
  if (!key) throw new Error("Frage nicht gefunden.");
  const validIds = new Set(key.options.map((o) => o.id));
  const selected = Array.from(new Set(params.selectedOptionIds)).filter((id) => validIds.has(id));
  if (selected.length === 0) throw new Error("Bitte mindestens eine Antwort auswählen.");
  const correctIds = key.options.filter((o) => o.isCorrect).map((o) => o.id);
  const isCorrect = gradeAnswer(selected, correctIds);
  const settings = await getSettings();
  const timeSpentSec = Math.min(Math.max(0, Math.round(params.timeSpentSec ?? 0)), MAX_TIME_PER_ANSWER);

  await prisma.$transaction(async (tx) => {
    const previouslyCorrect = isCorrect
      ? await tx.userAnswer.count({ where: { userId, questionId, isCorrect: true } })
      : 1;

    await tx.userAnswer.create({
      data: { userId, questionId, selectedOptionIds: selected, isCorrect, mode, quizAttemptId: params.quizAttemptId ?? null, timeSpentSec },
    });

    await tx.userProgress.upsert({
      where: { userId_categoryId: { userId, categoryId: key.categoryId } },
      create: {
        userId,
        categoryId: key.categoryId,
        answeredCount: 1,
        correctCount: isCorrect ? 1 : 0,
        incorrectCount: isCorrect ? 0 : 1,
        masteredCount: isCorrect ? 1 : 0,
      },
      update: {
        answeredCount: { increment: 1 },
        correctCount: { increment: isCorrect ? 1 : 0 },
        incorrectCount: { increment: isCorrect ? 0 : 1 },
        masteredCount: { increment: isCorrect && previouslyCorrect === 0 ? 1 : 0 },
        lastActivityAt: new Date(),
      },
    });

    const existing = await tx.mistakeEntry.findUnique({ where: { userId_questionId: { userId, questionId } } });
    const next = nextMistakeState(existing, isCorrect, settings.mistakeRemovalThreshold);
    if (next && !existing) {
      await tx.mistakeEntry.create({ data: { userId, questionId, ...next } });
    } else if (next && existing && (next.correctStreak !== existing.correctStreak || next.wrongCount !== existing.wrongCount || next.resolved !== existing.resolved)) {
      await tx.mistakeEntry.update({
        where: { id: existing.id },
        data: {
          ...next,
          resolvedAt: next.resolved && !existing.resolved ? new Date() : next.resolved ? existing.resolvedAt : null,
          ...(isCorrect ? {} : { lastWrongAt: new Date() }),
        },
      });
    }

    const date = dayKeyToDate(dayKey());
    await tx.dailyActivity.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, questionsAnswered: 1, correctAnswers: isCorrect ? 1 : 0 },
      update: {
        questionsAnswered: { increment: 1 },
        correctAnswers: { increment: isCorrect ? 1 : 0 },
      },
    });
  });

  await touchStreak(userId);
  const reward = await rewardAnswer({ userId, questionId, categoryId: key.categoryId, isCorrect }).catch((e) => {
    console.error("Belohnung fehlgeschlagen", e);
    return null;
  });
  return { ...buildReveal(key, selected, isCorrect), reward };
}
