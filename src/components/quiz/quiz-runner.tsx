"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Home, RotateCcw, Trophy, XCircle } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { finishQuizAction, goToQuestionAction, repeatAttemptAction, submitQuizAnswerAction } from "@/server/actions/learning";
import type { AnswerReveal } from "@/server/questions";
import { QuestionCard } from "./question-card";
import type { ClientQuestion } from "./types";

interface Props {
  attemptId: string;
  title: string;
  modeLabel: string;
  questions: ClientQuestion[];
  initialReveals: Record<string, AnswerReveal>;
  initialIndex: number;
  bookmarkedIds: string[];
  finished: boolean;
}

export function QuizRunner({ attemptId, title, modeLabel, questions, initialReveals, initialIndex, bookmarkedIds, finished: initialFinished }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(Math.min(initialIndex, questions.length - 1));
  const [reveals, setReveals] = useState<Record<string, AnswerReveal>>(initialReveals);
  const [finished, setFinished] = useState(initialFinished);
  const [pending, start] = useTransition();
  const bookmarks = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const answeredCount = Object.keys(reveals).length;
  const correctCount = Object.values(reveals).filter((r) => r.isCorrect).length;
  const current = questions[index];
  const isLast = index === questions.length - 1;

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, i));
      setIndex(next);
      goToQuestionAction(attemptId, next).catch(() => {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [attemptId, questions.length],
  );

  const finish = useCallback(() => {
    start(async () => {
      await finishQuizAction(attemptId);
      setFinished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });
  }, [attemptId, router]);

  const next = useCallback(() => {
    if (!reveals[current.id]) return;
    if (isLast) {
      const firstOpen = questions.findIndex((q) => !reveals[q.id]);
      if (firstOpen >= 0) goTo(firstOpen);
      else finish();
    } else goTo(index + 1);
  }, [current, reveals, isLast, questions, goTo, finish, index]);

  if (finished) {
    const pct = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
    const wrong = questions.filter((q) => reveals[q.id] && !reveals[q.id].isCorrect);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="animate-pop-in rounded-3xl border bg-white p-6 text-center shadow-sm sm:p-10">
          <Trophy className="mx-auto size-10 text-amber-500" />
          <h1 className="mt-3 text-2xl font-extrabold text-navy">Sitzung abgeschlossen</h1>
          <p className="text-muted-foreground">{title}</p>
          <div className="my-6 flex justify-center">
            <ProgressRing value={pct} size={150} stroke={12} color={pct >= 70 ? "#059669" : pct >= 50 ? "#d97706" : "#e11d48"}>
              <span className="text-3xl font-extrabold text-navy">{pct}%</span>
              <span className="text-xs text-muted-foreground">richtig</span>
            </ProgressRing>
          </div>
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted p-3"><p className="text-xl font-extrabold text-navy">{answeredCount}</p><p className="text-xs text-muted-foreground">beantwortet</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xl font-extrabold text-emerald-700">{correctCount}</p><p className="text-xs text-muted-foreground">richtig</p></div>
            <div className="rounded-xl bg-rose-50 p-3"><p className="text-xl font-extrabold text-rose-700">{answeredCount - correctCount}</p><p className="text-xs text-muted-foreground">falsch</p></div>
          </div>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            {wrong.length > 0 && (
              <form action={repeatAttemptAction}>
                <input type="hidden" name="attemptId" value={attemptId} />
                <input type="hidden" name="onlyWrong" value="1" />
                <Button type="submit" variant="destructive" className="w-full"><RotateCcw /> Falsche wiederholen ({wrong.length})</Button>
              </form>
            )}
            <form action={repeatAttemptAction}>
              <input type="hidden" name="attemptId" value={attemptId} />
              <Button type="submit" variant="outline" className="w-full"><RotateCcw /> Alle wiederholen</Button>
            </form>
            <Button asChild><Link href="/dashboard"><Home /> Zur Übersicht</Link></Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-extrabold text-navy">Deine Antworten</h2>
          <ul className="mt-3 divide-y">
            {questions.map((q, i) => {
              const r = reveals[q.id];
              return (
                <li key={q.id} className="flex items-start gap-3 py-3 text-sm">
                  {r ? r.isCorrect ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" /> : <XCircle className="size-5 shrink-0 text-rose-600" /> : <span className="size-5 shrink-0 rounded-full border-2" />}
                  <span className="flex-1 text-slate-700">{i + 1}. {q.text}</span>
                  <Link href={`/fragen/${q.id}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">Ansehen</Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">{modeLabel}</p>
            <h1 className="truncate text-lg font-extrabold text-navy sm:text-xl">{title}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={finish} disabled={pending}>
            <Flag /> Beenden
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={(answeredCount / questions.length) * 100} className="h-2.5" />
          <span className="shrink-0 text-sm font-bold text-navy">{index + 1} / {questions.length}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="text-emerald-700">✓ {correctCount} richtig</span>
          <span className="text-rose-700">✗ {answeredCount - correctCount} falsch</span>
        </div>
      </div>

      <QuestionCard
        key={current.id}
        question={current}
        bookmarked={bookmarks.has(current.id)}
        initialReveal={reveals[current.id] ?? null}
        onSubmit={(selectedOptionIds, timeSpentSec) => submitQuizAnswerAction({ attemptId, questionId: current.id, selectedOptionIds, timeSpentSec })}
        onRevealed={(r) => setReveals((prev) => ({ ...prev, [current.id]: r }))}
        onNext={next}
        nextSlot={
          <Button size="lg" className="w-full shadow-lg" onClick={next} disabled={pending}>
            {isLast && questions.every((q) => reveals[q.id] || q.id === current.id) ? "Ergebnis anzeigen" : "Nächste Frage"} <ArrowRight />
          </Button>
        }
      />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ArrowLeft /> Zurück
        </Button>
        <Button variant="ghost" size="sm" onClick={() => goTo(index + 1)} disabled={isLast}>
          Überspringen <ArrowRight />
        </Button>
      </div>

      <nav aria-label="Fragenübersicht" className="flex flex-wrap gap-1.5 rounded-2xl border bg-white p-3">
        {questions.map((q, i) => {
          const r = reveals[q.id];
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Frage ${i + 1}${r ? (r.isCorrect ? ", richtig" : ", falsch") : ""}`}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "size-8 rounded-lg text-xs font-bold transition",
                i === index && "ring-2 ring-primary ring-offset-1",
                r ? (r.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
