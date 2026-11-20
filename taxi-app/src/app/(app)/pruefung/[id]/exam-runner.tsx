"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Bookmark, Flag, Loader2, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ClientQuestion } from "@/components/quiz/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedProgress } from "@/components/quiz/segmented-progress";
import { TimerRing } from "@/components/quiz/timer-ring";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { saveExamResponseAction, submitExamAction } from "@/server/actions/exam";

interface ResponseState {
  selected: string[];
  marked: boolean;
}

interface Props {
  attemptId: string;
  title: string;
  expiresAt: string;
  durationSec: number;
  serverNow: string;
  initialIndex: number;
  questions: ClientQuestion[];
  initialResponses: Record<string, ResponseState>;
}

export function ExamRunner({ attemptId, title, expiresAt, durationSec, serverNow, initialIndex, questions, initialResponses }: Props) {
  const [index, setIndex] = useState(Math.min(initialIndex, questions.length - 1));
  const [direction, setDirection] = useState(1);
  const [responses, setResponses] = useState<Record<string, ResponseState>>(initialResponses);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);

  // Uhrzeitabweichung zwischen Server und Client ausgleichen
  const offset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const deadline = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((deadline - (Date.now() + offset)) / 1000)));

  const current = questions[index];
  const resp = responses[current.id] ?? { selected: [], marked: false };
  const answered = questions.filter((q) => (responses[q.id]?.selected.length ?? 0) > 0).length;
  const markedCount = questions.filter((q) => responses[q.id]?.marked).length;

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmit(async () => {
      await submitExamAction(attemptId);
      // Vollständige Navigation: zuverlässig trotz gleichzeitiger Revalidierung durch die Server-Action
      window.location.replace(`/pruefung/${attemptId}/ergebnis`);
    });
  }, [attemptId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.floor((deadline - (Date.now() + offset)) / 1000));
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        submit();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [deadline, offset, submit]);

  // Warnung beim Verlassen der Seite
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const persist = useCallback(
    async (questionId: string, patch: { selectedOptionIds?: string[]; markedForReview?: boolean; currentIndex?: number }) => {
      const res = await saveExamResponseAction({ attemptId, questionId, ...patch });
      if (!res.ok) setSaveError(res.error);
      else {
        setSaveError(null);
        if (res.data.expired) {
          submittedRef.current = true;
          window.location.replace(`/pruefung/${attemptId}/ergebnis`);
        }
      }
    },
    [attemptId],
  );

  const toggleOption = (optionId: string) => {
    haptic(8);
    const prev = resp.selected;
    const next = current.multipleCorrect ? (prev.includes(optionId) ? prev.filter((x) => x !== optionId) : [...prev, optionId]) : [optionId];
    setResponses((r) => ({ ...r, [current.id]: { ...resp, selected: next } }));
    persist(current.id, { selectedOptionIds: next });
  };

  const toggleMark = () => {
    const marked = !resp.marked;
    setResponses((r) => ({ ...r, [current.id]: { ...resp, marked } }));
    persist(current.id, { markedForReview: marked });
  };

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(questions.length - 1, i));
    haptic();
    setDirection(next >= index ? 1 : -1);
    setIndex(next);
    persist(questions[next].id, { currentIndex: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  return (
    <div className="mx-auto max-w-5xl">
      {/* Kopfzeile mit Countdown */}
      <div className="sticky top-16 z-20 -mx-4 mb-4 border-b bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wider text-link uppercase">Prüfungssimulation</p>
            <p className="truncate font-extrabold text-navy">{title}</p>
          </div>
          <TimerRing remaining={remaining} total={durationSec} />
        </div>
        <div className="mt-2">
          <SegmentedProgress
            segments={questions.map((q) => (responses[q.id]?.marked ? "marked" : (responses[q.id]?.selected.length ?? 0) > 0 ? "answered" : "open"))}
            current={index}
            label={`${answered} von ${questions.length} beantwortet`}
          />
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>{answered}/{questions.length} beantwortet</span>
          <span className="text-warning">{markedCount} markiert</span>
          {saveError && <span className="text-destructive">Speichern fehlgeschlagen: {saveError}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <motion.div
            className="glass rounded-2xl p-5 sm:p-7"
            key={current.id}
            initial={{ opacity: 0, x: direction * 60, rotateY: direction * 14 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={spring}
            style={{ transformPerspective: 1200 }}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="navy">Frage {index + 1} von {questions.length}</Badge>
              <Badge variant="outline">{current.category.name}</Badge>
              <button
                type="button"
                onClick={toggleMark}
                aria-pressed={resp.marked}
                className={cn(
                  "ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition",
                  resp.marked ? "border-warning/40 bg-warning/10 text-warning" : "text-foreground/75 hover:bg-muted",
                )}
              >
                <Bookmark className={cn("size-3.5", resp.marked && "fill-current")} /> {resp.marked ? "Markiert" : "Zur Überprüfung markieren"}
              </button>
            </div>
            {current.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.imageUrl} alt="Abbildung zur Frage" className="mb-4 max-h-72 w-full rounded-xl border object-contain" />
            )}
            <h2 className="text-lg leading-relaxed font-bold text-navy sm:text-xl">{current.text}</h2>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">{current.multipleCorrect ? "Mehrfachauswahl möglich" : "Eine Antwort ist richtig"}</p>
            <div role={current.multipleCorrect ? "group" : "radiogroup"} className="mt-5 space-y-2.5">
              {current.options.map((o) => {
                const selected = resp.selected.includes(o.id);
                return (
                  <motion.button
                    key={o.id}
                    type="button"
                    role={current.multipleCorrect ? "checkbox" : "radio"}
                    aria-checked={selected}
                    onClick={() => toggleOption(o.id)}
                    disabled={submitting}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.1 + current.options.indexOf(o) * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[15px] transition",
                      selected ? "border-primary bg-primary/10 shadow-[0_0_24px_-8px_var(--glow)]" : "border-border bg-white/[0.02] hover:border-primary/50",
                    )}
                  >
                    <span className={cn("flex size-7 shrink-0 items-center justify-center font-display text-sm font-bold", current.multipleCorrect ? "rounded-lg" : "rounded-full", selected ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-foreground/75")}>
                      {o.label}
                    </span>
                    <span className="flex-1 pt-0.5 text-foreground">{o.text}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ArrowLeft /> Zurück
            </Button>
            {index < questions.length - 1 ? (
              <Button onClick={() => goTo(index + 1)}>
                Weiter <ArrowRight />
              </Button>
            ) : (
              <Button variant="navy" onClick={() => setConfirmOpen(true)}>
                <Send /> Prüfung abgeben
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl glass p-4">
            <p className="mb-3 text-sm font-bold text-navy">Fragennavigation</p>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
              {questions.map((q, i) => {
                const r = responses[q.id];
                const isAnswered = (r?.selected.length ?? 0) > 0;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Frage ${i + 1}${isAnswered ? ", beantwortet" : ", offen"}${r?.marked ? ", markiert" : ""}`}
                    aria-current={i === index ? "step" : undefined}
                    className={cn(
                      "relative h-9 rounded-lg text-xs font-bold transition",
                      i === index && "ring-2 ring-primary ring-offset-1",
                      isAnswered ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-foreground/75 hover:bg-foreground/15",
                    )}
                  >
                    {i + 1}
                    {r?.marked && <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-background bg-warning" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-primary" /> beantwortet</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded bg-foreground/15" /> offen</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-warning" /> markiert</span>
            </div>
          </div>
          <Button variant="navy" className="w-full" onClick={() => setConfirmOpen(true)}>
            <Flag /> Prüfung abgeben
          </Button>
        </aside>
      </div>

      <AnimatePresence>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="relative w-full max-w-md rounded-3xl border border-border bg-card-solid p-6 shadow-2xl" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={spring}>
            <button type="button" onClick={() => setConfirmOpen(false)} className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-muted" aria-label="Schließen">
              <X className="size-5" />
            </button>
            <h2 id="confirm-title" className="text-xl font-extrabold text-navy">Prüfung abgeben?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Nach der Abgabe kannst du keine Antworten mehr ändern.</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li className="flex justify-between"><span>Beantwortet</span><strong>{answered} / {questions.length}</strong></li>
              <li className="flex justify-between"><span>Unbeantwortet</span><strong className={answered < questions.length ? "text-destructive" : ""}>{questions.length - answered}</strong></li>
              <li className="flex justify-between"><span>Zur Überprüfung markiert</span><strong className={markedCount ? "text-warning" : ""}>{markedCount}</strong></li>
            </ul>
            {answered < questions.length && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="size-4 shrink-0" /> Unbeantwortete Fragen werden als falsch gewertet.
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Weiter bearbeiten</Button>
              <Button variant="navy" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Send />} Abgeben
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
