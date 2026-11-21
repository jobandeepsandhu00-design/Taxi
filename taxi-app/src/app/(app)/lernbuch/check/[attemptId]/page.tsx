import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, RotateCcw, Trophy, X } from "lucide-react";
import { ChapterCheckButton } from "@/components/lernbuch/chapter-actions";
import { ProgressRing } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { CHECK_PASS_PERCENT, topicIdForSlug } from "@/lib/lernbuch";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Kapitel-Check – Ergebnis" };

export default async function CheckResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  const categoryId = (attempt?.settings as { chapterCheck?: string } | null)?.chapterCheck;
  if (!attempt || !categoryId) notFound();
  const [category, answers, progress] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { name: true, slug: true } }),
    prisma.userAnswer.findMany({ where: { quizAttemptId: attempt.id }, select: { questionId: true, isCorrect: true } }),
    prisma.chapterProgress.findUnique({ where: { userId_categoryId: { userId: user.id, categoryId } } }),
  ]);
  if (!category) notFound();
  const questions = await prisma.question.findMany({ where: { id: { in: attempt.questionIds } }, select: { id: true, text: true } });
  const total = attempt.questionIds.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const passed = score >= CHECK_PASS_PERCENT;
  const chapterHref = `/lernbuch/${topicIdForSlug(category.slug)}/${category.slug}`;
  const wrong = attempt.questionIds.filter((id) => !answers.find((a) => a.questionId === id)?.isCorrect);
  const order = new Map(attempt.questionIds.map((id, i) => [id, i]));
  return (
    <div className="mx-auto max-w-xl">
      <div className="glass flex flex-col items-center gap-4 rounded-3xl p-6 text-center" data-testid="check-result">
        <p className="text-xs font-bold tracking-wider text-link uppercase">Kapitel-Check · {category.name}</p>
        <ProgressRing value={score} size={132} color={passed ? "var(--success)" : "var(--warning)"} label={`${score} %`} glow={passed}>
          <span className="text-3xl font-extrabold text-navy">{score}%</span>
          <span className="text-xs font-semibold text-muted-foreground">{correct}/{total} richtig</span>
        </ProgressRing>
        {passed ? (
          <>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-navy"><Trophy className="size-6 text-primary" /> Bestanden!</h1>
            <p className="text-sm text-muted-foreground">Das Kapitel ist jetzt fürs Quiz und die Prüfungssimulation freigeschaltet.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-navy">Fast geschafft</h1>
            <p className="text-sm text-muted-foreground">Für die Freischaltung brauchst du {CHECK_PASS_PERCENT} %. Lies die markierten Karten nochmal und versuch es erneut.</p>
          </>
        )}
        {progress?.checkScore != null && progress.checkScore > score && <p className="text-xs text-muted-foreground">Dein bestes Ergebnis: {progress.checkScore} %</p>}
      </div>

      {wrong.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 font-extrabold text-navy">Diese Fragen nochmal lesen</h2>
          <ul className="space-y-2">
            {questions
              .filter((q) => wrong.includes(q.id))
              .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
              .map((q) => (
                <li key={q.id} className="glass flex items-start gap-2 rounded-xl p-3 text-sm">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" /> {q.text}
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {passed ? (
          <Link href="/lernbuch" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground" data-testid="check-next">
            <Check className="size-4" /> Weiter im Lernbuch
          </Link>
        ) : (
          <ChapterCheckButton categoryId={categoryId} ready remaining={0} score={progress?.checkScore ?? null} />
        )}
        <Link href={chapterHref} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border font-bold">
          <RotateCcw className="size-4" /> Zum Kapitel
        </Link>
      </div>
    </div>
  );
}
