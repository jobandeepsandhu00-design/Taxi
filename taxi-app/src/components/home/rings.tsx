"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { softSpring } from "@/lib/motion";

function Arc({ r, stroke, value, color, size, delay = 0, gradientId }: { r: number; stroke: number; value: number; color: string; size: number; delay?: number; gradientId?: string }) {
  const c = size / 2;
  return (
    <>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={0.15} strokeWidth={stroke} />
      <motion.circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={gradientId ? `url(#${gradientId})` : color}
        strokeWidth={stroke}
        strokeLinecap="round"
        variants={{ hidden: { pathLength: 0 }, shown: { pathLength: Math.max(0.0001, Math.min(1, value)) } }}
        initial="hidden"
        animate="shown"
        transition={{ ...softSpring, delay }}
      />
    </>
  );
}

const levelStyle: Record<string, { color: string; bg: string; cls: string }> = {
  niedrig: { color: "#ef4444", bg: "rgba(239,68,68,0.16)", cls: "bg-destructive/12 text-destructive" },
  mittel: { color: "#f59e0b", bg: "rgba(245,158,11,0.16)", cls: "bg-warning/12 text-warning" },
  hoch: { color: "#84cc16", bg: "rgba(132,204,22,0.16)", cls: "bg-lime-500/15 text-lime-700 dark:text-lime-300" },
  bereit: { color: "#22c55e", bg: "rgba(34,197,94,0.16)", cls: "bg-success/12 text-success" },
};

/** Großer „Prüfungsreife"-Ring mit Verlaufsstrich, Glow ab 80 % und farbwechselndem Status-Badge. */
export function ReadinessRing({ score, label, level }: { score: number; label: string; level: string }) {
  const id = `ready-${useId().replace(/:/g, "")}`;
  const size = 176;
  const style = levelStyle[level] ?? levelStyle.mittel;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Prüfungsreife ${score} von 100: ${label}`}>
        {score >= 80 && (
          <motion.div
            className="absolute inset-4 rounded-full bg-success/40 blur-2xl"
            animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <svg width={size} height={size} className="relative -rotate-90">
          <defs>
            <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#ef4444" />
              <stop offset="0.5" stopColor="var(--primary)" />
              <stop offset="1" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <Arc r={74} stroke={16} value={score / 100} color="#94a3b8" size={size} gradientId={id} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-bold text-navy">
            <AnimatedNumber value={score} />
          </span>
          <span className="text-xs font-semibold text-muted-foreground">von 100</span>
        </div>
      </div>
      <motion.span
        className={`rounded-full px-3 py-1 text-xs font-bold ${style.cls}`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.6 }}
      >
        {label}
      </motion.span>
    </div>
  );
}

/** Tagesziel-Ringe im Fitness-Stil: Fragen, Richtig, Minuten. */
export function DailyRings({ answered, correct, minutes, goalQuestions, goalMinutes }: { answered: number; correct: number; minutes: number; goalQuestions: number; goalMinutes: number }) {
  const size = 156;
  const goalCorrect = Math.max(1, Math.round(goalQuestions * 0.7));
  const rings = [
    { label: "Fragen", value: answered, goal: goalQuestions, color: "var(--primary)", r: 68 },
    { label: "Richtig", value: correct, goal: goalCorrect, color: "#22c55e", r: 50 },
    { label: "Minuten", value: minutes, goal: goalMinutes, color: "#38bdf8", r: 32 },
  ];
  const done = answered >= goalQuestions;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Tagesziel: ${answered} von ${goalQuestions} Fragen, ${correct} richtig, ${minutes} von ${goalMinutes} Minuten`}>
        <svg width={size} height={size} className="-rotate-90">
          {rings.map((r, i) => (
            <Arc key={r.label} r={r.r} stroke={14} value={r.value / r.goal} color={r.color} size={size} delay={0.1 + i * 0.12} />
          ))}
        </svg>
        {done && (
          <motion.span className="absolute inset-0 flex items-center justify-center text-2xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring" }}>
            🎉
          </motion.span>
        )}
      </div>
      <ul className="space-y-2.5">
        {rings.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5">
            <span className="size-3 rounded-full" style={{ background: r.color }} />
            <span>
              <span className="block text-xs font-semibold text-muted-foreground">{r.label}</span>
              <span className="font-display text-lg font-bold text-navy">
                <AnimatedNumber value={r.value} />
                <span className="text-sm font-medium text-muted-foreground"> / {r.goal}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
