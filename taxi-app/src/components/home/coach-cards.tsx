"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { CoachAvatar, type CoachMood } from "@/components/coach/coach-avatar";
import { haptic, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { togglePlanItemAction } from "@/server/actions/coach";
import { startMistakeTrainingAction, startReviewAction } from "@/server/actions/learning";

export interface PlanItemView {
  id: string;
  kind: string;
  label: string;
  hint: string;
  href?: string;
  target?: number;
  progress?: number;
  done: boolean;
}

/** Tagesplan als animierte Checkliste. */
export function DailyPlanCard({ items: initial }: { items: PlanItemView[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length && items.length > 0;

  function toggle(id: string) {
    haptic();
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (!it.done) playSound("correct");
        return { ...it, done: !it.done };
      }),
    );
    startTransition(() => void togglePlanItemAction(id));
  }

  return (
    <div className="glass rounded-2xl p-5" data-testid="daily-plan">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-wider text-link uppercase">Dein Plan für heute</p>
          <p className="text-sm text-muted-foreground">vom Taxi-Coach · {doneCount}/{items.length} erledigt</p>
        </div>
        <CoachAvatar mood={allDone ? "happy" : "idle"} size={44} />
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(doneCount / Math.max(1, items.length)) * 100}%` }} transition={spring} />
      </div>
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <motion.li key={it.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: idx * 0.06 }} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent/50">
            <motion.button
              type="button"
              onClick={() => toggle(it.id)}
              whileTap={{ scale: 0.8 }}
              aria-pressed={it.done}
              aria-label={it.done ? `${it.label} – als offen markieren` : `${it.label} – abhaken`}
              className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors", it.done ? "border-success bg-success text-white" : "border-foreground/25")}
            >
              <AnimatePresence>
                {it.done && (
                  <motion.svg viewBox="0 0 24 24" className="size-4" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} aria-hidden>
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold text-navy transition", it.done && "text-muted-foreground line-through")}>{it.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {it.hint}
                {it.target && it.progress !== undefined && !it.done ? ` · ${Math.min(it.progress, it.target)}/${it.target}` : ""}
              </p>
            </div>
            {!it.done && <PlanAction item={it} />}
          </motion.li>
        ))}
      </ul>
      <AnimatePresence>
        {allDone && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-center text-sm font-bold text-success">
            Alles erledigt – Feierabend, Chef! 🚕
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanAction({ item }: { item: PlanItemView }) {
  const cls = "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-90";
  if (item.kind === "review" || item.kind === "mistakes") {
    return (
      <form action={item.kind === "review" ? startReviewAction : startMistakeTrainingAction}>
        <button type="submit" className={cls} aria-label={`${item.label} starten`}>
          <ArrowRight className="size-4" />
        </button>
      </form>
    );
  }
  const href = item.href ?? (item.kind === "goal" ? "/quiz" : undefined);
  if (!href) return null;
  return (
    <Link href={href} className={cls} aria-label={`${item.label} starten`}>
      <ArrowRight className="size-4" />
    </Link>
  );
}

const confidenceStyle = { hoch: "bg-success/15 text-success", mittel: "bg-warning/15 text-warning", niedrig: "bg-foreground/10 text-muted-foreground" } as const;

/** Prognose: „Prüfungsbereit voraussichtlich am …“ */
export function PrognosisCard({ readyDate, confidence, readiness, onTrack, trend, examDate }: { readyDate: string | null; confidence: "hoch" | "mittel" | "niedrig"; readiness: number; onTrack: boolean | null; trend: string; examDate: string | null }) {
  const fmt = (k: string) => new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${k}T00:00:00Z`));
  const pct = Math.round(readiness * 100);
  return (
    <div className="glass rounded-2xl p-5" data-testid="prognosis">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold tracking-wider text-link uppercase">Prognose</p>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", confidenceStyle[confidence])}>Sicherheit: {confidence}</span>
      </div>
      <p className="mt-2 font-display text-xl leading-snug font-bold text-navy">
        {readiness >= 0.7 ? "Du bist prüfungsbereit! 🎉" : readyDate ? <>Prüfungsbereit voraussichtlich am {fmt(readyDate)}</> : "Noch zu wenig Daten für eine Prognose"}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-success" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (pct / 70) * 100)}%` }} transition={{ ...spring, delay: 0.2 }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Reife {pct} % von 70 % · Trend {trend}
        {examDate && onTrack !== null && (onTrack ? " · liegt vor deinem Prüfungstermin ✅" : ` · Prüfung am ${fmt(examDate)} – mehr Tempo nötig`)}
      </p>
    </div>
  );
}

/** Proaktive, wegklickbare Coach-Sprechblase (einmal pro Tag). */
export function CoachBubble({ message, mood, day, href, start }: { message: string; mood: CoachMood; day: string; href: string; start?: "review" | "mistakes" }) {
  const [show, setShow] = useState(false);
  const key = `coach-bubble-${day}`;
  useEffect(() => {
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* ohne Speicher trotzdem anzeigen */
    }
    const t = window.setTimeout(() => setShow(true), 600);
    return () => window.clearTimeout(t);
  }, [key]);
  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignorieren */
    }
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="flex items-end gap-2" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} transition={spring} data-testid="coach-bubble">
          <CoachAvatar mood={mood} size={48} className="shrink-0" />
          <div className="glass relative flex-1 rounded-2xl rounded-bl-md p-3 pr-9">
            {start ? (
              <form action={start === "review" ? startReviewAction : startMistakeTrainingAction} onSubmit={dismiss}>
                <button type="submit" className="text-left text-sm font-semibold text-navy hover:underline">
                  {message}
                </button>
              </form>
            ) : (
              <Link href={href} className="text-sm font-semibold text-navy hover:underline" onClick={dismiss}>
                {message}
              </Link>
            )}
            <button type="button" onClick={dismiss} className="absolute top-2 right-2 rounded-lg p-1 text-muted-foreground hover:bg-accent" aria-label="Hinweis schließen">
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
