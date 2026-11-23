"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Check, Loader2, Sparkles, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { TaxiFitMark } from "@/components/brand/taxifit-mark";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { addDays, diffDays } from "@/lib/dates";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "@/server/actions/auth";

/*
 * Onboarding im „Wiener Weiß“-Stil: Weiß, Taxigelb, Schwarz.
 * Feste Farben (unabhängig von Theme/Dunkelmodus), damit alles immer gut lesbar ist.
 */

type ExamType = "TAXILENKER" | "KONZESSION";

const exams: { id: ExamType; title: string; desc: string; points: string[]; icon: typeof UserRound }[] = [
  { id: "TAXILENKER", title: "Taxilenker:in", desc: "Du willst selbst Taxi fahren.", points: ["Taxilenkerausweis", "Ortskunde & Recht"], icon: UserRound },
  { id: "KONZESSION", title: "Konzession", desc: "Du willst ein Taxiunternehmen führen.", points: ["Unternehmerprüfung", "Recht & Kalkulation"], icon: Building2 },
];

const goals = [
  { minutes: 10, title: "Locker", desc: "ca. 10 Fragen am Tag", emoji: "🌱" },
  { minutes: 20, title: "Regelmäßig", desc: "ca. 20 Fragen am Tag", emoji: "🚕", recommended: true },
  { minutes: 30, title: "Intensiv", desc: "ca. 30 Fragen am Tag", emoji: "🔥" },
];

const STEPS = [
  { title: "Welche Prüfung machst du?", sub: "Wir passen Lernplan und Tipps an dein Ziel an." },
  { title: "Wann ist dein Termin?", sub: "Mit Termin bekommst du einen Countdown und einen Lernplan bis zum Tag X." },
  { title: "Wie viel Zeit pro Tag?", sub: "Dein Tagesziel – du kannst es später jederzeit ändern." },
];

const QUICK_DATES = [
  { label: "In 1 Monat", days: 30 },
  { label: "In 2 Monaten", days: 61 },
  { label: "In 3 Monaten", days: 91 },
];

