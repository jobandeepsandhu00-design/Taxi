import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StudyHeartbeat } from "@/components/quiz/study-heartbeat";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPublicQuestions, publishedWhere } from "@/server/questions";
import { SingleQuestion } from "./single-question";

export const metadata: Metadata = { title: "Frage üben" };

export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const exists = await prisma.question.findFirst({ where: { id, ...publishedWhere }, select: { id: true, category: { select: { slug: true } } } });
  if (!exists) notFound();
  const [[question], bookmark, history] = await Promise.all([
    getPublicQuestions([id]),
    prisma.bookmark.findUnique({ where: { userId_questionId: { userId: user.id, questionId: id } } }),
    prisma.userAnswer.findMany({ where: { userId: user.id, questionId: id }, select: { isCorrect: true } }),
  ]);
  const correct = history.filter((h) => h.isCorrect).length;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <StudyHeartbeat />
      <div className="flex items-center justify-between">
        <Link href={`/lernen/${exists.category.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-navy">
          <ArrowLeft className="size-4" /> Zur Kategorie
        </Link>
        {history.length > 0 && (
          <span className="text-xs text-muted-foreground">Bisher {history.length}× beantwortet, davon {correct}× richtig</span>
        )}
      </div>
      <SingleQuestion question={question} bookmarked={Boolean(bookmark)} />
    </div>
  );
}
