"use client";

import { motion } from "motion/react";
import { cn, formatClock } from "@/lib/utils";

/** Kreisförmiger Countdown. Unter 5 Min. gelb-orange, unter 10 s rot und pulsierend. */
export function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const critical = remaining <= 10;
  const low = remaining <= 300;
  const color = critical ? "#ef4444" : low ? "#f59e0b" : "#ffc400";
  return (
    <motion.div
      role="timer"
      aria-live={low ? "assertive" : "off"}
      aria-label={`Verbleibende Zeit ${formatClock(remaining)}`}
      className="flex items-center gap-2.5"
      animate={critical ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={critical ? { duration: 0.8, repeat: Infinity } : undefined}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-foreground/10" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            variants={{ v: { pathLength: Math.max(0.0001, frac) } }}
            initial={false}
            animate="v"
            transition={{ duration: 0.9, ease: "linear" }}
            style={critical ? { filter: "drop-shadow(0 0 6px #ef4444)" } : undefined}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">{Math.round(frac * 100)}%</span>
      </div>
      <span className={cn("font-display text-xl font-bold tabular-nums", critical ? "text-destructive" : low ? "text-warning" : "text-navy")}>{formatClock(remaining)}</span>
    </motion.div>
  );
}
