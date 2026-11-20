"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { ExternalLink, Info, Languages, Loader2, Scale, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { OriginBadge } from "@/components/origin-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { AnswerReveal } from "@/server/questions";
import type { ActionResult } from "@/server/actions/types";
import { BookmarkButton } from "./bookmark-button";
import { SpeakButton } from "./speak-button";
import { TranslateSheet } from "./translate-sheet";
import { useCoach } from "@/components/coach/coach-provider";
import { WhyPanel } from "@/components/coach/why-panel";
import { simplifyQuestionAction } from "@/server/actions/coach";
import type { ClientQuestion } from "./types";

interface Props {
  question: ClientQuestion;
  bookmarked: boolean;
  initialReveal?: AnswerReveal | null;
  onSubmit: (selectedOptionIds: string[], timeSpentSec: number) => Promise<ActionResult<AnswerReveal>>;
  onRevealed?: (reveal: AnswerReveal) => void;
  /** Wird nach dem Aufdecken angezeigt (z. B. „Nächste Frage“) */
  nextSlot?: React.ReactNode;
  onNext?: () => void;
  headerSlot?: React.ReactNode;
  /** Einflugrichtung der Karte (1 = von rechts, -1 = von links) */
  direction?: number;
}

/** Häkchen, das sich selbst zeichnet */
function DrawCheck() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }} />
    </svg>
  );
}

const optionList = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } } };
const optionItem = { hidden: { opacity: 0, x: 18 }, show: { opacity: 1, x: 0, transition: spring } };

