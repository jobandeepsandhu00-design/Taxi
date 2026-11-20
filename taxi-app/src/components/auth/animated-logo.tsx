"use client";

import { motion } from "motion/react";

const word = "TaxiPrüfung";

/** Logo-Intro: Taxi-Icon zeichnet sich als Linie, füllt sich gelb, dann tippt sich der Schriftzug ein. */
export function AnimatedLogo() {
  const draw = { duration: 0.9, ease: "easeInOut" as const };
  return (
    <div className="flex items-center gap-3" aria-label="TaxiPrüfung">
      <span className="relative flex size-11 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-2xl bg-primary shadow-[0_0_30px_-4px_var(--glow)]"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.85 }}
        />
        <svg viewBox="0 0 24 24" className="relative size-6" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {["M5 17h14M6 17l1.2-5.2A2 2 0 0 1 9.15 10h5.7a2 2 0 0 1 1.95 1.8L18 17", "M10 7h4l.5 3h-5z"].map((d) => (
            <motion.path
              key={d}
              d={d}
              initial={{ pathLength: 0, stroke: "#ffc400" }}
              animate={{ pathLength: 1, stroke: "#0b0f1a" }}
              transition={{ pathLength: draw, stroke: { delay: 0.9, duration: 0.2 } }}
            />
          ))}
          {[8, 16].map((cx) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy={17.5}
              r={1.5}
              initial={{ pathLength: 0, stroke: "#ffc400" }}
              animate={{ pathLength: 1, stroke: "#0b0f1a" }}
              transition={{ pathLength: { ...draw, delay: 0.4 }, stroke: { delay: 0.9, duration: 0.2 } }}
            />
          ))}
        </svg>
      </span>
      <span className="leading-none">
        <span className="flex font-display text-xl font-bold tracking-tight text-white">
          {word.split("").map((ch, i) => (
            <motion.span
              key={i}
              className={i >= 4 ? "text-primary" : undefined}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05 + i * 0.045, duration: 0.18 }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
        <motion.span
          className="mt-1 block text-[11px] font-medium text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
        >
          Österreich · Wien
        </motion.span>
      </span>
    </div>
  );
}
