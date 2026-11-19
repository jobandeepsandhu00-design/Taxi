"use client";

import { motion } from "motion/react";
import { softSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Fortschrittsbalken – animiert beim Einblenden von 0 (nur transform: scaleX). */
export function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-foreground/10", className)}
    >
      <motion.div
        className={cn("h-full w-full origin-left rounded-full bg-primary", barClassName)}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: v / 100 }}
        transition={{ ...softSpring, delay: 0.1 }}
      />
    </div>
  );
}

/** Fortschrittsring – Strich zeichnet sich beim Einblenden (pathLength). */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = "#ffc400",
  track,
  children,
  label,
  glow,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  label?: string;
  glow?: boolean;
}) {
  const v = Math.min(100, Math.max(0, value));
  const r = (size - stroke) / 2;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)} %`}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? "currentColor"} strokeWidth={stroke} fill="none" className={track ? undefined : "text-foreground/10"} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          variants={{ hidden: { pathLength: 0 }, shown: { pathLength: Math.max(v / 100, 0.0001) } }}
          initial="hidden"
          animate="shown"
          transition={{ ...softSpring, delay: 0.15 }}
          style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
