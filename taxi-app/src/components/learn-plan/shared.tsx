"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Circle, CircleDot, Crown, ImageIcon, ListChecks, ShieldCheck, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { LEARN_PLAN_KEY } from "@/components/query-provider";
import type { LearnPlan, LessonStatus, PlanQuestion, QuestionStatus } from "@/lib/learn-plan-types";
import { cn } from "@/lib/utils";
import { getLearnPlanAction } from "@/server/actions/learn-plan";

/** Lernplan aus dem Cache (React Query, staleTime 30 s); erster Stand kommt vom Server. */
export function useLearnPlan(initial?: LearnPlan) {
  return useQuery({ queryKey: LEARN_PLAN_KEY, queryFn: () => getLearnPlanAction(), initialData: initial, initialDataUpdatedAt: initial ? Date.now() : undefined });
}

export const questionStatusMeta: Record<QuestionStatus, { label: string; icon: LucideIcon; dot: string; text: string }> = {
  neu: { label: "Neu", icon: Circle, dot: "bg-foreground/15", text: "text-muted-foreground" },
  falsch: { label: "Falsch", icon: AlertCircle, dot: "bg-destructive", text: "text-destructive" },
  lernen: { label: "Lernen", icon: CircleDot, dot: "bg-warning", text: "text-warning" },
  sicher: { label: "Sicher", icon: ShieldCheck, dot: "bg-info", text: "text-info" },
  gemeistert: { label: "Gemeistert", icon: CheckCircle2, dot: "bg-success", text: "text-success" },
};

export const lessonStatusMeta: Record<LessonStatus, { label: string; cls: string }> = {
  gesperrt: { label: "Gesperrt", cls: "bg-muted text-muted-foreground" },
  offen: { label: "Offen", cls: "bg-secondary text-secondary-foreground" },
  in_arbeit: { label: "In Arbeit", cls: "bg-warning/15 text-warning" },
  gemeistert: { label: "Gemeistert", cls: "bg-success/15 text-success" },
};

export const typeMeta: Record<PlanQuestion["type"], { label: string; icon: LucideIcon }> = {
  einfach: { label: "Einfachauswahl", icon: Circle },
  mehrfach: { label: "Mehrfachauswahl", icon: ListChecks },
  bild: { label: "Frage mit Bild", icon: ImageIcon },
};

export { Crown };

/** Fünf Status-Punkte einer Lektion – erscheinen nacheinander. */
export function StatusDots({ questions, className }: { questions: PlanQuestion[]; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-label={questions.map((q) => questionStatusMeta[q.status].label).join(", ")}>
      {questions.map((q, i) => (
        <motion.span
          key={q.id}
          className={cn("size-2.5 rounded-full", questionStatusMeta[q.status].dot)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 18, delay: 0.05 + i * 0.06 }}
        />
      ))}
    </span>
  );
}

/** Fortschrittsring mit Verlauf, zählt von 0 hoch. */
export function PlanRing({ value, size = 96, stroke = 10, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const id = `plan-${useId().replace(/:/g, "")}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value} % geschafft`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--success)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-navy">
        <AnimatedNumber value={value} suffix=" %" />
      </span>
    </div>
  );
}

export function MiniBar({ value, color, delay = 0 }: { value: number; color?: string; delay?: number }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-muted">
      <motion.span className="block h-full rounded-full" style={{ background: color ?? "var(--theme-gradient)" }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ type: "spring", stiffness: 140, damping: 22, delay }} />
    </span>
  );
}

export function PlanSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Lernplan wird geladen">
      <div className="skeleton h-24 w-full rounded-3xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 w-full rounded-2xl" />
      ))}
    </div>
  );
}
