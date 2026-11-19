import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, Clock, RotateCcw, X, XCircle } from "lucide-react";
import { ResultHero } from "@/components/quiz/result-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cn, formatDate, formatDuration } from "@/lib/utils";

export const metadata: Metadata = { title: "Prüfungsergebnis" };

export default async function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const attempt = await prisma.examAttempt.findFirst({
    where: { id, userId: user.id },
    include: {
      examConfig: true,
      responses: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              explanation: true,
              category: { select: { id: true, name: true } },
              options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true, isCorrect: true, explanation: true } },
            },
          },
        },
      },
    },
  });
  if (!attempt) notFound();
  if (attempt.status === "IN_PROGRESS") redirect(`/pruefung/${attempt.id}`);

  const passed = Boolean(attempt.passed);
  const pct = attempt.scorePercent ?? 0;
  const duration = attempt.submittedAt ? Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000) : 0;
  const unanswered = attempt.responses.filter((r) => r.selectedOptionIds.length === 0).length;
  const perCategory = new Map<string, { name: string; total: number; correct: number }>();
  for (const r of attempt.responses) {
    const c = perCategory.get(r.question.category.id) ?? { name: r.question.category.name, total: 0, correct: 0 };
    c.total += 1;
    if (r.isCorrect) c.correct += 1;
    perCategory.set(r.question.category.id, c);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ResultHero
        pct={Math.round(pct)}
        passed={passed}
        title={passed ? "Bestanden!" : "Nicht bestanden"}
        subtitle={`${attempt.examConfig.name} · ${attempt.correctCount} von ${attempt.totalCount} Fragen richtig · Bestehensgrenze ${attempt.passPercentage} %`}
        correct={attempt.correctCount ?? 0}
        total={attempt.totalCount}
        categories={[...perCategory.values()].map((c) => {
          const p = Math.round((c.correct / c.total) * 100);
          return { name: c.name, correct: c.correct, total: c.total, pct: p, color: p >= attempt.passPercentage ? "#22c55e" : "#ef4444" };
        })}
      >
        <div className="flex flex-wrap justify-center gap-2 text-sm text-white">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1"><Clock className="size-4" /> {formatDuration(duration)}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{formatDate(attempt.startedAt, true)}</span>
          {attempt.status === "EXPIRED" && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1"><AlertTriangle className="size-4" /> Zeit abgelaufen</span>}
          {unanswered > 0 && <span className="rounded-full bg-white/10 px-3 py-1">{unanswered} unbeantwortet</span>}
        </div>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild><Link href="/fehler"><RotateCcw /> Fehler wiederholen</Link></Button>
          <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white"><Link href="/pruefung"><ClipboardCheck /> Nochmal</Link></Button>
          <Button asChild variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white"><Link href="/dashboard">Zur Übersicht</Link></Button>
        </div>
        {!attempt.examConfig.verified && (
          <p className="mt-6 rounded-xl bg-black/20 p-3 text-xs text-white/80">
            Hinweis: Diese Simulation basiert auf einer nicht verifizierten Übungsvorgabe und erlaubt keine Aussage über das Ergebnis der offiziellen Prüfung.
          </p>
        )}
      </ResultHero>

      <Card>
        <CardHeader><CardTitle>Auswertung aller Fragen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {attempt.responses.map((r, i) => (
            <details key={r.id} className="group rounded-xl border border-border p-4 open:bg-muted">
              <summary className="flex cursor-pointer list-none items-start gap-3">
                {r.isCorrect ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />}
                <span className="flex-1 text-sm font-medium text-foreground">{i + 1}. {r.question.text}</span>
                {r.markedForReview && <span className="text-[11px] font-bold text-warning">markiert</span>}
              </summary>
              <ul className="mt-3 space-y-1.5 pl-8">
                {r.question.options.map((o) => {
                  const chosen = r.selectedOptionIds.includes(o.id);
                  return (
                    <li key={o.id} className={cn("rounded-lg p-2 text-sm", o.isCorrect ? "bg-success/10" : chosen ? "bg-destructive/10" : "")}>
                      <span className="flex items-start gap-2">
                        {o.isCorrect ? <Check className="mt-0.5 size-4 text-success" /> : chosen ? <X className="mt-0.5 size-4 text-destructive" /> : <span className="size-4" />}
                        <span>
                          <strong>{o.label})</strong> {o.text} {chosen && <em className="text-xs text-muted-foreground">(deine Antwort)</em>}
                          {o.explanation && <span className="block text-xs text-muted-foreground">{o.explanation}</span>}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {r.selectedOptionIds.length === 0 && <p className="mt-2 pl-8 text-xs font-semibold text-destructive">Nicht beantwortet</p>}
              <p className="mt-3 pl-8 text-sm text-foreground/75"><strong className="text-navy">Erklärung:</strong> {r.question.explanation}</p>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
