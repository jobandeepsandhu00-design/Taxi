import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { remainingSeconds } from "@/lib/quiz-logic";
import { finalizeExam } from "@/server/exam";
import { getPublicQuestions } from "@/server/questions";
import { ExamRunner } from "./exam-runner";

export const metadata: Metadata = { title: "Prüfung läuft" };

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const attempt = await prisma.examAttempt.findFirst({
    where: { id, userId: user.id },
    include: { examConfig: { select: { name: true } }, responses: { orderBy: { order: "asc" } } },
  });
  if (!attempt) notFound();
  if (attempt.status !== "IN_PROGRESS") redirect(`/pruefung/${attempt.id}/ergebnis`);
  if (remainingSeconds(attempt.expiresAt) <= 0) {
    await finalizeExam(attempt.id, "EXPIRED");
    redirect(`/pruefung/${attempt.id}/ergebnis`);
  }
  const questions = await getPublicQuestions(attempt.responses.map((r) => r.questionId));
  return (
    <ExamRunner
      attemptId={attempt.id}
      title={attempt.examConfig.name}
      expiresAt={attempt.expiresAt.toISOString()}
      serverNow={new Date().toISOString()}
      initialIndex={attempt.currentIndex}
      questions={questions}
      initialResponses={Object.fromEntries(
        attempt.responses.map((r) => [r.questionId, { selected: r.selectedOptionIds, marked: r.markedForReview }]),
      )}
    />
  );
}
