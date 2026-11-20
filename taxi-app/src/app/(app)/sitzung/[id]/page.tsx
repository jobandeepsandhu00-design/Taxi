import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { StudyHeartbeat } from "@/components/quiz/study-heartbeat";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { modeLabel } from "@/lib/labels";
import { buildReveal, getAnswerKey, getPublicQuestions, publishedWhere, type AnswerReveal } from "@/server/questions";

export const metadata: Metadata = { title: "Lernsitzung" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const attempt = await prisma.quizAttempt.findFirst({ where: { id, userId: user.id } });
  if (!attempt) notFound();

  const [questions, answers, bookmarks] = await Promise.all([
    getPublicQuestions(attempt.questionIds),
    prisma.userAnswer.findMany({ where: { quizAttemptId: attempt.id }, orderBy: { createdAt: "asc" } }),
    prisma.bookmark.findMany({ where: { userId: user.id, questionId: { in: attempt.questionIds } }, select: { questionId: true } }),
  ]);
  if (questions.length === 0) notFound();

  // Bereits beantwortete Fragen dieser Sitzung inkl. Lösung wiederherstellen (Fortsetzen nach Neuladen)
  const reveals: Record<string, AnswerReveal> = {};
  for (const a of answers) {
    const key = await getAnswerKey(a.questionId);
    if (key) reveals[a.questionId] = buildReveal(key, a.selectedOptionIds, a.isCorrect);
  }
  const s = (attempt.settings ?? {}) as { lesson?: string; kind?: string };
  let lesson: { kind: string; categoryId: string | null; lessonIndex: number | null; hasNext: boolean } | null = null;
  if (s.lesson) {
    const l = await prisma.lesson.findFirst({ where: { id: s.lesson, userId: user.id } });
    if (l) {
      let hasNext = false;
      if (l.kind === "category" && l.categoryId && l.lessonIndex) {
        const total = await prisma.question.count({ where: { ...publishedWhere, categoryId: l.categoryId } });
        hasNext = l.lessonIndex * 5 < total;
      }
      lesson = { kind: l.kind, categoryId: l.categoryId, lessonIndex: l.lessonIndex, hasNext };
    }
  }
  const firstOpen = questions.findIndex((q) => !reveals[q.id]);
  const initialIndex = reveals[questions[attempt.currentIndex]?.id] && firstOpen >= 0 ? firstOpen : attempt.currentIndex;

  return (
    <>
      {attempt.status === "IN_PROGRESS" && <StudyHeartbeat />}
      <QuizRunner
        attemptId={attempt.id}
        title={attempt.title}
        modeLabel={lesson ? "Mini-Lektion" : modeLabel[attempt.mode]}
        questions={questions}
        initialReveals={reveals}
        initialIndex={Math.max(0, initialIndex)}
        bookmarkedIds={bookmarks.map((b) => b.questionId)}
        finished={attempt.status !== "IN_PROGRESS"}
        isDailyChallenge={Boolean((attempt.settings as { dailyChallenge?: string } | null)?.dailyChallenge)}
        lesson={lesson}
      />
    </>
  );
}
