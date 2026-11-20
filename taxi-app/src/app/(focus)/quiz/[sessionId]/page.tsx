import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FocusRunner } from "@/components/focus/focus-runner";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { StudyHeartbeat } from "@/components/quiz/study-heartbeat";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { modeLabel } from "@/lib/labels";
import { remainingSeconds } from "@/lib/quiz-logic";
import { finalizeExam } from "@/server/exam";
import { buildReveal, getAnswerKey, getPublicQuestions, publishedWhere, type AnswerReveal } from "@/server/questions";

export const metadata: Metadata = { title: "Fokus-Modus" };

export default async function FocusQuizPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;

  // 1) Prüfungssimulation?
  const exam = await prisma.examAttempt.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { examConfig: { select: { name: true } }, responses: { orderBy: { order: "asc" } } },
  });
  if (exam) {
    if (exam.status === "ABANDONED") redirect("/pruefung");
    if (exam.status !== "IN_PROGRESS") redirect(`/pruefung/${exam.id}/ergebnis`);
    if (remainingSeconds(exam.expiresAt) <= 0) {
      await finalizeExam(exam.id, "EXPIRED");
      redirect(`/pruefung/${exam.id}/ergebnis`);
    }
    const questions = await getPublicQuestions(exam.responses.map((r) => r.questionId));
    return (
      <FocusRunner
        title={exam.examConfig.name}
        questions={questions}
        initialIndex={exam.currentIndex}
        bookmarkedIds={[]}
        mode={{
          kind: "exam",
          attemptId: exam.id,
          expiresAt: exam.expiresAt.toISOString(),
          serverNow: new Date().toISOString(),
          initialResponses: Object.fromEntries(exam.responses.map((r) => [r.questionId, { selected: r.selectedOptionIds, marked: r.markedForReview }])),
        }}
      />
    );
  }

  // 2) Lernsitzung (Lektion, Quiz, Fehlertraining, Wiederholung, Lernmodus)
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!attempt) notFound();
  const [questions, answers, bookmarks] = await Promise.all([
    getPublicQuestions(attempt.questionIds),
    prisma.userAnswer.findMany({ where: { quizAttemptId: attempt.id }, orderBy: { createdAt: "asc" } }),
    prisma.bookmark.findMany({ where: { userId: user.id, questionId: { in: attempt.questionIds } }, select: { questionId: true } }),
  ]);
  if (questions.length === 0) notFound();
  const reveals: Record<string, AnswerReveal> = {};
  for (const a of answers) {
    const key = await getAnswerKey(a.questionId);
    if (key) reveals[a.questionId] = buildReveal(key, a.selectedOptionIds, a.isCorrect);
  }
  const s = (attempt.settings ?? {}) as { lesson?: string; dailyChallenge?: string; flags?: string[] };
  let lesson: { kind: string; categoryId: string | null; lessonIndex: number | null; hasNext: boolean } | null = null;
  if (s.lesson) {
    const l = await prisma.lesson.findFirst({ where: { id: s.lesson, userId: user.id } });
    if (l) {
      const hasNext = l.kind === "category" && l.categoryId && l.lessonIndex ? (await prisma.question.count({ where: { ...publishedWhere, categoryId: l.categoryId, lessonIndex: l.lessonIndex + 1 } })) > 0 : false;
      lesson = { kind: l.kind, categoryId: l.categoryId, lessonIndex: l.lessonIndex, hasNext };
    }
  }
  const label = lesson ? "Mini-Lektion" : modeLabel[attempt.mode];
  const firstOpen = questions.findIndex((q) => !reveals[q.id]);
  const initialIndex = reveals[questions[attempt.currentIndex]?.id] && firstOpen >= 0 ? firstOpen : attempt.currentIndex;

  // Abgeschlossene Sitzung: bestehender Ergebnis-Screen (scrollbar, mit Schließen-Knopf)
  if (attempt.status !== "IN_PROGRESS") {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-background" style={{ padding: "env(safe-area-inset-top, 0px) max(16px, env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px) max(16px, env(safe-area-inset-left, 0px))" }}>
        <div className="py-6">
          <QuizRunner attemptId={attempt.id} title={attempt.title} modeLabel={label} questions={questions} initialReveals={reveals} initialIndex={0} bookmarkedIds={bookmarks.map((b) => b.questionId)} finished isDailyChallenge={Boolean(s.dailyChallenge)} lesson={lesson} />
        </div>
      </div>
    );
  }

  return (
    <>
      <StudyHeartbeat />
      <FocusRunner
        title={attempt.title}
        questions={questions}
        initialIndex={Math.max(0, initialIndex)}
        bookmarkedIds={bookmarks.map((b) => b.questionId)}
        mode={{ kind: "learn", attemptId: attempt.id, modeLabel: label, initialReveals: reveals, initialFlags: s.flags ?? [], lesson, isDailyChallenge: Boolean(s.dailyChallenge) }}
      />
    </>
  );
}
