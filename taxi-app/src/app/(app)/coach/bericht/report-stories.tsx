"use client";

import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CoachAvatar } from "@/components/coach/coach-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { WeeklyReportData } from "@/lib/coach-plan";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DURATION = 6000;

function fmt(k: string) {
  return new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${k}T00:00:00Z`));
}

export function ReportStories({ data, weekStart, preview }: { data: WeeklyReportData; weekStart: string; preview: boolean }) {
  const slides: { key: string; bg: string; content: React.ReactNode }[] = [
    {
      key: "intro",
      bg: "from-[#1b2340] to-[#0b0f1a]",
      content: (
        <div className="flex flex-col items-center text-center">
          <CoachAvatar mood="happy" size={120} />
          <p className="mt-6 text-sm font-bold tracking-widest text-primary uppercase">Wochenbericht ab {fmt(weekStart)}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">{data.headline}</h1>
          {preview && <p className="mt-3 text-xs text-white/60">Vorschau – der fertige Bericht kommt am Sonntag.</p>}
        </div>
      ),
    },
    {
      key: "stats",
      bg: "from-[#3b2a00] to-[#0b0f1a]",
      content: (
        <div className="w-full space-y-4">
          <p className="text-center text-sm font-bold tracking-widest text-primary uppercase">Deine Woche in Zahlen</p>
          {[
            { label: "Fragen beantwortet", value: data.stats.answered, suffix: "" },
            { label: "Trefferquote", value: data.stats.accuracy ?? 0, suffix: " %", hide: data.stats.accuracy === null },
            { label: "Lerntage", value: data.stats.activeDays, suffix: " / 7" },
            { label: "Serie", value: data.stats.streak, suffix: " 🔥" },
          ]
            .filter((s) => !s.hide)
            .map((s, i) => (
              <motion.div key={s.label} className="rounded-2xl bg-white/10 p-4" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.15 + i * 0.12 }}>
                <p className="text-xs text-white/70">{s.label}</p>
                <p className="font-display text-4xl font-bold text-white">
                  <AnimatedNumber value={s.value} />
                  {s.suffix}
                </p>
              </motion.div>
            ))}
        </div>
      ),
    },
    {
      key: "strengths",
      bg: "from-[#06351f] to-[#0b0f1a]",
      content: (
        <div className="w-full text-center">
          <p className="text-5xl">💪</p>
          <p className="mt-3 text-sm font-bold tracking-widest text-success uppercase">Deine Stärken</p>
          {data.strengths.length ? (
            <div className="mt-5 space-y-3">
              {data.strengths.map((s, i) => (
                <motion.div key={s.name} className="rounded-2xl bg-white/10 p-4 text-left" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring, delay: 0.2 + i * 0.15 }}>
                  <p className="font-bold text-white">{s.name}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                    <motion.div className="h-full rounded-full bg-success" initial={{ width: 0 }} animate={{ width: `${s.accuracy}%` }} transition={{ duration: 0.9, delay: 0.4 + i * 0.15 }} />
                  </div>
                  <p className="mt-1 text-xs text-white/70">{s.accuracy} % richtig</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-white/80">Noch keine Kategorie mit 70 %+ – aber das kommt! Ab 5 Antworten pro Kategorie werte ich aus.</p>
          )}
        </div>
      ),
    },
    {
      key: "weak",
      bg: "from-[#3a0d14] to-[#0b0f1a]",
      content: (
        <div className="w-full text-center">
          <p className="text-5xl">🎯</p>
          <p className="mt-3 text-sm font-bold tracking-widest text-destructive uppercase">Hier geht noch was</p>
          <div className="mt-5 space-y-3">
            {data.weaknesses.map((w, i) => (
              <motion.div key={w.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.15 }}>
                <Link href={`/lernen/${w.slug}`} className="block rounded-2xl bg-white/10 p-4 text-left">
                  <p className="font-bold text-white">{w.name}</p>
                  <p className="text-xs text-white/70">
                    {w.masteredPct} % gemeistert{w.accuracy !== null ? ` · ${w.accuracy} % richtig` : ""} · jetzt üben →
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "prognosis",
      bg: "from-[#0b2a4a] to-[#0b0f1a]",
      content: (
        <div className="text-center">
          <p className="text-5xl">🔮</p>
          <p className="mt-3 text-sm font-bold tracking-widest text-link uppercase">Prognose</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white">{data.prognosis.readyDate ? <>Prüfungsbereit voraussichtlich am {fmt(data.prognosis.readyDate)}</> : "Noch zu wenig Daten"}</h2>
          <p className="mt-3 text-white/70">
            Sicherheit: {data.prognosis.confidence} · Trend: {data.prognosis.trend}
          </p>
          {data.coachNote && (
            <motion.p className="mt-6 rounded-2xl bg-white/10 p-4 text-left text-sm text-white/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              💬 {data.coachNote}
            </motion.p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      bg: "from-[#3b2a00] to-[#0b0f1a]",
      content: (
        <div className="w-full">
          <p className="text-center text-sm font-bold tracking-widest text-primary uppercase">Deine 3 Schritte für nächste Woche</p>
          <ol className="mt-6 space-y-3">
            {data.actions.map((a, i) => (
              <motion.li key={a} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.15 }}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{i + 1}</span>
                <span className="text-white">{a}</span>
              </motion.li>
            ))}
          </ol>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/dashboard" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Los geht&apos;s
            </Link>
            <Link href="/coach" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white">
              Mit dem Coach reden
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const last = slides.length - 1;

  const go = useCallback(
    (d: number) => {
      setIdx((i) => {
        const n = Math.max(0, Math.min(last, i + d));
        if (n !== i) haptic();
        return n;
      });
      setDir(d);
    },
    [last],
  );

  useEffect(() => {
    if (paused || idx === last) return;
    const t = window.setTimeout(() => go(1), DURATION);
    return () => window.clearTimeout(t);
  }, [idx, paused, last, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60) go(1);
    else if (info.offset.x > 60) go(-1);
  }

  const slide = slides[idx];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" data-testid="report-stories">
      <div className={cn("relative h-full w-full max-w-md overflow-hidden bg-gradient-to-b sm:h-[90vh] sm:rounded-3xl", slide.bg)}>
        {/* Fortschrittsbalken */}
        <div className="pt-safe absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-3">
          {slides.map((s, i) => (
            <div key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              {i < idx ? (
                <div className="h-full w-full bg-white" />
              ) : i === idx ? (
                <motion.div key={`${s.key}-${paused}`} className="h-full bg-white" initial={{ width: idx === last ? "100%" : "0%" }} animate={{ width: "100%" }} transition={{ duration: paused || idx === last ? 0 : DURATION / 1000, ease: "linear" }} style={paused ? { width: "50%" } : undefined} />
              ) : null}
            </div>
          ))}
        </div>
        <Link href="/coach" className="pt-safe absolute top-6 right-3 z-20 rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Bericht schließen">
          <X className="size-5" />
        </Link>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={slide.key}
            custom={dir}
            className="absolute inset-0 flex items-center justify-center px-6 pt-16 pb-10"
            initial={{ opacity: 0, x: dir * 80, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dir * -80, scale: 0.96 }}
            transition={spring}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={onDragEnd}
          >
            {slide.content}
          </motion.div>
        </AnimatePresence>

        {/* Tippzonen */}
        <button type="button" className="absolute top-16 bottom-44 left-0 z-10 w-1/4" aria-label="Vorherige Karte" onClick={() => go(-1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />
        <button type="button" className="absolute top-16 bottom-44 right-0 z-10 w-1/4" aria-label="Nächste Karte" onClick={() => go(1)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />
        <p className="absolute inset-x-0 bottom-3 text-center text-[11px] text-white/50">
          {idx + 1} / {slides.length} · tippen oder wischen
        </p>
      </div>
    </div>
  );
}
