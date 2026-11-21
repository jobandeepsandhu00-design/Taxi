"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Flag, HelpCircle, Info, Languages, ListChecks, Loader2, Scale, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WhyPanel } from "@/components/coach/why-panel";
import { useCoach } from "@/components/coach/coach-provider";
import { CelebrationGate, type CelebrationItem } from "@/components/gamification/celebration-gate";
import { LEARN_PLAN_KEY } from "@/components/query-provider";
import { BookmarkButton } from "@/components/quiz/bookmark-button";
import { GlossaryText } from "@/components/quiz/glossary-text";
import { SpeakButton } from "@/components/quiz/speak-button";
import { TranslateSheet } from "@/components/quiz/translate-sheet";
import type { ClientQuestion } from "@/components/quiz/types";
import type { LessonInfo } from "@/components/quiz/lesson-result";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "@/lib/focus-store";
import { achievementInfo } from "@/lib/gamification";
import { spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { abandonExamAction, saveExamResponseAction, submitExamAction } from "@/server/actions/exam";
import { abandonQuizSessionAction, finishQuizAction, goToQuestionAction, peekAnswerAction, setQuizFlagsAction, submitQuizAnswerAction, submitRecallAnswerAction } from "@/server/actions/learning";
import { getSimpleAction } from "@/server/actions/variants";
import type { AnswerReveal } from "@/server/questions";
import { FocusDialog, FocusSegments, FocusSheet, FocusTimer, GridButton, IosFullscreenHint, QuestionGrid, type SegState } from "./focus-parts";

type ExamMode = { kind: "exam"; attemptId: string; expiresAt: string; serverNow: string; initialResponses: Record<string, { selected: string[]; marked: boolean }> };
type LearnMode = { kind: "learn"; attemptId: string; modeLabel: string; initialReveals: Record<string, AnswerReveal>; initialFlags: string[]; lesson: LessonInfo | null; isDailyChallenge: boolean; forceChoices?: boolean };

interface Props {
  title: string;
  questions: ClientQuestion[];
  initialIndex: number;
  bookmarkedIds: string[];
  mode: ExamMode | LearnMode;
}

const LETTERS = ["A", "B", "C", "D"];

function vibrate(ms: number | number[]) {
  try {
    if (localStorage.getItem("tp-haptics") === "off") return;
    navigator.vibrate?.(ms);
  } catch {
    /* ignorieren */
  }
}

/** Android: Vollbild beim ersten Tippen anfordern (iOS kann das im Browser nicht – dort Hinweis). */
export function useFullscreenOnFirstTap() {
  useEffect(() => {
    const android = /Android/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!android || standalone || !document.fullscreenEnabled) return;
    const once = () => {
      document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).catch(() => undefined);
      window.removeEventListener("pointerdown", once);
    };
    window.addEventListener("pointerdown", once);
    return () => {
      window.removeEventListener("pointerdown", once);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);
}

export function FocusRunner({ title, questions, initialIndex, bookmarkedIds, mode }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { enabled: coachEnabled } = useCoach();
  const exam = mode.kind === "exam";
  const total = questions.length;

  const [index, setIndex] = useState(Math.min(Math.max(0, initialIndex), total - 1));
  const [dir, setDir] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    exam ? Object.fromEntries(Object.entries(mode.initialResponses).map(([k, v]) => [k, v.selected])) : Object.fromEntries(Object.entries(mode.initialReveals).map(([k, v]) => [k, v.selectedOptionIds])),
  );
  const [flags, setFlags] = useState<Set<string>>(() => new Set(exam ? Object.entries(mode.initialResponses).filter(([, v]) => v.marked).map(([k]) => k) : mode.initialFlags));
  const [reveals, setReveals] = useState<Record<string, AnswerReveal>>(exam ? {} : mode.initialReveals);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [unsure, setUnsure] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sheet, setSheet] = useState<null | "grid" | "explain">(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [celebrations, setCelebrations] = useState<CelebrationItem[]>([]);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [simple, setSimple] = useState<Record<string, { text: string; options: Record<string, string>; verified: boolean }>>({});
  const [showSimple, setShowSimple] = useState(false);
  const [simpleBusy, setSimpleBusy] = useState(false);
  // Antwort-Modus (nur Lernmodus): „mc“ = mit Antwortmöglichkeiten, „recall“ = nur Frage, Antworten verdeckt
  const modeKey = `tp-answer-mode:${mode.attemptId}`;
  const forceMc = exam || (mode.kind === "learn" && Boolean(mode.forceChoices));
  const [answerMode, setAnswerMode] = useState<"mc" | "recall" | null>(forceMc ? "mc" : null);
  const [peeks, setPeeks] = useState<Record<string, { answer: string; explanation: string }>>({});
  const [modeLoaded, setModeLoaded] = useState(false);
  useEffect(() => {
    if (forceMc) return;
    try {
      const saved = localStorage.getItem(modeKey);
      if (saved === "mc" || saved === "recall") setAnswerMode(saved);
    } catch {
      /* ignorieren */
    }
    setModeLoaded(true);
  }, [forceMc, modeKey]);
  function chooseMode(m: "mc" | "recall") {
    setAnswerMode(m);
    try {
      localStorage.setItem(modeKey, m);
      localStorage.setItem("tp-answer-mode", m);
    } catch {
      /* ignorieren */
    }
  }
  const recall = !exam && answerMode === "recall";
  const startedAt = useRef(Date.now());
  const leaving = useRef(false);
  const submitted = useRef(false);

  const q = questions[index];
  const reveal = reveals[q.id];
  const sel = selected[q.id] ?? [];
  const isLast = index === total - 1;
  const bookmarks = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);
  useFullscreenOnFirstTap();

  // Kein Seiten-Scroll im Fokus-Modus
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Stand aus IndexedDB übernehmen (Neuladen / App-Wechsel)
  useEffect(() => {
    void loadSnapshot(mode.attemptId).then((snap) => {
      if (!snap || Date.now() - snap.at > 1000 * 60 * 60 * 24 * 3) return;
      // Lernmodus: nur zurück zur gemerkten Frage, wenn sie noch offen ist (sonst nächste offene vom Server)
      if (snap.index >= 0 && snap.index < total && (exam || !mode.initialReveals[questions[snap.index].id])) setIndex(snap.index);
      setFlags((f) => new Set([...f, ...snap.flags]));
      setSelected((s) => {
        const merged = { ...s };
        for (const [k, v] of Object.entries(snap.selected)) if (!(exam ? false : mode.initialReveals[k]) && !(merged[k]?.length)) merged[k] = v;
        return merged;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    void saveSnapshot(mode.attemptId, { index, flags: [...flags], selected, at: Date.now() });
  }, [mode.attemptId, index, flags, selected]);

  // ── Timer (nur Prüfung) ──────────────────────────────────────────────
  const offset = useMemo(() => (exam ? new Date(mode.serverNow).getTime() - Date.now() : 0), [exam, mode]);
  const deadline = useMemo(() => (exam ? new Date(mode.expiresAt).getTime() : 0), [exam, mode]);
  const [remaining, setRemaining] = useState(() => (exam ? Math.max(0, Math.floor((deadline - (Date.now() + offset)) / 1000)) : 0));

  const goResult = useCallback(() => {
    leaving.current = true;
    void clearSnapshot(mode.attemptId);
    window.location.replace(`/pruefung/${mode.attemptId}/ergebnis`);
  }, [mode.attemptId]);

  const submitExam = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;
      setBusy(true);
      if (auto) setToast("Zeit abgelaufen – deine Prüfung wird abgegeben.");
      await submitExamAction(mode.attemptId).catch(() => null);
      window.setTimeout(goResult, auto ? 1400 : 0);
    },
    [mode.attemptId, goResult],
  );

  useEffect(() => {
    if (!exam) return;
    const t = window.setInterval(() => {
      const left = Math.max(0, Math.floor((deadline - (Date.now() + offset)) / 1000));
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(t);
        void submitExam(true);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [exam, deadline, offset, submitExam]);

  // ── Zurück-Taste des Browsers abfangen ───────────────────────────────
  useEffect(() => {
    history.pushState({ focusGuard: true }, "");
    const onPop = () => {
      if (leaving.current) return;
      history.pushState({ focusGuard: true }, "");
      setExitOpen(true);
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (exam && !leaving.current && !submitted.current) e.preventDefault();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [exam]);

  // ── Navigation ───────────────────────────────────────────────────────
  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(total - 1, i));
      if (next === index) return;
      setDir(next > index ? 1 : -1);
      setIndex(next);
      setReview(false);
      setShowSimple(false);
      setUnsure(false);
      startedAt.current = Date.now();
      if (exam) void saveExamResponseAction({ attemptId: mode.attemptId, questionId: questions[next].id, currentIndex: next });
      else void goToQuestionAction(mode.attemptId, next).catch(() => undefined);
    },
    [index, total, exam, mode.attemptId, questions],
  );

  const finishLearn = useCallback(async () => {
    setBusy(true);
    try {
      sessionStorage.setItem(`tp-session-xp-${mode.attemptId}`, String(sessionXp));
    } catch {
      /* ignorieren */
    }
    await finishQuizAction(mode.attemptId).catch(() => null);
    void queryClient.invalidateQueries({ queryKey: LEARN_PLAN_KEY });
    void clearSnapshot(mode.attemptId);
    leaving.current = true;
    router.refresh();
  }, [mode.attemptId, sessionXp, queryClient, router]);

  // ── Auswahl ──────────────────────────────────────────────────────────
  const toggleOption = (optionId: string) => {
    if (reveal || busy) return;
    vibrate(10);
    setError(null);
    const next = q.multipleCorrect ? (sel.includes(optionId) ? sel.filter((x) => x !== optionId) : [...sel, optionId]) : [optionId];
    setSelected((s) => ({ ...s, [q.id]: next }));
    if (exam)
      void saveExamResponseAction({ attemptId: mode.attemptId, questionId: q.id, selectedOptionIds: next }).then((r) => {
        if (!r.ok) setError(r.error);
        else if (r.data.expired) {
          submitted.current = true;
          goResult();
        }
      });
  };

  const check = async () => {
    if (exam || reveal || sel.length === 0 || checking) return;
    setChecking(true);
    const res = await submitQuizAnswerAction({ attemptId: mode.attemptId, questionId: q.id, selectedOptionIds: sel, timeSpentSec: Math.round((Date.now() - startedAt.current) / 1000), unsure }).catch(() => null);
    setChecking(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Antwort konnte nicht gespeichert werden.");
      return;
    }
    const r = res.data;
    setReveals((x) => ({ ...x, [q.id]: r }));
    setFresh((f) => new Set(f).add(q.id));
    void queryClient.invalidateQueries({ queryKey: LEARN_PLAN_KEY });
    if (r.isCorrect) {
      playSound("correct");
      void fireConfetti({ particleCount: 40, spread: 55, origin: { y: 0.85 } });
    } else {
      playSound("wrong");
      vibrate([30, 50, 30]);
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
      if (items.length) window.setTimeout(() => setCelebrations((c) => [...c, ...items]), 900);
    }
  };

  const peek = async () => {
    if (peeks[q.id] || checking) return;
    setChecking(true);
    const res = await peekAnswerAction(mode.attemptId, q.id).catch(() => null);
    setChecking(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Antwort konnte nicht geladen werden.");
      return;
    }
    setPeeks((p) => ({ ...p, [q.id]: res.data }));
  };

  const rate = async (knew: boolean) => {
    if (exam || reveal || checking) return;
    setChecking(true);
    const res = await submitRecallAnswerAction({ attemptId: mode.attemptId, questionId: q.id, knew, timeSpentSec: Math.round((Date.now() - startedAt.current) / 1000) }).catch(() => null);
    setChecking(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Antwort konnte nicht gespeichert werden.");
      return;
    }
    const r = res.data;
    setReveals((x) => ({ ...x, [q.id]: r }));
    setSelected((x) => ({ ...x, [q.id]: r.selectedOptionIds }));
    setFresh((f) => new Set(f).add(q.id));
    void queryClient.invalidateQueries({ queryKey: LEARN_PLAN_KEY });
    playSound(knew ? "correct" : "wrong");
    if (r.reward) setSessionXp((x) => x + r.reward!.xpGained);
  };

  const toggleFlag = () => {
    vibrate(8);
    const on = !flags.has(q.id);
    const nextFlags = new Set(flags);
    if (on) nextFlags.add(q.id);
    else nextFlags.delete(q.id);
    setFlags(nextFlags);
    if (exam) void saveExamResponseAction({ attemptId: mode.attemptId, questionId: q.id, markedForReview: on });
    else void setQuizFlagsAction(mode.attemptId, [...nextFlags]).catch(() => undefined);
  };

  // Primärknopf: Prüfung → Weiter/Abgeben; Lernmodus → Antwort prüfen / Weiter / Fertig
  const firstOpenLearn = questions.findIndex((x) => !reveals[x.id]);
  const primary = (() => {
    if (exam) return isLast ? { label: "Abgeben", icon: Send, run: () => setReview(true) } : { label: "Weiter", icon: ChevronRight, run: () => goTo(index + 1) };
    if (!reveal && recall) return peeks[q.id] ? { label: "Bewerten", icon: Check, run: () => void rate(true), disabled: true } : { label: "Antwort zeigen", icon: Eye, run: () => void peek() };
    if (!reveal) return { label: "Antwort prüfen", icon: Check, run: () => void check(), disabled: sel.length === 0 };
    if (!isLast) return { label: "Weiter", icon: ChevronRight, run: () => goTo(index + 1) };
    if (firstOpenLearn >= 0) return { label: "Weiter", icon: ChevronRight, run: () => goTo(firstOpenLearn) };
    return { label: "Fertig", icon: Check, run: () => void finishLearn() };
  })();

  // ── Tastatur ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || sheet || exitOpen || confirmSubmit || review) return;
      const k = e.key.toUpperCase();
      const idx = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : ["1", "2", "3", "4"].indexOf(k);
      if (idx >= 0 && q.options[idx] && !recall) {
        e.preventDefault();
        toggleOption(q.options[idx].id);
      } else if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (k === "F") toggleFlag();
      else if (e.key === "Enter" && t?.tagName !== "BUTTON" && t?.tagName !== "A") primary.run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Verlassen ────────────────────────────────────────────────────────
  async function leave(kind: "later" | "abandon") {
    setBusy(true);
    leaving.current = true;
    if (kind === "abandon") {
      if (exam) await abandonExamAction(mode.attemptId).catch(() => null);
      else await abandonQuizSessionAction(mode.attemptId).catch(() => null);
      void clearSnapshot(mode.attemptId);
    }
    void queryClient.invalidateQueries({ queryKey: LEARN_PLAN_KEY });
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    router.replace(exam ? "/pruefung" : "/dashboard");
  }

  // ── Einfache Sprache ─────────────────────────────────────────────────
  async function toggleSimple() {
    if (showSimple) return setShowSimple(false);
    if (!simple[q.id]) {
      setSimpleBusy(true);
      const res = await getSimpleAction(q.id).catch(() => null);
      setSimpleBusy(false);
      if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Einfache Sprache nicht verfügbar.");
      setSimple((s) => ({ ...s, [q.id]: { text: res.data.text, options: Object.fromEntries(res.data.options.map((o) => [o.id, o.text])), verified: res.data.verified } }));
    }
    setShowSimple(true);
  }
  const simpleQ = showSimple ? simple[q.id] : undefined;

  const states: SegState[] = questions.map((x) => (exam ? ((selected[x.id]?.length ?? 0) > 0 ? "answered" : "open") : reveals[x.id] ? (reveals[x.id].isCorrect ? "correct" : "wrong") : "open"));
  const flagArr = questions.map((x) => flags.has(x.id));
  const answeredCount = states.filter((s) => s !== "open").length;
  const openIdx = states.map((s, i) => (s === "open" ? i : -1)).filter((i) => i >= 0);
  const flaggedIdx = flagArr.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const correctSet = new Set(reveal?.correctOptionIds ?? []);
  const xp = fresh.has(q.id) ? reveal?.reward?.xpGained : undefined;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }} data-testid="focus-mode">
      {/* Kopfleiste */}
      <motion.header className="shrink-0" initial={{ y: -56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}>
        <div className="flex h-14 items-center gap-2 px-2">
          <button type="button" onClick={() => setExitOpen(true)} className="flex size-12 items-center justify-center rounded-xl text-foreground/80 hover:bg-accent" aria-label={exam ? "Prüfung beenden" : "Sitzung verlassen"}>
            <X className="size-6" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{title}</h1>
            <p className="font-display text-[15px] font-bold text-navy tabular-nums" aria-live="polite">
              Frage {index + 1} / {total}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {exam && <FocusTimer remaining={remaining} />}
            <button type="button" onClick={toggleFlag} aria-pressed={flags.has(q.id)} aria-label={flags.has(q.id) ? "Markierung entfernen" : "Frage markieren"} className="flex size-12 items-center justify-center rounded-xl hover:bg-accent">
              <motion.span key={String(flags.has(q.id))} initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 520, damping: 14 }}>
                <Flag className={cn("size-5", flags.has(q.id) ? "fill-warning text-warning" : "text-foreground/70")} />
              </motion.span>
            </button>
          </div>
        </div>
        <div className="px-4 pb-2">
          <FocusSegments states={states} flags={flagArr} current={index} onJump={goTo} />
        </div>
        <IosFullscreenHint />
      </motion.header>

      {/* Frage + Antworten */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {review && exam ? (
          <ExamReview
            answered={answeredCount}
            open={openIdx}
            flagged={flaggedIdx}
            total={total}
            onJump={(i) => {
              setReview(false);
              goTo(i);
            }}
            onBack={() => setReview(false)}
            onSubmit={() => setConfirmSubmit(true)}
          />
        ) : (
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.section
              key={q.id}
              custom={dir}
              className="absolute inset-0 flex flex-col px-4"
              variants={{ enter: (d: number) => ({ x: d * 70, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d * -70, opacity: 0 }) }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.28}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -500) goTo(index + 1);
                else if (info.offset.x > 80 || info.velocity.x > 500) goTo(index - 1);
              }}
              style={{ touchAction: "pan-y" }}
            >
              {/* immer sichtbar: Kategorie + Frage */}
              <motion.div className="shrink-0 pt-2 pb-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold tracking-wider text-secondary-foreground uppercase">{q.category.name}</span>
                  {!exam && (
                    <span className="ml-auto flex items-center gap-1">
                      {coachEnabled && (
                        <button type="button" onClick={() => void toggleSimple()} disabled={simpleBusy} aria-pressed={showSimple} aria-label="Einfache Sprache" className={cn("flex h-10 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold", showSimple ? "border-primary/50 bg-primary/12 text-link" : "border-border text-muted-foreground")}>
                          {simpleBusy ? <Loader2 className="size-3.5 animate-spin" /> : "B1"}
                        </button>
                      )}
                      <SpeakButton text={`${q.text} ${q.options.map((o) => `Antwort ${o.label}: ${o.text}.`).join(" ")}`} auto={false} />
                      <button type="button" onClick={() => setTranslateOpen(true)} aria-label="Übersetzungshilfe öffnen" className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground">
                        <Languages className="size-[18px]" />
                      </button>
                      <BookmarkButton questionId={q.id} initial={bookmarks.has(q.id)} />
                    </span>
                  )}
                </div>
                <h2 className="text-[20px] leading-snug font-semibold text-navy sm:text-[22px]" data-testid="focus-question">
                  {simpleQ ? simpleQ.text : <GlossaryText text={q.text} terms={q.glossary ?? []} />}
                </h2>
                {simpleQ && (
                  <p className="mt-1 text-xs font-semibold text-link">
                    Einfache Sprache (B1) {!simpleQ.verified && <span className="ml-1 rounded-full bg-warning/12 px-2 py-0.5 text-[10px] text-warning">Ungeprüft</span>}
                  </p>
                )}
                {q.multipleCorrect && <p className="mt-1 text-xs font-semibold text-muted-foreground">Mehrfachauswahl: mehrere Antworten können richtig sein.</p>}
                {!forceMc && (
                  <button type="button" onClick={() => chooseMode(recall ? "mc" : "recall")} className="mt-2 mr-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground" data-testid="answer-mode-toggle">
                    {recall ? <ListChecks className="size-3.5" /> : <EyeOff className="size-3.5" />} {recall ? "Antworten einblenden" : "Antworten verdecken"}
                  </button>
                )}
                {!exam && !reveal && !recall && (
                  <button type="button" role="switch" aria-checked={unsure} onClick={() => setUnsure((u) => !u)} className={cn("mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", unsure ? "border-warning bg-warning/12 text-warning" : "border-border text-muted-foreground")}>
                    {unsure ? "✓ " : ""}Unsicher 🤔
                  </button>
                )}
              </motion.div>

              {/* nur dieser Bereich scrollt */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4" role={q.multipleCorrect ? "group" : "radiogroup"} aria-label="Antwortmöglichkeiten">
                {recall ? (
                  <RecallCard answer={peeks[q.id]?.answer ?? (reveal ? reveal.options.filter((o) => o.isCorrect).map((o) => q.options.find((x) => x.id === o.id)?.text ?? "").join("\n\n") : null)} />
                ) : (
                <div className="space-y-2.5">
                  {q.options.map((o, i) => {
                    const isSel = sel.includes(o.id);
                    const state = !reveal ? (isSel ? "selected" : "idle") : correctSet.has(o.id) ? "correct" : isSel ? "wrong" : "dim";
                    return (
                      <motion.button
                        key={o.id}
                        type="button"
                        role={q.multipleCorrect ? "checkbox" : "radio"}
                        aria-checked={isSel}
                        disabled={Boolean(reveal)}
                        onClick={() => toggleOption(o.id)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: state === "dim" ? 0.55 : 1, y: 0, scale: 1 }}
                        whileTap={reveal ? undefined : { scale: 0.97 }}
                        transition={{ ...spring, delay: 0.08 + i * 0.05 }}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 bg-card p-3 text-left text-base transition-colors duration-200",
                          state === "idle" && "border-border hover:border-primary/50",
                          state === "selected" && "border-primary bg-primary/8",
                          state === "correct" && "border-success bg-success/10",
                          state === "wrong" && "border-destructive bg-destructive/8",
                          state === "dim" && "border-border",
                        )}
                      >
                        <motion.span
                          key={`${o.id}-${state}`}
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold",
                            state === "selected" ? "bg-primary text-primary-foreground" : state === "correct" ? "bg-success text-white" : state === "wrong" ? "bg-destructive text-white" : "bg-muted text-navy",
                          )}
                          initial={state === "selected" ? { scale: 0.8 } : false}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 600, damping: 15 }}
                        >
                          {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : o.label}
                        </motion.span>
                        <span className="min-w-0 flex-1 leading-snug break-words whitespace-pre-line">{simpleQ?.options[o.id] ?? o.text}</span>
                      </motion.button>
                    );
                  })}
                </div>
                )}
                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              </div>
            </motion.section>
          </AnimatePresence>
        )}

        {/* +XP */}
        <AnimatePresence>
          {xp ? (
            <motion.span key={`xp-${q.id}`} className="pointer-events-none absolute right-6 bottom-4 font-display text-2xl font-bold text-link" initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 1, 0], y: -50 }} transition={{ duration: 1.4 }}>
              +{xp} XP
            </motion.span>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Antworten verdeckt: Selbsteinschätzung */}
      {recall && !reveal && peeks[q.id] && !review && (
        <div className="shrink-0 px-4 pb-2">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
            <Button variant="outline" size="lg" className="min-h-12 border-destructive/50 text-destructive" disabled={checking} onClick={() => void rate(false)} data-testid="recall-unknown">
              <X /> Nicht gewusst
            </Button>
            <Button variant="success" size="lg" className="min-h-12" disabled={checking} onClick={() => void rate(true)} data-testid="recall-known">
              <Check /> Gewusst
            </Button>
          </div>
        </div>
      )}

      {/* Lernmodus: Rückmeldung */}
      <AnimatePresence>
        {!exam && reveal && !review && (
          <motion.div className="shrink-0 px-4 pb-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={spring}>
            <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-2 text-white", reveal.isCorrect ? "bg-success" : "bg-destructive")} aria-live="polite">
              <span className="min-w-0 flex-1">
                <span className="block font-display font-bold">{recall ? (reveal.isCorrect ? "Gewusst!" : "Nicht gewusst") : reveal.isCorrect ? "Richtig!" : "Leider falsch"}</span>
                <span className="block truncate text-xs text-white/90">
                  {reveal.isCorrect ? "Sehr gut." : recall ? "Kommt bald wieder dran." : `Richtig: ${reveal.options.filter((o) => o.isCorrect).map((o) => o.label).join(", ")}`}
                  {reveal.reward?.box && (
                    <span aria-label={`Karteikasten: ${reveal.reward.box.from === null ? "neu" : `Fach ${reveal.reward.box.from}`} nach Fach ${reveal.reward.box.to}`}>
                      {" "}· {reveal.reward.box.from === null ? "Neu" : `Fach ${reveal.reward.box.from}`} → Fach {reveal.reward.box.to}
                    </span>
                  )}
                </span>
              </span>
              <button type="button" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/50 bg-white/15 px-3 text-sm font-semibold text-white transition hover:bg-white/25 active:scale-95" onClick={() => setSheet("explain")}>
                <HelpCircle className="size-4" /> Erklärung &amp; Warum?
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Untere Aktionsleiste */}
      <motion.footer className="shrink-0 border-t border-border bg-background/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} initial={{ y: 72 }} animate={{ y: 0 }} transition={spring}>
        <div className="mx-auto flex h-[72px] max-w-3xl items-center justify-between gap-2 px-3">
          <Button variant="ghost" size="lg" className="min-h-12" onClick={() => goTo(index - 1)} disabled={index === 0 || busy} aria-label="Vorherige Frage">
            <ChevronLeft /> Zurück
          </Button>
          <GridButton current={index + 1} total={total} onClick={() => setSheet("grid")} />
          <Button size="lg" className="min-h-12 min-w-32" onClick={primary.run} disabled={busy || checking || ("disabled" in primary && primary.disabled)} data-testid="focus-primary">
            {checking || busy ? <Loader2 className="animate-spin" /> : null}
            {primary.label} {!checking && !busy && <primary.icon />}
          </Button>
        </div>
      </motion.footer>

      {/* Sheets & Dialoge */}
      <FocusSheet open={sheet === "grid"} onClose={() => setSheet(null)} title="Fragen-Übersicht" testId="grid-sheet">
        <QuestionGrid
          states={states}
          flags={flagArr}
          current={index}
          onJump={(i) => {
            setSheet(null);
            goTo(i);
          }}
        />
      </FocusSheet>
      {!exam && reveal && (
        <FocusSheet open={sheet === "explain"} onClose={() => setSheet(null)} title="Erklärung" testId="explain-sheet">
          <ExplainContent q={q} reveal={reveal} coachEnabled={coachEnabled} />
        </FocusSheet>
      )}
      <FocusDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title={exam ? "Prüfung wirklich beenden?" : "Sitzung verlassen?"}
        text={exam ? "Dein Fortschritt geht verloren." : "Deine Antworten sind gespeichert – du kannst später genau hier weitermachen."}
        actions={
          exam
            ? [
                { label: "Abbrechen", variant: "outline", onClick: () => setExitOpen(false) },
                { label: "Beenden", variant: "destructive", busy, onClick: () => void leave("abandon") },
              ]
            : [
                { label: "Später weitermachen", busy, onClick: () => void leave("later") },
                { label: "Sitzung beenden", variant: "outline", busy, onClick: () => void leave("abandon") },
                { label: "Abbrechen", variant: "ghost", onClick: () => setExitOpen(false) },
              ]
        }
      />
      <FocusDialog
        open={!exam && modeLoaded && answerMode === null && !review}
        onClose={() => chooseMode("mc")}
        title="Wie möchtest du üben?"
        text="Mit Antwortmöglichkeiten wählst du A–D. Bei „Nur Frage“ sind die Antworten verdeckt: Du überlegst selbst, tippst auf „Antwort zeigen“ und sagst dann, ob du es gewusst hast."
        actions={[
          { label: "Mit Antwortmöglichkeiten", onClick: () => chooseMode("mc") },
          { label: "Nur Frage – Antworten verdeckt", variant: "outline", onClick: () => chooseMode("recall") },
        ]}
      />
      <FocusDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title="Prüfung jetzt abgeben?"
        text={openIdx.length ? `${openIdx.length} ${openIdx.length === 1 ? "Frage ist" : "Fragen sind"} noch offen und zählen als falsch.` : "Danach kannst du nichts mehr ändern."}
        actions={[
          { label: "Jetzt abgeben", busy, onClick: () => void submitExam(false) },
          { label: "Weiter bearbeiten", variant: "outline", onClick: () => setConfirmSubmit(false) },
        ]}
      />
      <TranslateSheet open={translateOpen} onClose={() => setTranslateOpen(false)} text={`${q.text}\n\n${q.options.map((o) => `${o.label}) ${o.text}`).join("\n")}`} questionId={q.id} answered={Boolean(reveal)} />
      <AnimatePresence>
        {toast && (
          <motion.div role="status" className="fixed inset-x-4 top-20 z-[80] mx-auto max-w-sm rounded-2xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-background shadow-xl" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {celebrations.length > 0 && <CelebrationGate items={celebrations} onDone={() => setCelebrations([])} />}
    </div>
  );
}

