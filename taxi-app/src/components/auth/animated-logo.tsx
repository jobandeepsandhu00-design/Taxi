"use client";

import { motion } from "motion/react";
import { TaxiFitMark } from "@/components/brand/taxifit-mark";

const word = "TaxiFit";

/** Logo-Intro: TaxiFit-Icon springt herein, das Häkchen zeichnet sich, dann tippt sich der Schriftzug ein. */
export function AnimatedLogo() {
  return (
    <div className="flex items-center gap-3" aria-label="TaxiFit">
      <motion.span className="rounded-[12px] shadow-[0_0_30px_-4px_var(--glow)]" initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        <TaxiFitMark size={44} animated />
      </motion.span>
      <span className="leading-none">
        <span className="flex font-display text-xl font-bold tracking-tight text-white">
          {word.split("").map((ch, i) => (
            <motion.span
              key={i}
              className={i >= 4 ? "text-primary" : undefined}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.05, duration: 0.18 }}
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
          Taxi-Prüfung · Wien
        </motion.span>
      </span>
    </div>
  );
}
