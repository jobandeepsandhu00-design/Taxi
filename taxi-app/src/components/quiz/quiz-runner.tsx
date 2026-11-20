"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Home, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { categoryColor } from "@/components/category-style";
import { CelebrationGate, type CelebrationItem } from "@/components/gamification/celebration-gate";
import { Button } from "@/components/ui/button";
import { achievementInfo } from "@/lib/gamification";
import { haptic, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { finishQuizAction, goToQuestionAction, repeatAttemptAction, submitQuizAnswerAction } from "@/server/actions/learning";
import type { AnswerReveal } from "@/server/questions";
import { QuestionCard } from "./question-card";
import { ResultHero, type CategoryScore } from "./result-hero";
import { SoundToggle } from "./sound-toggle";
import { SegmentedProgress, type SegmentState } from "./segmented-progress";
import { LessonResult, type LessonInfo } from "./lesson-result";
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
  isDailyChallenge?: boolean;
  lesson?: LessonInfo | null;
}

function categoryScores(questions: ClientQuestion[], reveals: Record<string, AnswerReveal>): CategoryScore[] {
  const map = new Map<string, CategoryScore>();
  for (const q of questions) {
    const r = reveals[q.id];
    if (!r) continue;
    const c = map.get(q.category.id) ?? { name: q.category.name, pct: 0, color: categoryColor(q.category.color).hex, correct: 0, total: 0 };
    c.total += 1;
    if (r.isCorrect) c.correct += 1;
    c.pct = Math.round((c.correct / c.total) * 100);
    map.set(q.category.id, c);
  }
  return [...map.values()].sort((a, b) => a.pct - b.pct);
}