function ExamReview({ answered, open, flagged, total, onJump, onBack, onSubmit }: { answered: number; open: number[]; flagged: number[]; total: number; onJump: (i: number) => void; onBack: () => void; onSubmit: () => void }) {
  return (
    <motion.div className="absolute inset-0 overflow-y-auto px-4 py-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} data-testid="exam-review">
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <p className="text-xs font-bold tracking-wider text-link uppercase">Vor dem Abgeben</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-navy">Alles geprüft?</h2>
          <p className="mt-2 text-sm text-muted-foreground" data-testid="review-summary">
            {answered} beantwortet · {total - answered} offen · {flagged.length} markiert
          </p>
        </div>
        {open.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold text-navy">Offene Fragen</h3>
            <div className="flex flex-wrap gap-2">
              {open.map((i) => (
                <button key={i} type="button" onClick={() => onJump(i)} className="min-h-11 min-w-11 rounded-xl border-2 border-border px-3 font-display font-bold text-navy" aria-label={`Zu offener Frage ${i + 1}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </section>
        )}
        {flagged.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold text-navy">Markierte Fragen</h3>
            <div className="flex flex-wrap gap-2">
              {flagged.map((i) => (
                <button key={i} type="button" onClick={() => onJump(i)} className="flex min-h-11 min-w-11 items-center gap-1 rounded-xl border-2 border-warning bg-warning/10 px-3 font-display font-bold text-warning" aria-label={`Zu markierter Frage ${i + 1}`}>
                  <Flag className="size-3.5 fill-warning" /> {i + 1}
                </button>
              ))}
            </div>
          </section>
        )}
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={onSubmit}>
            <Send /> Jetzt abgeben
          </Button>
          <Button size="lg" variant="ghost" onClick={onBack}>
            <ArrowLeft /> Zurück zur Frage
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function RecallCard({ answer }: { answer: string | null }) {
  if (!answer) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 text-center" data-testid="recall-hidden">
        <EyeOff className="size-7 text-muted-foreground" />
        <p className="font-semibold text-navy">Antworten verdeckt</p>
        <p className="text-sm text-muted-foreground">Überlege dir die Antwort – dann tippe auf „Antwort zeigen“.</p>
      </div>
    );
  }
  return (
    <motion.div className="rounded-2xl border-2 border-success/40 bg-success/8 p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} data-testid="recall-answer">
      <p className="mb-2 text-xs font-bold tracking-wider text-success uppercase">Antwort laut Skript</p>
      <p className="text-base leading-relaxed whitespace-pre-line text-foreground">{answer}</p>
    </motion.div>
  );
}

function ExplainContent({ q, reveal, coachEnabled }: { q: ClientQuestion; reveal: AnswerReveal; coachEnabled: boolean }) {
  const legal = reveal.sourceDetail ?? q.sourceDetail;
  return (
    <div className="space-y-4">
      {legal && (
        <p className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-navy">
          <Scale className="size-3.5" /> {legal}
        </p>
      )}
      <p className="flex gap-2 text-[15px] leading-relaxed whitespace-pre-line text-foreground">
        <Info className="mt-1 size-4 shrink-0 text-link" />
        <span>{reveal.explanation}</span>
      </p>
      <div>
        <p className="mb-2 text-xs font-bold text-navy">Die Antworten im Einzelnen</p>
        <ul className="space-y-2">
          {reveal.options.map((o) => (
            <li key={o.id} className={cn("rounded-xl border px-3 py-2 text-sm whitespace-pre-line", o.isCorrect ? "border-success/50 bg-success/8" : reveal.selectedOptionIds.includes(o.id) ? "border-destructive/40 bg-destructive/6" : "border-border")}>
              <strong>{o.label})</strong> {q.options.find((x) => x.id === o.id)?.text}
              {o.explanation && <span className="mt-0.5 block text-xs text-muted-foreground">{o.explanation}</span>}
            </li>
          ))}
        </ul>
      </div>
      {coachEnabled && <WhyPanel key={q.id} questionId={q.id} selectedOptionIds={reveal.selectedOptionIds} isCorrect={reveal.isCorrect} />}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowRight className="size-3" /> Weiter mit „Weiter“ oder nach links wischen.
      </div>
    </div>
  );
}
