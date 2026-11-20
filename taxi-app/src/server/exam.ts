import "server-only";
import { prisma } from "@/lib/db";
import { computeExamResult, gradeAnswer } from "@/lib/quiz-logic";
import { getSettings } from "@/lib/settings";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { nextMistakeState } from "@/lib/quiz-logic";
import { rewardExam } from "./gamification";
import { touchStreak } from "./progress";

/**
 * Wertet eine Prüfung aus (idempotent). Falsch oder nicht beantwortete Fragen
 * landen in der Fehlerliste; Antworten fließen in die Statistik ein.
 */
export async function finalizeExam(attemptId: string, status: "SUBMITTED" | "EXPIRED") {
  const settings = await getSettings();
  const done = await prisma.$transaction(async (tx) => {
    // Sperre: nur eine Auswertung gewinnt
    const claimed = await tx.examAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: { status, submittedAt: new Date() },
    });
    if (claimed.count === 0) return null;
    const attempt = await tx.examAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        responses: {
          include: { question: { select: { categoryId: true, options: { select: { id: true, isCorrect: true } } } } },
        },
      },
    });
    const graded = attempt.responses.map((r) => ({
      response: r,
      isCorrect: gradeAnswer(
        r.selectedOptionIds,
        r.question.options.filter((o) => o.isCorrect).map((o) => o.id),
      ),
    }));
    for (const g of graded) {
      await tx.examResponse.update({ where: { id: g.response.id }, data: { isCorrect: g.isCorrect } });
    }
    const result = computeExamResult(graded, attempt.totalCount, attempt.passPercentage);
    await tx.examAttempt.update({
      where: { id: attemptId },
      data: { correctCount: result.correctCount, scorePercent: result.scorePercent, passed: result.passed },
    });

    const answered = graded.filter((g) => g.response.selectedOptionIds.length > 0);
    // Statistik je Kategorie
    const perCategory = new Map<string, { answered: number; correct: number }>();
    for (const g of answered) {
      const c = perCategory.get(g.response.question.categoryId) ?? { answered: 0, correct: 0 };
      c.answered += 1;
      if (g.isCorrect) c.correct += 1;
      perCategory.set(g.response.question.categoryId, c);
    }
    for (const [categoryId, c] of perCategory) {
      await tx.userProgress.upsert({
        where: { userId_categoryId: { userId: attempt.userId, categoryId } },
        create: { userId: attempt.userId, categoryId, answeredCount: c.answered, correctCount: c.correct, incorrectCount: c.answered - c.correct },
        update: {
          answeredCount: { increment: c.answered },
          correctCount: { increment: c.correct },
          incorrectCount: { increment: c.answered - c.correct },
          lastActivityAt: new Date(),
        },
      });
    }
    // Fehlerliste: falsche und unbeantwortete Fragen
    for (const g of graded) {
      const existing = await tx.mistakeEntry.findUnique({
        where: { userId_questionId: { userId: attempt.userId, questionId: g.response.questionId } },
      });
      const next = nextMistakeState(existing, g.isCorrect, settings.mistakeRemovalThreshold);
      if (!next) continue;
      if (!existing) await tx.mistakeEntry.create({ data: { userId: attempt.userId, questionId: g.response.questionId, ...next } });
      else
        await tx.mistakeEntry.update({
          where: { id: existing.id },
          data: { ...next, ...(g.isCorrect ? {} : { lastWrongAt: new Date() }), resolvedAt: next.resolved ? existing.resolvedAt ?? new Date() : null },
        });
    }
    const date = dayKeyToDate(dayKey());
    const elapsed = Math.min(
      Math.round(((attempt.submittedAt ?? new Date()).getTime() - attempt.startedAt.getTime()) / 1000),
      attempt.durationMinutes * 60,
    );
    await tx.dailyActivity.upsert({
      where: { userId_date: { userId: attempt.userId, date } },
      create: { userId: attempt.userId, date, questionsAnswered: answered.length, correctAnswers: result.correctCount, secondsStudied: Math.max(0, elapsed) },
      update: {
        questionsAnswered: { increment: answered.length },
        correctAnswers: { increment: result.correctCount },
        secondsStudied: { increment: Math.max(0, elapsed) },
      },
    });
    return { userId: attempt.userId, passed: result.passed };
  });
  if (done) {
    await touchStreak(done.userId);
    await rewardExam(done.userId, done.passed).catch((e) => console.error("Belohnung fehlgeschlagen", e));
    const { refreshReadiness } = await import("./readiness");
    await refreshReadiness(done.userId).catch(() => undefined);
  }
}

/** Abgelaufene, offene Prüfungen eines Benutzers automatisch abschließen. */
export async function expireOverdueExams(userId: string) {
  const overdue = await prisma.examAttempt.findMany({
    where: { userId, status: "IN_PROGRESS", expiresAt: { lt: new Date(Date.now() - 10_000) } },
    select: { id: true },
  });
  for (const a of overdue) await finalizeExam(a.id, "EXPIRED");
}