export function QuizRunner({ attemptId, title, modeLabel, questions, initialReveals, initialIndex, bookmarkedIds, finished: initialFinished, isDailyChallenge = false, lesson = null }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(Math.min(initialIndex, questions.length - 1));
  const [direction, setDirection] = useState(1);
  const [reveals, setReveals] = useState<Record<string, AnswerReveal>>(initialReveals);
  const [finished, setFinished] = useState(initialFinished);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<number | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [celebrations, setCelebrations] = useState<CelebrationItem[]>([]);
  const [pending, start] = useTransition();
  const bookmarks = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const answeredCount = Object.keys(reveals).length;
  const correctCount = Object.values(reveals).filter((r) => r.isCorrect).length;
  const current = questions[index];
  const isLast = index === questions.length - 1;

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, i));
      setDirection(next >= index ? 1 : -1);
      setIndex(next);
      goToQuestionAction(attemptId, next).catch(() => {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [attemptId, questions.length, index],
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
    haptic();
    if (isLast) {
      const firstOpen = questions.findIndex((q) => !reveals[q.id]);
      if (firstOpen >= 0) goTo(firstOpen);
      else finish();
    } else goTo(index + 1);
  }, [current, reveals, isLast, questions, goTo, finish, index]);

  const onRevealed = useCallback(
    (r: AnswerReveal) => {
      setReveals((prev) => ({ ...prev, [current.id]: r }));
      const nextCombo = r.isCorrect ? combo + 1 : 0;
      setCombo(nextCombo);
      if (nextCombo >= 3) {
        setComboFlash(nextCombo);
        window.setTimeout(() => playSound("streak"), 250);
        window.setTimeout(() => setComboFlash((c) => (c === nextCombo ? null : c)), 1800);
      }
      if (r.reward) {
        setSessionXp((x) => x + r.reward!.xpGained);
        const items: CelebrationItem[] = [];
        if (r.reward.levelUp) {
          const info = achievementInfo(`level-${r.reward.levelUp.index}`);
          if (info) items.push({ key: info.key, title: info.title, desc: info.desc, emoji: info.emoji, isLevel: true, levelIndex: info.levelIndex });
        }
        for (const u of r.reward.unlocked) {
          const info = achievementInfo(u.key);
          if (info) items.push({ key: u.key, title: info.title, desc: info.desc, emoji: info.emoji, isLevel: false, levelIndex: -1 });
        }
        if (items.length) {
          if (r.reward.levelUp) window.setTimeout(() => playSound("levelUp"), 400);
          window.setTimeout(() => setCelebrations((c) => [...c, ...items]), 1100);
        }
      }
    },
    [current, combo],
  );

  const segments: SegmentState[] = questions.map((q) => (reveals[q.id] ? (reveals[q.id].isCorrect ? "correct" : "wrong") : "open"));

  if (finished && lesson) {
    return <LessonResult correct={correctCount} total={questions.length} xp={sessionXp} lesson={lesson} results={questions.map((q) => Boolean(reveals[q.id]?.isCorrect))} />;
  }

  if (finished) {
    const pct = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
    const wrong = questions.filter((q) => reveals[q.id] && !reveals[q.id].isCorrect);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <ResultHero pct={pct} passed={pct >= 70} title="Sitzung abgeschlossen" subtitle={title} correct={correctCount} total={answeredCount} categories={categoryScores(questions, reveals)} xp={sessionXp || undefined}>
          <div className="mx-auto grid max-w-sm grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="font-display text-xl font-bold text-white">{answeredCount}</p>
              <p className="text-xs text-white/70">beantwortet</p>
            </div>
            <div className="rounded-xl bg-success/20 p-3">
              <p className="font-display text-xl font-bold text-success">{correctCount}</p>
              <p className="text-xs text-white/70">richtig</p>
            </div>
            <div className="rounded-xl bg-destructive/20 p-3">
              <p className="font-display text-xl font-bold text-red-300">{answeredCount - correctCount}</p>
              <p className="text-xs text-white/70">falsch</p>
            </div>
          </div>
          {isDailyChallenge && (
            <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
              <Link href="/challenge">🏆 Zur Rangliste</Link>
            </Button>
          )}
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {!isDailyChallenge && wrong.length > 0 && (
              <form action={repeatAttemptAction}>
                <input type="hidden" name="attemptId" value={attemptId} />
                <input type="hidden" name="onlyWrong" value="1" />
                <Button type="submit" className="w-full">
                  <RotateCcw /> Fehler wiederholen ({wrong.length})
                </Button>
              </form>
            )}
            {!isDailyChallenge && <form action={repeatAttemptAction}>
              <input type="hidden" name="attemptId" value={attemptId} />
              <Button type="submit" variant="outline" className="w-full border-white/20 bg-white/5 text-white">
                <RotateCcw /> Alle wiederholen
              </Button>
            </form>}
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white">
              <Link href="/dashboard">
                <Home /> Zur Übersicht
              </Link>
            </Button>
          </div>
        </ResultHero>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-bold text-navy">Deine Antworten</h2>
          <ul className="mt-3 divide-y divide-border">
            {questions.map((q, i) => {
              const r = reveals[q.id];
              return (
                <li key={q.id} className="flex items-start gap-3 py-3 text-sm">
                  {r ? r.isCorrect ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <XCircle className="size-5 shrink-0 text-destructive" /> : <span className="size-5 shrink-0 rounded-full border-2" />}
                  <span className="flex-1 text-foreground/85">
                    {i + 1}. {q.text}
                  </span>
                  <Link href={`/fragen/${q.id}`} className="shrink-0 text-xs font-semibold text-link hover:underline">
                    Ansehen
                  </Link>
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
            <p className="text-xs font-bold tracking-wider text-link uppercase">{modeLabel}</p>
            <h1 className="truncate text-lg font-bold text-navy sm:text-xl">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SoundToggle />
            <Button variant="outline" size="sm" onClick={finish} disabled={pending}>
              <Flag /> Beenden
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedProgress segments={segments} current={index} label={`${answeredCount} von ${questions.length} beantwortet`} pop={Boolean(lesson)} />
          <span className="shrink-0 font-display text-sm font-bold text-navy tabular-nums">
            {index + 1} / {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="text-success">✓ {correctCount} richtig</span>
          <span className="text-destructive">✗ {answeredCount - correctCount} falsch</span>
          {combo >= 2 && <span className="ml-auto text-link">🔥 {combo} in Folge</span>}
        </div>
      </div>

      {/* Kombo-Banner */}
      <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center" aria-live="polite">
        <AnimatePresence>
          {comboFlash && (
            <motion.div
              key={comboFlash}
              className="rounded-full bg-primary px-5 py-2.5 font-display text-lg font-bold text-primary-foreground shadow-[0_10px_40px_-8px_var(--glow)]"
              initial={{ scale: 0.3, opacity: 0, y: -20 }}
              animate={{ scale: [0.3, 1.18, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
            >
              🔥 {comboFlash}er Serie!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <QuestionCard
        key={current.id}
        direction={direction}
        question={current}
        bookmarked={bookmarks.has(current.id)}
        initialReveal={reveals[current.id] ?? null}
        onSubmit={(selectedOptionIds, timeSpentSec, unsure) => submitQuizAnswerAction({ attemptId, questionId: current.id, selectedOptionIds, timeSpentSec, unsure })}
        onRevealed={onRevealed}
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

      <nav aria-label="Fragenübersicht" className="glass flex flex-wrap gap-1.5 rounded-2xl p-3">
        {questions.map((q, i) => {
          const r = reveals[q.id];
          return (
            <motion.button
              key={q.id}
              type="button"
              onClick={() => goTo(i)}
              whileTap={{ scale: 0.9 }}
              layout
              transition={spring}
              aria-label={`Frage ${i + 1}${r ? (r.isCorrect ? ", richtig" : ", falsch") : ""}`}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "size-8 rounded-lg font-display text-xs font-bold transition-colors",
                i === index && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                r ? (r.isCorrect ? "bg-success text-white" : "bg-destructive text-white") : "bg-foreground/8 text-foreground/75 hover:bg-foreground/15",
              )}
            >
              {i + 1}
            </motion.button>
          );
        })}
      </nav>

      {celebrations.length > 0 && <CelebrationGate key={celebrations.map((c) => c.key).join()} items={celebrations} onDone={() => setCelebrations([])} />}
    </div>
  );
}
