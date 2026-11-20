"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { TaxiGlyph } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { LEVELS } from "@/lib/gamification";
import { haptic, spring } from "@/lib/motion";
import { markAchievementsSeenAction } from "@/server/actions/gamification";

export interface CelebrationItem {
  key: string;
  title: string;
  desc: string;
  emoji: string;
  isLevel: boolean;
  levelIndex: number;
}

/** Zeigt neu freigeschaltete Abzeichen und Level-Aufstiege nacheinander als Animation. */
export function CelebrationGate({ items, onDone }: { items: CelebrationItem[]; onDone?: () => void }) {
  const [queue, setQueue] = useState(items);
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    haptic(30);
    void fireConfetti({ particleCount: current.isLevel ? 160 : 70, spread: current.isLevel ? 110 : 70 });
  }, [current]);

  function next() {
    const rest = queue.slice(1);
    setQueue(rest);
    if (rest.length === 0) {
      void markAchievementsSeenAction(items.map((i) => i.key));
      onDone?.();
    }
  }

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={current.key}
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={next} />
          {current.isLevel ? <LevelUp item={current} onClose={next} /> : <Badge item={current} onClose={next} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LevelUp({ item, onClose }: { item: CelebrationItem; onClose: () => void }) {
  const level = LEVELS[item.levelIndex];
  return (
    <motion.div className="relative w-full max-w-sm text-center" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={spring}>
      {/* Strahlenkranz */}
      <motion.div
        className="pointer-events-none absolute top-14 left-1/2 -z-10 -ml-[260px] -mt-[260px] size-[520px] rounded-full [background:repeating-conic-gradient(var(--glow)_0deg_14deg,transparent_14deg_40deg)] [mask-image:radial-gradient(circle,black_25%,transparent_68%)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, ease: "linear", repeat: Infinity }}
      />
      <motion.div
        className="mx-auto flex size-28 items-center justify-center rounded-[32px] bg-primary text-primary-foreground shadow-[0_0_80px_-10px_var(--glow)]"
        initial={{ rotate: -20, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.15 }}
      >
        <TaxiGlyph className="size-14" />
      </motion.div>
      <motion.p className="mt-6 text-sm font-bold tracking-[0.3em] text-primary uppercase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        Level-Aufstieg!
      </motion.p>
      <motion.h2 id="celebration-title" className="mt-2 text-4xl font-bold text-white" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay: 0.45 }}>
        {level?.name ?? item.title}
      </motion.h2>
      <motion.p className="mt-2 text-white/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        Level {item.levelIndex + 1} von {LEVELS.length} – weiter so, die Prüfung rückt näher!
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
        <Button size="lg" className="mt-8 w-full" onClick={onClose} autoFocus>
          Weiterfahren
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Badge({ item, onClose }: { item: CelebrationItem; onClose: () => void }) {
  return (
    <motion.div
      className="relative w-full max-w-xs rounded-3xl border border-primary/40 bg-[#151b2b] p-8 text-center shadow-[0_0_80px_-20px_var(--glow)]"
      initial={{ rotateY: 180, scale: 0.7, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      style={{ transformPerspective: 900 }}
    >
      <div className="relative mx-auto flex size-24 items-center justify-center">
        {Array.from({ length: 10 }, (_, i) => (
          <motion.span
            key={i}
            className="absolute size-2 rounded-full bg-primary"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos((i / 10) * Math.PI * 2) * 60, y: Math.sin((i / 10) * Math.PI * 2) * 60, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
          />
        ))}
        <motion.span className="text-6xl" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.3, duration: 0.5 }}>
          {item.emoji}
        </motion.span>
      </div>
      <p className="mt-4 text-xs font-bold tracking-[0.25em] text-primary uppercase">Abzeichen freigeschaltet</p>
      <h2 id="celebration-title" className="mt-2 text-2xl font-bold text-white">
        {item.title}
      </h2>
      <p className="mt-1 text-sm text-white/70">{item.desc}</p>
      <Button className="mt-6 w-full" onClick={onClose} autoFocus>
        Super!
      </Button>
    </motion.div>
  );
}
