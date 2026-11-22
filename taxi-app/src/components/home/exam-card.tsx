"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Headphones, Loader2, PenLine, Play, Timer, Zap } from "lucide-react";
import { useFormStatus } from "react-dom";
import { haptic } from "@/lib/motion";
import { startLessonAction } from "@/server/actions/learning";

function LessonButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" onPointerDown={() => haptic()} className="flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-white/80 hover:text-white">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />} 3-Min-Lektion
    </button>
  );
}

/** Große Premium-Karte auf der Startseite: Schriftliche und Mündliche Prüfung (halb/halb). */
export function ExamCard({ bestWritten, bestOral }: { bestWritten: number | null; bestOral: number | null }) {
  const reduce = useReducedMotion();
  return (
    <section
      aria-label="Prüfung üben"
      data-testid="exam-card"
      className="relative overflow-hidden rounded-[28px] p-1 shadow-[0_20px_50px_-20px_rgba(15,23,42,.55)]"
      style={{ background: "linear-gradient(135deg, #ffc400 0%, #f59e0b 35%, #2563eb 70%, #1e3a8a 100%)" }}
    >
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,#0b1220_0%,#111c33_60%,#0b1220_100%)] p-4 text-white">
        {!reduce && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: "-120%" }}
            animate={{ x: "320%" }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
          />
        )}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold tracking-[0.18em] text-[#ffc400] uppercase">Prüfung üben</p>
          <span className="rounded-full bg-gradient-to-r from-[#ffc400] to-[#f59e0b] px-2.5 py-0.5 text-[10px] font-extrabold text-[#111] uppercase">Premium</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Schriftlich */}
          <div className="flex flex-col rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#ffc400] text-[#111] shadow-[0_6px_20px_-6px_rgba(255,196,0,.7)]">
              <PenLine className="size-5" />
            </span>
            <h3 className="mt-3 text-[17px] leading-tight font-extrabold">Schriftliche Prüfung</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <Timer className="size-3.5" /> 30 Fragen · 30 min
            </p>
            {bestWritten !== null && <p className="mt-0.5 text-xs font-bold text-[#ffc400]">Best: {bestWritten} %</p>}
            <span className="min-h-3 flex-1" aria-hidden />
            <Link
              href="/quiz/start?type=schriftlich&mode=simulation&d=30"
              prefetch={false}
              onClick={() => haptic()}
              className="mt-auto flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#ffc400] text-sm font-extrabold text-[#111] active:scale-[0.97]"
              data-testid="exam-card-written"
            >
              <Play className="size-4" /> Starten
            </Link>
            <form action={startLessonAction} data-testid="lesson-cta" className="mt-1 flex justify-center">
              <LessonButton />
            </form>
          </div>
          {/* Mündlich */}
          <div className="flex flex-col rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-[0_6px_20px_-6px_rgba(37,99,235,.8)]">
              <Headphones className="size-5" />
            </span>
            <h3 className="mt-3 text-[17px] leading-tight font-extrabold">Mündliche Prüfung</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
              <Headphones className="size-3.5" /> Hören · laut antworten
            </p>
            {bestOral !== null && <p className="mt-0.5 text-xs font-bold text-[#93c5fd]">Best: {bestOral} %</p>}
            <span className="min-h-3 flex-1" aria-hidden />
            <Link href="/muendlich/auto" onClick={() => haptic()} className="mt-auto flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] text-sm font-extrabold text-white active:scale-[0.97]" data-testid="exam-card-oral">
              <Play className="size-4" /> Starten
            </Link>
            <Link href="/quiz/start?type=muendlich&mode=simulation&d=15" prefetch={false} className="mt-1 flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold text-white/80 hover:text-white">
              <Timer className="size-3.5" /> 15-min-Test
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