function formatDate(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return d.toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/* ── Illustrationen ──────────────────────────────────────── */

function Hero({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const Icon = step === 0 ? UserRound : step === 1 ? CalendarDays : Sparkles;
  return (
    <div className="relative mx-auto flex size-28 items-center justify-center" aria-hidden>
      <motion.span
        className="absolute inset-0 rounded-[36px] bg-[#FFC400]"
        initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
        animate={{ rotate: step * 8 - 6, scale: 1, opacity: 1 }}
        transition={spring}
      />
      <motion.span
        className="absolute inset-2 rounded-[30px] bg-[#111] shadow-[0_20px_40px_-18px_rgba(0,0,0,.6)]"
        initial={{ scale: 0.85 }}
        animate={{ scale: 1, rotate: step * -4 + 3 }}
        transition={{ ...spring, delay: 0.05 }}
      />
      <motion.span
        key={step}
        className="relative text-[#FFC400]"
        initial={{ scale: 0.4, opacity: 0, y: 8 }}
        animate={reduce ? { scale: 1, opacity: 1, y: 0 } : { scale: 1, opacity: 1, y: [0, -3, 0] }}
        transition={{ ...spring, delay: 0.12, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
      >
        <Icon className="size-11" strokeWidth={2.2} />
      </motion.span>
    </div>
  );
}

/* ── Seite ───────────────────────────────────────────────── */

export function OnboardingFlow({ name, today }: { name: string | null; today: string }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [date, setDate] = useState("");
  const [noDate, setNoDate] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pending, start] = useTransition();

  const days = date ? diffDays(today, date) : null;
  const canNext = step === 0 ? examType !== null : step === 1 ? noDate || (days !== null && days >= 0) : goal !== null;

  function go(delta: number) {
    haptic();
    setDir(delta);
    setStep((s) => Math.min(2, Math.max(0, s + delta)));
  }

  function finish() {
    if (!examType || !goal) return;
    start(async () => {
      const res = await completeOnboardingAction({ examType, targetExamDate: noDate ? "" : date, dailyGoalMinutes: goal });
      if (res.error) {
        setError(res.error);
        return;
      }
      setLeaving(true);
      window.setTimeout(() => window.location.assign(res.redirectTo ?? "/dashboard"), 550);
    });
  }

  const hint = step === 0 ? "Wähle eine Prüfung" : step === 1 ? "Wähle einen Termin" : "Wähle dein Tagesziel";

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-white text-[#111] [color-scheme:light]">
      {/* sanfter gelber Schein oben */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(255,196,0,.28),rgba(255,196,0,0)_70%)]" />

      <div className="pt-safe mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
        {/* Kopf: Zurück · Fortschritt · Schritt */}
        <header className="flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Zurück"
            className={cn("flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[#111] transition active:scale-95", step === 0 && "invisible")}
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label={`Schritt ${step + 1} von 3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#ececec]">
                <motion.span className="absolute inset-y-0 left-0 rounded-full bg-[#FFC400]" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.35, ease: "easeOut" }} />
              </span>
            ))}
          </div>
          <span className="w-11 shrink-0 text-right text-sm font-bold text-[#8a8f98] tabular-nums">{step + 1}/3</span>
        </header>

        <div className="mt-1 flex items-center gap-2">
          <TaxiFitMark size={22} />
          <p className="text-sm font-bold text-[#6b7280]">{name ? `Servus, ${name}!` : "Servus! Willkommen bei TaxiFit"}</p>
        </div>

        <div className="relative mt-5 flex-1 pb-36">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section
              key={step}
              custom={dir}
              initial={{ x: dir * 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -48, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              aria-labelledby={`step-title-${step}`}
            >
              <Hero step={step} />
              <h1 id={`step-title-${step}`} className="mt-6 text-center font-display text-[28px] leading-tight font-extrabold tracking-tight text-[#111]">
                {STEPS[step].title}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-center text-[15px] leading-snug text-[#6b7280]">{STEPS[step].sub}</p>

              {/* Schritt 1: Prüfung */}
              {step === 0 && (
                <div className="mt-7 grid gap-3">
                  {exams.map((e) => {
                    const active = examType === e.id;
                    return (
                      <motion.button
                        key={e.id}
                        type="button"
                        aria-pressed={active}
                        aria-label={e.title}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          haptic();
                          setExamType(e.id);
                        }}
                        className={cn(
                          "relative flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#FFC400]/40",
                          active ? "border-[#FFC400] bg-[#FFF8DB] shadow-[0_12px_30px_-16px_rgba(255,170,0,.8)]" : "border-[#ececec] bg-white",
                        )}
                      >
                        <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl transition-colors", active ? "bg-[#111] text-[#FFC400]" : "bg-[#f4f4f5] text-[#111]")}>
                          <e.icon className="size-7" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg leading-tight font-extrabold text-[#111]">{e.title}</span>
                          <span className="mt-0.5 block text-sm text-[#4b5563]">{e.desc}</span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {e.points.map((p) => (
                              <span key={p} className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", active ? "bg-white text-[#111]" : "bg-[#f4f4f5] text-[#6b7280]")}>
                                {p}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition", active ? "border-[#111] bg-[#111] text-[#FFC400]" : "border-[#d4d4d8]")} aria-hidden>
                          {active && <Check className="size-4" strokeWidth={3} />}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Schritt 2: Termin */}
              {step === 1 && (
                <div className="mt-7 space-y-3">
                  <div className={cn("rounded-3xl border-2 border-[#ececec] bg-white p-4 transition", noDate && "opacity-40")}>
                    <label htmlFor="exam-date" className="text-sm font-bold text-[#111]">
                      Prüfungstermin
                    </label>
                    <input
                      id="exam-date"
                      type="date"
                      value={date}
                      min={today}
                      disabled={noDate}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border-2 border-[#ececec] bg-[#fafafa] px-3 text-base font-semibold text-[#111] outline-none transition focus:border-[#FFC400]"
                      aria-label="Prüfungstermin"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {QUICK_DATES.map((q) => {
                        const key = addDays(today, q.days);
                        const active = date === key;
                        return (
                          <button
                            key={q.days}
                            type="button"
                            disabled={noDate}
                            onClick={() => {
                              haptic();
                              setDate(key);
                            }}
                            className={cn("min-h-9 rounded-full border-2 px-3 text-xs font-bold transition active:scale-95", active ? "border-[#111] bg-[#111] text-white" : "border-[#ececec] bg-white text-[#374151]")}
                          >
                            {q.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence>
                    {!noDate && days !== null && days >= 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        className="flex items-center gap-4 rounded-3xl bg-[#111] p-4 text-white"
                        aria-live="polite"
                      >
                        <div className="flex min-w-[88px] flex-col items-center rounded-2xl bg-[#FFC400] px-3 py-2 text-[#111]">
                          <span className="font-display text-4xl leading-none font-extrabold tabular-nums">
                            <AnimatedNumber value={days} />
                          </span>
                          <span className="text-[11px] font-extrabold uppercase">{days === 1 ? "Tag" : "Tage"}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold">bis zur Prüfung</p>
                          <p className="text-xs text-white/70">{formatDate(date)}</p>
                          {days >= 14 && <p className="mt-1 text-xs font-semibold text-[#FFC400]">≈ {Math.round(days / 7)} Wochen Zeit – das schaffst du!</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <label className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-3xl border-2 p-4 text-sm font-semibold transition", noDate ? "border-[#FFC400] bg-[#FFF8DB] text-[#111]" : "border-[#ececec] bg-white text-[#374151]")}>
                    <input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} className="size-5 accent-[#111]" />
                    Mein Termin steht noch nicht fest
                  </label>
                </div>
              )}

              {/* Schritt 3: Tagesziel */}
              {step === 2 && (
                <div className="mt-7 grid gap-3" role="radiogroup" aria-label="Tagesziel">
                  {goals.map((g) => {
                    const active = goal === g.minutes;
                    return (
                      <motion.button
                        key={g.minutes}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${g.minutes} Minuten – ${g.title}`}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          haptic();
                          setGoal(g.minutes);
                        }}
                        className={cn(
                          "relative flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#FFC400]/40",
                          active ? "border-[#FFC400] bg-[#FFF8DB] shadow-[0_12px_30px_-16px_rgba(255,170,0,.8)]" : "border-[#ececec] bg-white",
                        )}
                      >
                        <span className={cn("flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl leading-none transition-colors", active ? "bg-[#111] text-[#FFC400]" : "bg-[#f4f4f5] text-[#111]")}>
                          <span className="font-display text-2xl font-extrabold">{g.minutes}</span>
                          <span className="text-[10px] font-extrabold uppercase">Min</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-lg leading-tight font-extrabold text-[#111]">
                            {g.title} <span aria-hidden>{g.emoji}</span>
                          </span>
                          <span className="mt-0.5 block text-sm text-[#4b5563]">{g.desc}</span>
                        </span>
                        {g.recommended && <span className="absolute -top-2.5 right-4 rounded-full bg-[#111] px-2.5 py-0.5 text-[11px] font-extrabold text-[#FFC400]">Empfohlen</span>}
                        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition", active ? "border-[#111] bg-[#111] text-[#FFC400]" : "border-[#d4d4d8]")} aria-hidden>
                          {active && <Check className="size-4" strokeWidth={3} />}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>

      {/* Fester Aktionsbereich unten */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white via-white to-white/0 pt-8 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg px-5">
          {error && (
            <p role="alert" className="mb-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-semibold text-[#b91c1c]">
              {error}
            </p>
          )}
          {step < 2 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => go(1)}
              className={cn(
                "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold transition active:scale-[0.98]",
                canNext ? "bg-[#FFC400] text-[#111] shadow-[0_14px_30px_-14px_rgba(255,170,0,.9)]" : "bg-[#f1f1f1] text-[#9ca3af]",
              )}
            >
              {canNext ? (
                <>
                  Weiter <ArrowRight className="size-5" />
                </>
              ) : (
                hint
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canNext || pending}
              onClick={finish}
              className={cn(
                "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold transition active:scale-[0.98]",
                canNext ? "bg-[#111] text-white shadow-[0_14px_30px_-14px_rgba(0,0,0,.7)]" : "bg-[#f1f1f1] text-[#9ca3af]",
              )}
            >
              {pending ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Wird gespeichert …
                </>
              ) : canNext ? (
                <>
                  Los geht&apos;s <ArrowRight className="size-5 text-[#FFC400]" />
                </>
              ) : (
                hint
              )}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {leaving && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFC400]" initial={{ clipPath: "circle(0% at 50% 100%)" }} animate={{ clipPath: "circle(150% at 50% 100%)" }} transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1] }}>
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25 }}>
              <TaxiFitMark size={72} animated />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
