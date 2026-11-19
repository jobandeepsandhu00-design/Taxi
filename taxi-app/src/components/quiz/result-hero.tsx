"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { TaxiCar } from "@/components/auth/taxi-drive";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { fireConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sound";
import { spring } from "@/lib/motion";

export interface CategoryScore {
  name: string;
  pct: number;
  color: string;
  correct: number;
  total: number;
}

function Trophy() {
  return (
    <motion.svg viewBox="0 0 64 64" className="size-24" initial={{ y: -40, scale: 0.4, opacity: 0 }} animate={{ y: [-40, 6, 0], scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: "easeOut" }} aria-hidden>
      <path d="M18 8h28v12a14 14 0 0 1-28 0z" fill="#ffc400" />
      <path d="M18 12H9a9 9 0 0 0 9 12M46 12h9a9 9 0 0 1-9 12" fill="none" stroke="#ffc400" strokeWidth={4} />
      <rect x={28} y={34} width={8} height={10} fill="#f2b300" />
      <rect x={20} y={44} width={24} height={8} rx={2} fill="#ffc400" />
      <motion.path d="M26 14l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L17 21l6-1z" fill="#fff6c7" transform="translate(6 -2) scale(0.8)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6, 1] }} transition={{ delay: 0.7, duration: 1 }} />
    </motion.svg>
  );
}

function BrokenTaxi() {
  return (
    <div className="relative h-24 w-44" aria-hidden>
      <motion.div className="absolute bottom-0 left-0 w-40" initial={{ rotate: 0 }} animate={{ rotate: [0, -3, -2] }} transition={{ delay: 0.4, duration: 0.6 }} style={{ originX: 0.9, originY: 1 }}>
        <TaxiCar broken className="w-full" />
      </motion.div>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute top-6 left-28 size-5 rounded-full bg-slate-400/60 blur-[2px]"
          initial={{ opacity: 0, y: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.8, 0], y: -40, x: i * 8 - 6, scale: 1.6 }}
          transition={{ duration: 1.8, delay: 0.6 + i * 0.5, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/** Vollbild-Ergebnis: Score zählt hoch, Pokal bzw. Taxi-Panne, Balken je Kategorie. */
export function ResultHero({
  pct,
  passed,
  title,
  subtitle,
  correct,
  total,
  categories,
  xp,
  children,
}: {
  pct: number;
  passed: boolean;
  title: string;
  subtitle?: string;
  correct: number;
  total: number;
  categories: CategoryScore[];
  xp?: number;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (passed) {
      playSound("levelUp");
      const t = window.setTimeout(() => void fireConfetti({ particleCount: 140, spread: 100, origin: { y: 0.35 } }), 500);
      return () => window.clearTimeout(t);
    }
    playSound("wrong");
  }, [passed]);

  return (
    <div className="space-y-5">
      <motion.section
        className={`panel-night rounded-3xl p-6 text-center sm:p-10 ${passed ? "ring-1 ring-success/40" : "ring-1 ring-destructive/40"}`}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
      >
        <div className="flex justify-center">{passed ? <Trophy /> : <BrokenTaxi />}</div>
        <motion.p className={`mt-3 text-xs font-bold tracking-[0.25em] uppercase ${passed ? "text-success" : "text-red-300"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {passed ? "Bestanden" : "Noch nicht bestanden"}
        </motion.p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
        <p className="mt-5 font-display text-7xl font-bold text-white">
          <AnimatedNumber value={pct} suffix=" %" />
        </p>
        <p className="text-sm text-white/70">
          {correct} von {total} richtig
        </p>
        {xp ? (
          <motion.p className="mt-3 inline-flex rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.9 }}>
            +{xp} XP gesammelt
          </motion.p>
        ) : null}
        {children && <div className="mt-7">{children}</div>}
      </motion.section>

      {categories.length > 0 && (
        <section className="glass rounded-2xl p-5" aria-label="Ergebnis nach Kategorie">
          <h2 className="font-bold text-navy">Ergebnis nach Kategorie</h2>
          <ul className="mt-4 space-y-3">
            {categories.map((c, i) => (
              <li key={c.name}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-foreground/85">{c.name}</span>
                  <span className="shrink-0 font-bold text-navy tabular-nums">
                    {c.correct}/{c.total} · {c.pct} %
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    className="h-full origin-left rounded-full"
                    style={{ background: c.color }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.max(0.02, c.pct / 100) }}
                    transition={{ ...spring, delay: 0.5 + i * 0.08 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
