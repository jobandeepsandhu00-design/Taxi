import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, Clock, RotateCcw, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressRing } from "@/components/ui/progress";
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
      <section className={cn("animate-pop-in relative overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-10", passed ? "panel-night ring-1 ring-success/40" : "panel-night ring-1 ring-destructive/40")}>
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <ProgressRing value={pct} size={150} stroke={12} color="#fff" track="rgba(255,255,255,0.25)" label={`Ergebnis ${pct} Prozent`}>
            <span className="text-3xl font-extrabold">{pct.toLocaleString("de-AT")}%</span>
          </ProgressRing>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white/80">{attempt.examConfig.name}</p>
            <h1 className="mt-1 flex items-center justify-center gap-2 text-3xl font-extrabold sm:justify-start sm:text-4xl">
              {passed ? <CheckCircle2 className="size-8" /> : <XCircle className="size-8" />}
              {passed ? "Bestanden!" : "Nicht bestanden"}
            </h1>
            <p className="mt-2 text-white/90">
              {attempt.correctCount} von {attempt.totalCount} Fragen richtig · Bestehensgrenze {attempt.passPercentage} %
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1"><Clock className="size-4" /> {formatDuration(duration)}</span>
              <span className="rounded-full bg-white/20 px-3 py-1">{formatDate(attempt.startedAt, true)}</span>
              {attempt.status === "EXPIRED" && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1"><AlertTriangle className="size-4" /> Zeit abgelaufen</span>}
              {unanswered > 0 && <span className="rounded-full bg-white/20 px-3 py-1">{unanswered} unbeantwortet</span>}
            </div>
          </div>
        </div>
        {!attempt.examConfig.verified && (
          <p className="mt-6 rounded-xl bg-black/15 p-3 text-xs text-white/90">
            Hinweis: Diese Simulation basiert auf einer nicht verifizierten Übungsvorgabe und erlaubt keine Aussage über das Ergebnis der offiziellen Prüfung.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="navy"><Link href="/pruefung"><ClipboardCheck /> Neue Simulation</Link></Button>
        <Button asChild variant="outline"><Link href="/fehler"><RotateCcw /> Fehler trainieren</Link></Button>
        <Button asChild variant="ghost"><Link href="/dashboard">Zur Übersicht</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Ergebnis nach Kategorie</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...perCategory.values()].map((c) => {
            const p = Math.round((c.correct / c.total) * 100);
            return (
              <div key={c.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-foreground/85">{c.name}</span>
                  <span className="font-bold text-navy">{c.correct}/{c.total} · {p}%</span>
                </div>
                <Progress value={p} barClassName={p >= attempt.passPercentage ? "bg-success" : "bg-destructive"} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Auswertung aller Fragen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {attempt.responses.map((r, i) => (
            <details key={r.id} className="group rounded-xl border p-4 open:bg-muted/30">
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