export function QuestionCard({ question, bookmarked, initialReveal, onSubmit, onRevealed, nextSlot, onNext, headerSlot, direction = 1 }: Props) {
  const [selected, setSelected] = useState<string[]>(initialReveal?.selectedOptionIds ?? []);
  const [reveal, setReveal] = useState<AnswerReveal | null>(initialReveal ?? null);
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(Date.now());
  const resultRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const card = useAnimationControls();
  const [translateOpen, setTranslateOpen] = useState(false);
  const { enabled: coachEnabled } = useCoach();
  const [simple, setSimple] = useState(false);
  const [simplified, setSimplified] = useState<{ text: string; options: { id: string; text: string }[] } | null>(null);
  const [simplifying, setSimplifying] = useState(false);
  const [simplifyError, setSimplifyError] = useState<string | null>(null);
  const toggleSimple = async () => {
    haptic();
    if (simple) {
      setSimple(false);
      return;
    }
    if (!simplified) {
      setSimplifying(true);
      setSimplifyError(null);
      const res = await simplifyQuestionAction(question.id).catch(() => null);
      setSimplifying(false);
      if (!res || !res.ok) {
        setSimplifyError(res && !res.ok ? res.error : "Vereinfachung nicht verfügbar.");
        return;
      }
      setSimplified(res.data);
    }
    setSimple(true);
  };
  const shownText = simple && simplified ? simplified.text : question.text;
  const optionText = (id: string, fallback: string) => (simple && simplified ? (simplified.options.find((o) => o.id === id)?.text ?? fallback) : fallback);
  const pressTimer = useRef<number | null>(null);
  const fullText = `${question.text}\n\n${question.options.map((o) => `${o.label}) ${o.text}`).join("\n")}`;
  const speechText = `${question.text} ${question.options.map((o) => `Antwort ${o.label}: ${o.text}.`).join(" ")}`;
  const startPress = () => {
    pressTimer.current = window.setTimeout(() => {
      haptic(20);
      setTranslateOpen(true);
    }, 550);
  };
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  };

  const toggle = useCallback(
    (id: string) => {
      if (reveal) return;
      haptic(8);
      setError(null);
      setSelected((prev) => {
        if (!question.multipleCorrect) return [id];
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [reveal, question.multipleCorrect],
  );

  const celebrate = useCallback(
    (r: AnswerReveal) => {
      if (r.isCorrect) {
        playSound("correct");
        haptic(15);
        const rect = submitRef.current?.getBoundingClientRect() ?? resultRef.current?.getBoundingClientRect();
        void fireConfetti({
          particleCount: 45,
          spread: 60,
          origin: rect ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: rect.top / window.innerHeight } : { y: 0.7 },
        });
        void card.start({ scale: [1, 1.015, 1], transition: { duration: 0.35 } });
      } else {
        playSound("wrong");
        if ("vibrate" in navigator) navigator.vibrate?.([30, 50, 30]);
        void card.start({ x: [0, -12, 11, -8, 6, -3, 0], transition: { duration: 0.45 } });
      }
    },
    [card],
  );

  const submit = useCallback(() => {
    if (reveal || pending) return;
    if (selected.length === 0) {
      setError("Bitte zuerst eine Antwort auswählen.");
      void card.start({ x: [0, -6, 6, 0], transition: { duration: 0.25 } });
      return;
    }
    start(async () => {
      const res = await onSubmit(selected, Math.round((Date.now() - startedAt.current) / 1000));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFresh(true);
      setReveal(res.data);
      celebrate(res.data);
      onRevealed?.(res.data);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 250);
    });
  }, [reveal, pending, selected, onSubmit, onRevealed, celebrate, card]);

  // Tastatursteuerung: A–D / 1–4 auswählen, Enter = prüfen bzw. weiter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const idx = ["A", "B", "C", "D"].indexOf(key) >= 0 ? ["A", "B", "C", "D"].indexOf(key) : ["1", "2", "3", "4"].indexOf(key);
      if (idx >= 0 && question.options[idx]) {
        e.preventDefault();
        toggle(question.options[idx].id);
      } else if (e.key === "Enter" && target?.tagName !== "BUTTON" && target?.tagName !== "A") {
        e.preventDefault();
        if (reveal) onNext?.();
        else submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question.options, toggle, submit, reveal, onNext]);

  const correctSet = new Set(reveal?.correctOptionIds ?? []);
  const selectedSet = new Set(selected);
  const legalRef = reveal?.sourceDetail ?? question.sourceDetail;
  const xp = fresh ? reveal?.reward?.xpGained : undefined;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, x: direction * 70, rotateY: direction * 18, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
        transition={spring}
        style={{ transformPerspective: 1200 }}
        drag={reveal && onNext ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.28}
        onDragEnd={(_, info) => {
          if (reveal && onNext && (info.offset.x < -90 || info.velocity.x < -600)) onNext();
        }}
      >
        <motion.div animate={card} className="relative">
          {/* Ergebnis-Glow */}
          <AnimatePresence>
            {reveal && (
              <motion.div
                className={cn(
                  "pointer-events-none absolute -inset-px rounded-2xl",
                  reveal.isCorrect ? "shadow-[0_0_0_2px_#22c55e,0_0_50px_-8px_rgba(34,197,94,0.7)]" : "shadow-[0_0_0_2px_#ef4444,0_0_50px_-8px_rgba(239,68,68,0.6)]",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          <div className="glass relative rounded-2xl p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{question.category.name}</Badge>
              {question.topic && <Badge variant="muted">{question.topic.name}</Badge>}
              <DifficultyBadge difficulty={question.difficulty} />
              <OriginBadge origin={question.origin} verifiedSource={question.source?.verified} />
              <div className="ml-auto flex items-center gap-2">
                {headerSlot}
                {coachEnabled && (
                  <button
                    type="button"
                    onClick={() => void toggleSimple()}
                    disabled={simplifying}
                    aria-pressed={simple}
                    aria-label="Einfache Sprache"
                    title="Einfache Sprache (B1)"
                    className={cn("flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold transition-colors", simple ? "border-primary/50 bg-primary/12 text-primary" : "glass text-muted-foreground hover:text-navy")}
                  >
                    {simplifying ? <Loader2 className="size-3.5 animate-spin" /> : "B1"}
                    <span className="hidden sm:inline">Einfach</span>
                  </button>
                )}
                <SpeakButton text={speechText} />
                <button
                  type="button"
                  onClick={() => setTranslateOpen(true)}
                  aria-label="Übersetzungshilfe öffnen"
                  title="Übersetzen (oder Frage lange drücken)"
                  className="glass flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:text-navy"
                >
                  <Languages className="size-[18px]" />
                </button>
                <BookmarkButton questionId={question.id} initial={bookmarked} />
              </div>
            </div>

            {question.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={question.imageUrl} alt="Abbildung zur Frage" className="mb-4 max-h-72 w-full rounded-xl border object-contain" />
            )}

            <h2
              className="text-lg leading-relaxed font-bold text-navy select-none sm:text-xl [-webkit-touch-callout:none]"
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={simple ? "b1" : "orig"} className="block" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  {shownText}
                </motion.span>
              </AnimatePresence>
            </h2>
            {simple && <p className="mt-1 text-xs font-semibold text-primary">Einfache Sprache (B1) – die Prüfung findet in der Originalfassung statt.</p>}
            {simplifyError && <p className="mt-1 text-xs text-destructive">{simplifyError}</p>}
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {question.multipleCorrect ? "Mehrfachauswahl: Es können mehrere Antworten richtig sein." : "Wähle die richtige Antwort."}
            </p>

            <motion.div
              role={question.multipleCorrect ? "group" : "radiogroup"}
              aria-label="Antwortmöglichkeiten"
              className="mt-5 space-y-2.5"
              variants={optionList}
              initial="hidden"
              animate="show"
            >
              {question.options.map((o) => {
                const isSelected = selectedSet.has(o.id);
                const isCorrect = correctSet.has(o.id);
                const state = !reveal ? (isSelected ? "selected" : "idle") : isCorrect ? "correct" : isSelected ? "wrong" : "dim";
                return (
                  <motion.button
                    key={o.id}
                    variants={optionItem}
                    type="button"
                    role={question.multipleCorrect ? "checkbox" : "radio"}
                    aria-checked={isSelected}
                    disabled={Boolean(reveal) || pending}
                    onClick={() => toggle(o.id)}
                    whileTap={reveal ? undefined : { scale: 0.98 }}
                    animate={state === "correct" && reveal && !reveal.isCorrect && fresh ? { scale: [1, 1.03, 1, 1.03, 1] } : undefined}
                    transition={state === "correct" ? { duration: 1.2, delay: 0.35 } : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[15px] transition-colors duration-200 disabled:cursor-default",
                      state === "idle" && "border-border bg-white/[0.02] hover:border-primary/50 hover:bg-primary/5",
                      state === "selected" && "border-primary bg-primary/10 shadow-[0_0_24px_-8px_rgba(255,196,0,0.6)]",
                      state === "correct" && "border-success bg-success/12",
                      state === "wrong" && "border-destructive bg-destructive/12",
                      state === "dim" && "border-border opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center font-display text-sm font-bold transition-colors",
                        question.multipleCorrect ? "rounded-lg" : "rounded-full",
                        state === "idle" && "bg-foreground/8 text-foreground/75",
                        state === "selected" && "bg-primary text-primary-foreground",
                        state === "correct" && "bg-success text-white",
                        state === "wrong" && "bg-destructive text-white",
                        state === "dim" && "bg-foreground/8 text-muted-foreground",
                      )}
                    >
                      {state === "correct" ? <DrawCheck /> : state === "wrong" ? <X className="size-4" /> : o.label}
                    </span>
                    <span className="flex-1 pt-0.5 text-foreground">{optionText(o.id, o.text)}</span>
                  </motion.button>
                );
              })}
            </motion.div>

            {error && (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            )}

            {!reveal && (
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="hidden text-xs text-muted-foreground sm:block">Tipp: Tasten A–D wählen, Enter prüft.</p>
                <Button ref={submitRef} size="lg" onClick={submit} disabled={pending || selected.length === 0} className="w-full sm:w-auto">
                  {pending ? <Loader2 className="animate-spin" /> : null} Antwort prüfen
                </Button>
              </div>
            )}

            {/* +XP schwebt nach oben */}
            <AnimatePresence>
              {xp ? (
                <motion.span
                  key="xp"
                  className="pointer-events-none absolute right-6 bottom-6 font-display text-2xl font-bold text-primary [text-shadow:0_0_20px_rgba(255,196,0,0.7)]"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -70, scale: 1.1 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  onAnimationComplete={() => setFresh(false)}
                  aria-hidden
                >
                  +{xp} XP
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      <TranslateSheet open={translateOpen} onClose={() => setTranslateOpen(false)} text={fullText} />

      {/* Für Screenreader */}
      <p className="sr-only" aria-live="polite">
        {reveal ? (reveal.isCorrect ? "Richtig beantwortet." : "Leider falsch beantwortet.") : ""}
      </p>

      <AnimatePresence>
        {reveal && (
          <motion.div
            ref={resultRef}
            className="space-y-4"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: fresh ? 0.15 : 0 }}
          >
            <div className={cn("flex items-center gap-3 rounded-2xl p-4 text-white", reveal.isCorrect ? "bg-success" : "bg-destructive")}>
              <motion.span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.1 }}
              >
                {reveal.isCorrect ? (
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.2 }} />
                  </svg>
                ) : (
                  <X className="size-6" />
                )}
              </motion.span>
              <div>
                <p className="font-display text-lg font-bold">{reveal.isCorrect ? "Richtig!" : "Leider falsch"}</p>
                <p className="text-sm text-white/90">
                  {reveal.isCorrect
                    ? "Sehr gut – weiter so."
                    : `Richtige Antwort: ${reveal.options
                        .filter((o) => o.isCorrect)
                        .map((o) => o.label)
                        .join(", ")}. Die Frage wurde zu deinen Fehlern hinzugefügt.`}
                </p>
              </div>
            </div>

            {!reveal.isCorrect && coachEnabled && <WhyPanel questionId={question.id} selectedOptionIds={reveal.selectedOptionIds} />}

            {/* Erklärungs-Drawer */}
            <div className="glass rounded-2xl border-t-2 border-t-primary/50 p-5 sm:p-6">
              <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-foreground/15" aria-hidden />
              <h3 className="flex items-center gap-2 font-bold text-navy">
                <Info className="size-5 text-link" /> Erklärung
              </h3>
              {legalRef && (
                <motion.span
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-link"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, delay: 0.3 }}
                >
                  <Scale className="size-3.5" /> {legalRef}
                </motion.span>
              )}
              <p className="mt-3 leading-relaxed whitespace-pre-line text-foreground/85">{reveal.explanation}</p>

              <h4 className="mt-5 text-sm font-bold text-navy">Die Antworten im Einzelnen</h4>
              <ul className="mt-2 space-y-2">
                {reveal.options.map((o) => {
                  const text = question.options.find((q) => q.id === o.id)?.text;
                  return (
                    <li key={o.id} className={cn("rounded-xl border-l-4 p-3 text-sm", o.isCorrect ? "border-success bg-success/8" : "border-destructive/50 bg-destructive/5")}>
                      <p className="font-semibold text-navy">
                        {o.label}) {text} <span className={o.isCorrect ? "text-success" : "text-destructive"}>– {o.isCorrect ? "richtig" : "falsch"}</span>
                      </p>
                      {o.explanation && <p className="mt-1 text-foreground/75">{o.explanation}</p>}
                    </li>
                  );
                })}
              </ul>

              {(reveal.sourceTitle || reveal.sourceDetail) && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Quelle: {[reveal.sourceTitle, reveal.sourceDetail].filter(Boolean).join(" · ")}
                  {reveal.sourceUrl && (
                    <a href={reveal.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 font-semibold text-link hover:underline">
                      öffnen <ExternalLink className="size-3" />
                    </a>
                  )}
                </p>
              )}
              {question.origin !== "OFFICIAL" && (
                <p className="mt-2 text-xs text-warning">
                  Hinweis: Eigenständig erstellte {question.origin === "DEMO" ? "Demo-Frage" : "Übungsfrage"} – keine offizielle Prüfungsfrage. Rechtslage bitte anhand der aktuellen Gesetzestexte prüfen.
                </p>
              )}
            </div>
            {nextSlot && (
              <>
                <div className="h-14 lg:hidden" aria-hidden />
                <motion.div
                  className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 space-y-1 lg:sticky lg:inset-x-auto lg:bottom-4"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...spring, delay: 0.25 }}
                >
                  {nextSlot}
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
