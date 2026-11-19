"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { greetingFor } from "@/lib/gamification";

/** Begrüßung je Tageszeit mit winkender Hand. */
export function Greeting({ name, hour, subtitle }: { name: string; hour: number; subtitle: string }) {
  return (
    <div>
      <motion.h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {greetingFor(hour)}, {name}{" "}
        <motion.span
          className="inline-block origin-[70%_75%]"
          animate={{ rotate: [0, 16, -8, 16, -4, 10, 0] }}
          transition={{ duration: 1.6, delay: 0.5, repeat: Infinity, repeatDelay: 3.5 }}
          aria-hidden
        >
          👋
        </motion.span>
      </motion.h1>
      <motion.p className="mt-1.5 text-sm text-muted-foreground sm:text-base" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {subtitle}
      </motion.p>
    </div>
  );
}

function FlipDigit({ d }: { d: string }) {
  return (
    <span className="relative inline-flex h-8 w-6 items-center justify-center overflow-hidden rounded-md bg-night text-white shadow-inner [perspective:200px]">
      <span className="absolute inset-x-0 top-1/2 z-10 h-px bg-black/50" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={d}
          className="font-display text-lg font-bold tabular-nums"
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ transformOrigin: "50% 50%" }}
        >
          {d}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Prüfungs-Countdown-Chip mit Flip-Uhr-Ziffern (zählt beim Laden hoch). */
export function CountdownChip({ days }: { days: number | null }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (days === null || days <= 0) return;
    let v = 0;
    const step = Math.max(1, Math.ceil(days / 12));
    const id = window.setInterval(() => {
      v = Math.min(days, v + step);
      setShown(v);
      if (v >= days) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [days]);

  if (days === null) {
    return (
      <Link href="/profil" className="glass glow-hover inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-navy">
        <CalendarClock className="size-4 text-link" /> Prüfungstermin festlegen
      </Link>
    );
  }
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-sm font-bold text-primary-foreground">
        <CalendarClock className="size-4" /> {days === 0 ? "Heute ist Prüfungstag – viel Erfolg!" : "Prüfungstermin vorbei – neuen Termin setzen?"}
      </span>
    );
  }
  const digits = String(shown).padStart(Math.max(2, String(days).length), "0").split("");
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1.5 text-sm font-semibold text-navy" aria-label={`Noch ${days} Tage bis zur Prüfung`}>
      <span className="flex gap-0.5" aria-hidden>
        {digits.map((d, i) => (
          <FlipDigit key={i} d={d} />
        ))}
      </span>
      <span aria-hidden>{days === 1 ? "Tag" : "Tage"} bis zur Prüfung</span>
    </span>
  );
}
