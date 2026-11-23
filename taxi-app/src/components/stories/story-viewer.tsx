"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight, ChevronUp, Eye, Loader2, MapPin, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import { haptic } from "@/lib/motion";
import { firstUnseenIndex, isGroupSeen, MINUTE_OPTIONS, PACE_COOKIE, parsePace, portionSize, QPM_OPTIONS, safeRoute, timeAgo, type StoryGroupData, type StorySlideData } from "@/lib/stories";
import { cn } from "@/lib/utils";
import { answerStoryQuizAction, getChapterStoryAction, markStoriesSeenAction, setLearnPaceAction, storyEventAction } from "@/server/actions/stories";

const MapView = dynamic(() => import("@/components/map/map-view"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-black/10" aria-label="Karte wird geladen" /> });

export type ViewerMode = "overlay" | "page" | "preview";

type Props = {
  groups: StoryGroupData[];
  startKey: string;
  mode?: ViewerMode;
  /** Kreis, aus dem die Story aufgeht (Bildschirmkoordinaten) – für die Morph-Animation */
  origin?: { x: number; y: number; r: number } | null;
  /** Kreis-Position einer Gruppe beim Schließen (zum „Zurückschrumpfen“) */
  originFor?: (key: string) => { x: number; y: number; r: number } | null;
  onClose: (seen: Record<string, string[]>, groups?: StoryGroupData[]) => void;
  /** von außen schließen (z. B. Zurück-Taste) */
  closeSignal?: number;
  /** Admin: Bearbeiten öffnet den Katalog-Editor, sonst die persönliche Bearbeitung */
  isAdmin?: boolean;
};

/* ── Hilfen ──────────────────────────────────────────────── */

function preload(url?: string | null) {
  if (!url) return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function clipFor(o: { x: number; y: number; r: number } | null | undefined): string {
  if (!o) return "circle(0px at 50% 50%)";
  return `circle(${o.r}px at ${o.x}px ${o.y}px)`;
}

/* ── Folie ───────────────────────────────────────────────── */

function SlideBackground({ slide, running, reduce, muted }: { slide: StorySlideData; running: boolean; reduce: boolean; muted: boolean }) {
  if (slide.videoUrl) {
    return <video src={slide.videoUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted={muted} playsInline aria-hidden />;
  }
  if (slide.imageUrl) {
    return (
      <motion.img
        src={slide.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1 }}
        animate={reduce || !running ? undefined : { scale: 1.08 }}
        transition={{ duration: slide.durationMs / 1000, ease: "linear" }}
        draggable={false}
      />
    );
  }
  if (slide.kind === "qa" || slide.kind === "loading") {
    return (
      <div className="absolute inset-0" style={{ background: slide.bg || "linear-gradient(160deg,#111,#1e3a8a)" }}>
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-[#FFC400]/15 blur-3xl" aria-hidden />
        {slide.kind === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-10 animate-spin text-[#FFC400]" />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="absolute inset-0" style={{ background: slide.bg || "linear-gradient(160deg,#111,#3f3f46)" }}>
      {/* Platzhalter-Illustration: großes Emoji/Zahl mit sanftem Zoom */}
      <motion.div
        className={cn("absolute inset-x-0 flex justify-center", slide.quiz ? "top-[12%] opacity-30" : "top-[22%]")}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: running ? 1.06 : 1 }}
        transition={{ opacity: { duration: 0.3 }, scale: { duration: slide.durationMs / 1000, ease: "linear" } }}
        aria-hidden
      >
        {slide.big ? (
          <span className="max-w-[90%] text-center font-display text-[min(22vw,120px)] leading-none font-extrabold text-[#FFC400] drop-shadow-[0_8px_30px_rgba(0,0,0,.35)]">{slide.big}</span>
        ) : (
          <span className="text-[min(30vw,150px)] leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,.35)]">{slide.emoji ?? "🚕"}</span>
        )}
      </motion.div>
      <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-[#FFC400]/15 blur-3xl" aria-hidden />
    </div>
  );
}

function QuizBlock({ slide, groupKey, preview, onAnswered }: { slide: StorySlideData; groupKey: string; preview: boolean; onAnswered: () => void }) {
  const quiz = slide.quiz!;
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; correctIds: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (ids: string[]) => {
    if (busy || result) return;
    setBusy(true);
    haptic(12);
    let correct = false;
    let correctIds: string[] = [];
    if (quiz.correctId) {
      correct = ids.length === 1 && ids[0] === quiz.correctId;
      correctIds = [quiz.correctId];
      if (!preview) void answerStoryQuizAction({ groupKey, slideId: slide.id, questionId: quiz.questionId, selectedOptionIds: ids, correct }).catch(() => undefined);
    } else if (!preview) {
      const r = await answerStoryQuizAction({ groupKey, slideId: slide.id, questionId: quiz.questionId, selectedOptionIds: ids }).catch(() => null);
      correct = Boolean(r?.correct);
      correctIds = r?.correctOptionIds ?? [];
    }
    setResult({ correct, correctIds });
    setBusy(false);
    if (correct) void fireConfetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
    else setShake((n) => n + 1);
    haptic(correct ? 20 : 40);
    onAnswered();
  };

  return (
    <motion.div data-interactive className="mt-4 space-y-2" animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined} transition={{ duration: 0.4 }} key={shake}>
      <p className="text-[16px] leading-snug font-bold text-white">{quiz.question}</p>
      {quiz.options.map((o) => {
        const isPicked = picked.includes(o.id);
        const isRight = result?.correctIds.includes(o.id);
        const isWrong = result && isPicked && !isRight;
        return (
          <button
            key={o.id}
            type="button"
            disabled={Boolean(result) || busy}
            onClick={() => {
              if (quiz.multiple) setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]));
              else {
                setPicked([o.id]);
                void submit([o.id]);
              }
            }}
            data-testid="story-quiz-option"
            className={cn(
              "flex min-h-12 w-full items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm font-semibold backdrop-blur transition",
              isRight ? "border-[#22c55e] bg-[#22c55e]/30 text-white" : isWrong ? "border-[#ef4444] bg-[#ef4444]/30 text-white" : isPicked ? "border-[#FFC400] bg-white/25 text-white" : "border-white/25 bg-white/15 text-white",
            )}
          >
            <span className="min-w-0 flex-1">{o.text}</span>
            {isRight && <Check className="size-5 shrink-0" />}
          </button>
        );
      })}
      {quiz.multiple && !result && (
        <button type="button" disabled={!picked.length || busy} onClick={() => void submit(picked)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFC400] text-base font-extrabold text-[#111] disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />} Antwort prüfen
        </button>
      )}
      {result && (
        <p className={cn("text-sm font-extrabold", result.correct ? "text-[#86efac]" : "text-[#fca5a5]")} role="status" data-testid="story-quiz-result">
          {result.correct ? "Richtig! 🎉" : "Leider falsch – die richtige Antwort ist markiert."}
        </p>
      )}
    </motion.div>
  );
}

/* ── Viewer ──────────────────────────────────────────────── */

function readPace() {
  if (typeof document === "undefined") return parsePace(null);
  const m = document.cookie.match(new RegExp(`(?:^|; )${PACE_COOKIE}=([^;]*)`));
  return parsePace(m ? decodeURIComponent(m[1]!) : null);
}

/** Tempo der Lern-Story: Fragen pro Minute und Minuten pro Tag */
function PaceChips({ value, onChange }: { value: { qpm: number; minutes: number } | null; onChange: (p: { qpm: number; minutes: number }) => void }) {
  const cur = value ?? readPace();
  const chip = (active: boolean) => cn("min-h-10 min-w-12 rounded-full border-2 px-3 text-sm font-extrabold transition", active ? "border-[#FFC400] bg-[#FFC400] text-[#111]" : "border-white/30 bg-white/10 text-white");
  return (
    <div className="mt-4 space-y-3" data-interactive data-testid="story-pace">
      <div>
        <p className="text-xs font-bold text-white/70">Tempo · Fragen pro Minute</p>
        <div className="mt-1.5 flex gap-2">
          {QPM_OPTIONS.map((q) => (
            <button key={q} type="button" aria-pressed={cur.qpm === q} onClick={() => onChange({ ...cur, qpm: q })} className={chip(cur.qpm === q)}>
              {q}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-white/70">Lernzeit pro Tag und Kapitel</p>
        <div className="mt-1.5 flex gap-2">
          {MINUTE_OPTIONS.map((m) => (
            <button key={m} type="button" aria-pressed={cur.minutes === m} onClick={() => onChange({ ...cur, minutes: m })} className={chip(cur.minutes === m)}>
              {m} Min
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-white/60">= {portionSize(parsePace(`${cur.qpm}-${cur.minutes}`))} Fragen pro Tag</p>
    </div>
  );
}

/** Fortschrittsbalken eines Kapitels */
function ChapterProgress({ p }: { p: NonNullable<StorySlideData["progress"]> }) {
  const pct = p.total ? Math.round((p.seen / p.total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-white/20">
        <motion.div className="h-full rounded-full bg-[#FFC400]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <p className="mt-1 text-xs font-semibold text-white/75">
        {p.seen} von {p.total} Fragen gesehen · {pct} %
      </p>
    </div>
  );
}

export function StoryViewer({ groups: initialGroups, startKey, mode = "overlay", origin, onClose, closeSignal = 0, isAdmin = false }: Props) {
  const [groups, setGroups] = useState(initialGroups);
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const preview = mode === "preview";
  const [gi, setGi] = useState(() => Math.max(0, groups.findIndex((g) => g.key === startKey)));
  const group = groups[gi]!;
  const [si, setSi] = useState(() => firstUnseenIndex(groups[Math.max(0, groups.findIndex((g) => g.key === startKey))] ?? groups[0]!));
  const [dir, setDir] = useState(1);
  const [hold, setHold] = useState(false);
  const [quizWait, setQuizWait] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const [pace, setPace] = useState<{ qpm: number; minutes: number } | null>(null);
  const loadingKeys = useRef<Set<string>>(new Set());
  const slide = group.slides[Math.min(si, group.slides.length - 1)]!;

  const seen = useRef<Record<string, Set<string>>>(Object.fromEntries(groups.map((g) => [g.key, new Set(g.seenIds)])));
  const queue = useRef<Set<string>>(new Set());
  const elapsed = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const answeredRef = useRef(false);

  const paused = hold || quizWait || mapOpen || hidden || closing || slide.kind === "loading";
  const duration = Math.max(2500, slide.durationMs || 6000);

  /* Gesehen markieren (gebündelt) */
  const flush = useCallback(() => {
    if (preview || queue.current.size === 0) return;
    const ids = [...queue.current];
    queue.current.clear();
    void markStoriesSeenAction(ids).catch(() => ids.forEach((id) => queue.current.add(id)));
  }, [preview]);

  useEffect(() => {
    if (slide.kind !== "loading" && !seen.current[group.key]?.has(slide.id)) {
      (seen.current[group.key] ??= new Set()).add(slide.id);
      queue.current.add(slide.id);
    }
    setRevealed(false);
    revealedRef.current = false;
    // nächste 2 Bilder vorladen
    const rest = [...group.slides.slice(si + 1), ...(groups[gi + 1]?.slides ?? [])].slice(0, 2);
    rest.forEach((s) => preload(s.imageUrl));
    // Quiz: Zeit läuft erst nach der Antwort weiter
    answeredRef.current = false;
    setQuizWait(Boolean(slide.quiz));
    elapsed.current = 0;
    if (barRef.current) barRef.current.style.transform = "scaleX(0)";
  }, [group, slide, si, gi, groups]);

  /* Kapitel-Story: Portion laden, sobald die Gruppe dran ist */
  const loadChapter = useCallback(
    async (key: string, categoryId: string, extra = 0, keepIndex = false) => {
      if (loadingKeys.current.has(key)) return;
      loadingKeys.current.add(key);
      const slides = preview ? [] : await getChapterStoryAction(categoryId, extra).catch(() => []);
      loadingKeys.current.delete(key);
      setGroups((gs) => gs.map((x) => (x.key === key ? { ...x, slides: slides.length ? slides : [{ id: `empty:${key}`, title: "Keine Fragen", body: "In diesem Kapitel gibt es noch keine Fragen.", durationMs: 4000, emoji: "📭" }], done: false } : x)));
      if (!keepIndex) setSi(0);
      elapsed.current = 0;
    },
    [preview],
  );
  useEffect(() => {
    if (group.lazy && group.slides.every((x) => x.kind === "loading")) void loadChapter(group.key, group.lazy.categoryId);
  }, [group, loadChapter]);

  useEffect(() => {
    const t = window.setInterval(flush, 2500);
    return () => {
      window.clearInterval(t);
      flush();
    };
  }, [flush]);

  const finish = useCallback(
    (lastKey: string) => {
      if (closing) return;
      flush();
      setClosing(true);
      const seenOut = Object.fromEntries(Object.entries(seen.current).map(([k, v]) => [k, [...v]]));
      window.setTimeout(() => onClose(seenOut, groups), reduce ? 80 : 170);
      void lastKey;
    },
    [closing, flush, onClose, reduce, groups],
  );

  const closeSignalRef = useRef(closeSignal);
  useEffect(() => {
    if (closeSignal !== closeSignalRef.current) {
      closeSignalRef.current = closeSignal;
      finish(group.key);
    }
  }, [closeSignal, finish, group.key]);

  const goGroup = useCallback(
    (delta: number, opts: { skipSeen?: boolean } = {}) => {
      if (delta > 0 && !preview) void storyEventAction({ groupKey: group.key, kind: "complete" }).catch(() => undefined);
      let next = gi + delta;
      if (opts.skipSeen && delta > 0) {
        const after = groups.slice(gi + 1);
        const unseen = after.findIndex((g) => !isGroupSeen({ ...g, seenIds: [...(seen.current[g.key] ?? [])] }));
        next = unseen >= 0 ? gi + 1 + unseen : groups.length;
      }
      if (next < 0) {
        setSi(0);
        elapsed.current = 0;
        return;
      }
      if (next >= groups.length) {
        finish(group.key);
        return;
      }
      setDir(delta > 0 ? 1 : -1);
      setGi(next);
      setSi(delta > 0 ? firstUnseenIndex({ slides: groups[next]!.slides, seenIds: [...(seen.current[groups[next]!.key] ?? [])] }) : 0);
    },
    [gi, groups, group.key, finish, preview],
  );

  const next = useCallback(() => {
    if (si < group.slides.length - 1) setSi(si + 1);
    else goGroup(1, { skipSeen: true });
  }, [si, group.slides.length, goGroup]);

  const prev = useCallback(() => {
    if (si > 0) setSi(si - 1);
    else goGroup(-1);
  }, [si, goGroup]);

  /* Fortschritt (rAF, direkt am DOM – keine Re-Renders) */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (!paused) {
        elapsed.current += dt;
        if (slide.kind === "qa" && !revealedRef.current && elapsed.current > duration * 0.45) {
          revealedRef.current = true;
          setRevealed(true);
        }
        const p = Math.min(1, elapsed.current / duration);
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
        if (p >= 1) {
          next();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, duration, next, slide.kind]);

  /* Tab im Hintergrund → pausieren */
  useEffect(() => {
    const on = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  /* Tastatur */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") finish(group.key);
      else if (e.key === " ") {
        e.preventDefault();
        setHold((h) => !h);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [next, prev, finish, group.key]);

  /* Hintergrund nicht scrollen */
  useEffect(() => {
    if (mode !== "overlay") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mode]);

  const openCta = useCallback(() => {
    const route = safeRoute(slide.cta?.route);
    if (!route) return;
    if (!preview) void storyEventAction({ groupKey: group.key, kind: "cta", slideId: slide.id }).catch(() => undefined);
    flush();
    if (preview) return;
    router.push(route);
  }, [slide, group.key, flush, preview, router]);

  /* Gesten: Tippen links/rechts, Halten, Wischen */
  const g = useRef<{ x: number; y: number; t: number; holdTimer: number | null; held: boolean; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input,[data-interactive]")) return;
    g.current = { x: e.clientX, y: e.clientY, t: Date.now(), held: false, moved: false, holdTimer: window.setTimeout(() => {
      if (g.current) {
        g.current.held = true;
        setHold(true);
      }
    }, 220) };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.moved && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      s.moved = true;
      if (s.holdTimer) window.clearTimeout(s.holdTimer);
    }
    if (s.moved && dy > 0 && Math.abs(dy) > Math.abs(dx)) setDragY(dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = g.current;
    g.current = null;
    if (!s) return;
    if (s.holdTimer) window.clearTimeout(s.holdTimer);
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    setDragY(0);
    if (s.held) {
      setHold(false);
      return;
    }
    if (s.moved) {
      if (dy > 110 && Math.abs(dy) > Math.abs(dx)) finish(group.key);
      else if (dy < -80 && Math.abs(dy) > Math.abs(dx)) openCta();
      else if (Math.abs(dx) > 60) goGroup(dx < 0 ? 1 : -1);
      return;
    }
    const w = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - w.left < w.width / 3) prev();
    else next();
  };

  const fixed = mode !== "preview";
  const cube = useMemo(
    () => ({
      enter: (d: number) => (reduce ? { opacity: 0 } : { rotateY: d * 90, opacity: 0.6, transformOrigin: d > 0 ? "left center" : "right center" }),
      center: { rotateY: 0, opacity: 1 },
      exit: (d: number) => (reduce ? { opacity: 0 } : { rotateY: d * -90, opacity: 0.6, transformOrigin: d > 0 ? "right center" : "left center" }),
    }),
    [reduce],
  );

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Story: ${group.title}`}
      data-testid="story-viewer"
      className={cn("z-[90] overflow-hidden bg-black text-white select-none", fixed ? "fixed inset-0" : "absolute inset-0")}
      initial={fixed && origin && !reduce ? { clipPath: clipFor(origin) } : { opacity: 0 }}
      animate={closing ? { opacity: 0, scale: 0.94 } : { clipPath: "circle(150% at 50% 50%)", opacity: 1, scale: 1 }}
      // Öffnen: kurzer Kreis-Morph mit fester Dauer; Schließen: schnelles Ausblenden (Clip-Path-Animation ist auf iPhones langsam)
      transition={closing ? { duration: reduce ? 0.08 : 0.17, ease: "easeIn" } : { duration: reduce ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200, touchAction: "none" }}
    >
      <motion.div className="absolute inset-0" animate={{ y: dragY * 0.6, scale: 1 - Math.min(dragY, 300) / 1500 }} transition={{ type: "spring", stiffness: 500, damping: 40 }}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div key={group.key} className="absolute inset-0" custom={dir} variants={cube} initial="enter" animate="center" exit="exit" transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.4, 0, 0.2, 1] }} style={{ backfaceVisibility: "hidden" }}>
            {/* Folie */}
            <div className="absolute inset-0" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { g.current = null; setHold(false); setDragY(0); }} onContextMenu={(e) => e.preventDefault()}>
              <AnimatePresence initial={false}>
                <motion.div key={slide.id} className="absolute inset-0" initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.15 : 0.35 }}>
                  <SlideBackground slide={slide} running={!paused} reduce={reduce} muted={muted} />
                  <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" aria-hidden />
                </motion.div>
              </AnimatePresence>

              {/* Text + Elemente */}
              <motion.div className="absolute inset-x-0 bottom-0 px-5 pb-[max(24px,env(safe-area-inset-bottom))]" animate={{ opacity: hold ? 0 : 1 }} transition={{ duration: 0.15 }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className={cn((slide.quiz || slide.kind === "qa") && "no-scrollbar max-h-[calc(100dvh-120px)] overflow-y-auto overscroll-contain")}
                    style={slide.quiz || slide.kind === "qa" ? { touchAction: "pan-y" } : undefined}
                    data-interactive={slide.quiz || slide.kind === "qa" ? "" : undefined}
                  >
                    {slide.kind === "qa" ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-xs font-extrabold tracking-wider text-[#FFC400] uppercase" data-testid="story-title">
                            {slide.title}
                          </h2>
                          {!preview && group.lazy && (
                            <a
                              href={
                                group.lazy.categoryId.startsWith("u:")
                                  ? `/lernbuch/eigene/u-${group.lazy.categoryId.slice(2)}?q=${encodeURIComponent(slide.id.replace(/^kap:/, ""))}`
                                  : isAdmin
                                    ? `/admin/kapitel/${group.lazy.categoryId}?q=${encodeURIComponent(slide.id.replace(/^kap:/, ""))}`
                                    : `/lernbuch/eigene/${group.lazy.categoryId}?q=${encodeURIComponent(slide.id.replace(/^kap:/, ""))}`
                              }
                              className="flex min-h-9 items-center gap-1 rounded-full bg-white/15 px-3 text-xs font-bold text-white"
                              data-testid="story-edit"
                            >
                              ✏️ Bearbeiten
                            </a>
                          )}
                        </div>
                        <p className="mt-2 text-xl leading-snug font-extrabold whitespace-pre-line text-white" data-testid="story-question">
                          {slide.body}
                        </p>
                        <AnimatePresence initial={false} mode="wait">
                          {revealed ? (
                            <motion.div key="a" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mt-4 rounded-2xl border-l-4 border-[#22c55e] bg-white/15 p-4 backdrop-blur" data-testid="story-answer">
                              <p className="text-[11px] font-extrabold tracking-wider text-[#86efac] uppercase">Antwort</p>
                              <p className="mt-1 text-base leading-snug font-semibold whitespace-pre-line text-white">{slide.answer}</p>
                              {slide.explanation && <p className="mt-2 text-sm leading-snug whitespace-pre-line text-white/75">{slide.explanation}</p>}
                            </motion.div>
                          ) : (
                            <motion.button
                              key="b"
                              type="button"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => {
                                revealedRef.current = true;
                                setRevealed(true);
                                elapsed.current = Math.max(elapsed.current, duration * 0.45);
                              }}
                              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 text-base font-extrabold text-white backdrop-blur"
                              data-testid="story-reveal"
                            >
                              <Eye className="size-5" /> Antwort zeigen
                            </motion.button>
                          )}
                        </AnimatePresence>
                        {revealed && (
                          <button type="button" onClick={next} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl bg-[#FFC400] text-sm font-extrabold text-[#111]" data-testid="story-next">
                            Nächste Frage <ChevronRight className="size-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <h2 className="text-2xl leading-tight font-extrabold text-white drop-shadow" data-testid="story-title">
                          {slide.title}
                        </h2>
                        {slide.body && <p className={cn("mt-2 leading-snug whitespace-pre-line text-white/90", slide.quiz ? "text-sm" : "text-base")}>{slide.body}</p>}
                      </>
                    )}
                    {(slide.kind === "intro" || slide.kind === "end") && slide.progress && <ChapterProgress p={slide.progress} />}
                    {slide.kind === "intro" && group.lazy && (
                      <PaceChips
                        value={pace}
                        onChange={async (p) => {
                          setPace(p);
                          await setLearnPaceAction(p.qpm, p.minutes).catch(() => undefined);
                          void loadChapter(group.key, group.lazy!.categoryId, 0, true);
                        }}
                      />
                    )}
                    {slide.kind === "end" && group.lazy && slide.progress && (
                      <button
                        type="button"
                        data-interactive
                        onClick={() => void loadChapter(group.key, group.lazy!.categoryId, Math.max(0, slide.progress!.portion - 1))}
                        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 text-base font-extrabold text-white"
                        data-testid="story-more"
                      >
                        Noch {slide.progress.portion} Fragen lernen
                      </button>
                    )}
                    {slide.quiz && (
                      <QuizBlock
                        key={slide.id}
                        slide={slide}
                        groupKey={group.key}
                        preview={preview}
                        onAnswered={() => {
                          answeredRef.current = true;
                          elapsed.current = Math.max(0, duration - 3500);
                          setQuizWait(false);
                        }}
                      />
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2" data-interactive>
                      {slide.map && (
                        <button type="button" onClick={() => setMapOpen(true)} className="flex min-h-11 items-center gap-1.5 rounded-full bg-white/20 px-4 text-sm font-bold text-white backdrop-blur" data-testid="story-map-btn">
                          <MapPin className="size-4" /> Karte
                        </button>
                      )}
                      {slide.cta && safeRoute(slide.cta.route) && (
                        <button type="button" onClick={openCta} className="flex min-h-11 items-center gap-1.5 rounded-full bg-[#FFC400] px-5 text-sm font-extrabold text-[#111]" data-testid="story-cta">
                          {slide.cta.label}
                        </button>
                      )}
                    </div>
                    {slide.cta && safeRoute(slide.cta.route) && (
                      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-white/60" aria-hidden>
                        <ChevronUp className="size-3.5" /> Mehr
                      </p>
                    )}
                    {slide.credit && <p className="mt-2 text-[10px] text-white/55">{slide.credit}</p>}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>

          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Kopf: Fortschritt, Gruppe, Schließen */}
      <motion.div className="absolute inset-x-0 top-0 px-3 pt-[max(10px,env(safe-area-inset-top))]" animate={{ opacity: hold ? 0 : 1 }} transition={{ duration: 0.15 }}>
        <div className="flex gap-1" aria-hidden>
          {group.slides.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              {i < si ? <span className="block h-full w-full bg-white" /> : i === si ? <span ref={barRef} className="block h-full w-full origin-left bg-white" style={{ transform: "scaleX(0)" }} /> : null}
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-lg ring-2 ring-white/40">
            {/* eslint-disable-next-line @next/next/no-img-element -- Story-Bild aus Supabase Storage */}
            {group.iconUrl ? <img src={group.iconUrl} alt="" className="h-full w-full object-cover" /> : group.icon}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-extrabold">{group.title}</p>
            <p className="text-[11px] text-white/70">{timeAgo(group.createdAt)}</p>
          </div>
          {slide.videoUrl && (
            <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Ton an" : "Ton aus"} className="flex size-11 items-center justify-center rounded-full">
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          )}
          <button type="button" onClick={() => finish(group.key)} aria-label="Story schließen" className="flex size-11 items-center justify-center rounded-full" data-testid="story-close">
            <X className="size-6" />
          </button>
        </div>
      </motion.div>

      {/* Karte */}
      <AnimatePresence>
        {mapOpen && slide.map && (
          <motion.div className="absolute inset-0 z-10 flex items-end bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMapOpen(false)}>
            <motion.div
              className="w-full overflow-hidden rounded-t-[28px] bg-white pb-[max(16px,env(safe-area-inset-bottom))] text-[#111]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="story-map-sheet"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <p className="flex items-center gap-1.5 font-extrabold">
                  <MapPin className="size-4 text-[#2563eb]" /> {slide.map.label}
                </p>
                <button type="button" onClick={() => setMapOpen(false)} aria-label="Karte schließen" className="flex size-10 items-center justify-center rounded-full hover:bg-black/5">
                  <X className="size-5" />
                </button>
              </div>
              <div className="h-[46dvh] w-full">
                <MapView
                  markers={[{ coord: [slide.map.lng, slide.map.lat], color: "#FFC400", label: slide.map.label }]}
                  fitTo={[
                    [slide.map.lng - 0.012, slide.map.lat - 0.007],
                    [slide.map.lng + 0.012, slide.map.lat + 0.007],
                  ]}
                  className="h-full w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pausen-Hinweis (Halten) */}
      <AnimatePresence>
        {hold && (
          <motion.span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-2 text-sm font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Pausiert
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
