"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Timer, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { CityBackground } from "@/components/motion/city-background";
import { Button } from "@/components/ui/button";
import { diffDays } from "@/lib/dates";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "@/server/actions/auth";

type ExamType = "TAXILENKER" | "KONZESSION";

const exams: { id: ExamType; title: string; desc: string; icon: typeof UserRound }[] = [
  { id: "TAXILENKER", title: "Taxilenker:in", desc: "Prüfung für den Taxilenkerausweis – du willst selbst Taxi fahren.", icon: UserRound },
  { id: "KONZESSION", title: "Konzession", desc: "Prüfung für die Taxi-Konzession – du willst ein Taxiunternehmen führen.", icon: ClipboardList },
];

const goals = [
  { minutes: 10, title: "Locker", desc: "ca. 10 Fragen am Tag" },
  { minutes: 20, title: "Regelmäßig", desc: "ca. 20 Fragen am Tag" },
  { minutes: 30, title: "Intensiv", desc: "ca. 30 Fragen am Tag" },
];

/* ── Animierte Illustrationen je Schritt ─────────────────── */

function IllustrationExam() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-auto" aria-hidden>
      <motion.rect x={40} y={20} width={120} height={80} rx={12} fill="#151b2b" stroke="#ffc400" strokeWidth={2} initial={{ rotate: -8, y: 10, opacity: 0 }} animate={{ rotate: -4, y: 0, opacity: 1 }} transition={spring} style={{ originX: "100px", originY: "60px" }} />
      <motion.circle cx={75} cy={55} r={14} fill="#ffc400" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.2 }} />
      {[0, 1, 2].map((i) => (
        <motion.rect key={i} x={98} y={44 + i * 12} height={6} rx={3} fill="#94a3b8" initial={{ width: 0 }} animate={{ width: [40, 30, 36][i] }} transition={{ delay: 0.3 + i * 0.1 }} />
      ))}
      <motion.text x={100} y={92} textAnchor="middle" fontSize={10} fontWeight={800} fill="#ffc400" fontFamily="var(--font-grotesk)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.3, 1] }} transition={{ delay: 0.6, duration: 0.8 }}>
        TAXI · WIEN
      </motion.text>
    </svg>
  );
}

function IllustrationCalendar() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-auto" aria-hidden>
      <rect x={60} y={18} width={80} height={86} rx={12} fill="#151b2b" stroke="rgba(255,255,255,0.15)" />
      <rect x={60} y={18} width={80} height={24} rx={12} fill="#e3000f" />
      <rect x={60} y={32} width={80} height={10} fill="#e3000f" />
      {[78, 122].map((x) => (
        <rect key={x} x={x - 3} y={10} width={6} height={16} rx={3} fill="#94a3b8" />
      ))}
      <motion.g initial={{ rotateX: 90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ ...spring, delay: 0.15 }} style={{ originY: "42px" }}>
        <text x={100} y={86} textAnchor="middle" fontSize={34} fontWeight={700} fill="#ffc400" fontFamily="var(--font-grotesk)">
          24
        </text>
      </motion.g>
    </svg>
  );
}

function IllustrationTimer() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-auto" aria-hidden>
      <rect x={93} y={8} width={14} height={10} rx={3} fill="#94a3b8" />
      <circle cx={100} cy={64} r={42} fill="#151b2b" stroke="rgba(255,255,255,0.12)" strokeWidth={8} />
      <motion.circle cx={100} cy={64} r={42} fill="none" stroke="#ffc400" strokeWidth={8} strokeLinecap="round" transform="rotate(-90 100 64)" initial={{ pathLength: 0 }} animate={{ pathLength: 0.66 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      <motion.line x1={100} y1={64} x2={100} y2={36} stroke="#fff" strokeWidth={4} strokeLinecap="round" initial={{ rotate: 0 }} animate={{ rotate: 240 }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ originX: "100px", originY: "64px" }} />
      <circle cx={100} cy={64} r={5} fill="#ffc400" />
    </svg>
  );
}

/* ── Bausteine ───────────────────────────────────────────── */

/** Große Auswahlkarte, die sich beim Wählen umdreht. */
function FlipCard({ selected, onSelect, front, back, label }: { selected: boolean; onSelect: () => void; front: React.ReactNode; back: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={label} className="flip-scene block w-full text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded-2xl">
      <motion.div className="relative grid" animate={{ rotateY: selected ? 180 : 0 }} transition={spring} style={{ transformStyle: "preserve-3d" }}>
        <div className="flip-face col-start-1 row-start-1 rounded-2xl border border-white/10 bg-white/[0.04] p-4">{front}</div>
        <div className="flip-face flip-back col-start-1 row-start-1 rounded-2xl border border-primary bg-primary/12 p-4 shadow-[0_0_40px_-10px_var(--glow)]">{back}</div>
      </motion.div>
    </button>
  );
}

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
      window.setTimeout(() => window.location.assign(res.redirectTo ?? "/dashboard"), 650);
    });
  }

  const titles = ["Welche Prüfung?", "Wann ist dein Prüfungstermin?", "Wie viel Zeit pro Tag?"];
  const subtitles = [
    "Wir passen Lernplan und Hinweise an dein Ziel an.",
    "Mit Termin zeigen wir dir einen Countdown und planen deine Lerntage.",
    "Dein Tagesziel – du kannst es später jederzeit ändern.",
  ];

  return (
    <div className="dark relative isolate flex min-h-dvh flex-col bg-night text-foreground">
      <CityBackground />
      <div className="pt-safe mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-8">
        {/* Kopf */}
        <div className="flex items-center justify-between pt-5">
          <p className="text-sm font-semibold text-muted-foreground">{name ? `Servus, ${name}!` : "Servus!"}</p>
          <div className="flex gap-1.5" aria-label={`Schritt ${step + 1} von 3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="relative h-2 w-8 overflow-hidden rounded-full bg-white/10">
                {i <= step && <motion.span layoutId={i === step ? "step-dot" : undefined} className="absolute inset-0 rounded-full bg-primary" />}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-6 flex-1">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.section
              key={step}
              custom={dir}
              initial={{ x: dir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -60, opacity: 0 }}
              transition={spring}
              aria-labelledby={`step-title-${step}`}
            >
              <div className="flex justify-center">{step === 0 ? <IllustrationExam /> : step === 1 ? <IllustrationCalendar /> : <IllustrationTimer />}</div>
              <h1 id={`step-title-${step}`} className="mt-4 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {titles[step]}
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">{subtitles[step]}</p>

              {step === 0 && (
                <div className="mt-6 grid gap-3">
                  {exams.map((e) => (
                    <FlipCard
                      key={e.id}
                      label={e.title}
                      selected={examType === e.id}
                      onSelect={() => {
                        haptic();
                        setExamType(e.id);
                      }}
                      front={
                        <div className="flex items-center gap-4">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                            <e.icon className="size-6" />
                          </span>
                          <span>
                            <span className="block font-display text-lg font-bold text-white">{e.title}</span>
                            <span className="block text-sm text-muted-foreground">{e.desc}</span>
                          </span>
                        </div>
                      }
                      back={
                        <div className="flex items-center gap-4">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <Check className="size-6" />
                          </span>
                          <span>
                            <span className="block font-display text-lg font-bold text-white">{e.title}</span>
                            <span className="block text-sm text-primary">Ausgewählt – gute Wahl!</span>
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="mt-6 space-y-4">
                  <label className={cn("block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition", noDate && "opacity-50")}>
                    <span className="text-sm font-semibold text-white/80">Prüfungstermin</span>
                    <input
                      type="date"
                      value={date}
                      min={today}
                      disabled={noDate}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-2 h-12 w-full rounded-xl border border-input bg-white/[0.04] px-3 text-base text-white outline-none transition focus:border-primary [color-scheme:dark]"
                      aria-label="Prüfungstermin"
                    />
                  </label>
                  <AnimatePresence>
                    {!noDate && days !== null && days >= 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center"
                        aria-live="polite"
                      >
                        <p className="text-sm font-semibold text-primary">Noch</p>
                        <p className="font-display text-5xl font-bold text-white">
                          <AnimatedNumber value={days} />
                        </p>
                        <p className="text-sm font-semibold text-white/80">{days === 1 ? "Tag" : "Tage"} bis zur Prüfung</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
                    <input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} className="size-4" />
                    Mein Termin steht noch nicht fest
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="mt-6 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Tagesziel">
                  {goals.map((g) => {
                    const active = goal === g.minutes;
                    return (
                      <motion.button
                        key={g.minutes}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          haptic();
                          setGoal(g.minutes);
                        }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ y: active ? -4 : 0 }}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-colors",
                          active ? "border-primary bg-primary/12 shadow-[0_0_40px_-10px_var(--glow)]" : "border-white/10 bg-white/[0.04]",
                        )}
                      >
                        <Timer className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-display text-3xl font-bold text-white">{g.minutes}</span>
                        <span className="text-xs font-semibold text-white/70">Min · {g.title}</span>
                        <span className="text-[11px] text-muted-foreground">{g.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>

        {error && (
          <p role="alert" className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" size="lg" className="border-white/15 bg-white/[0.04]" onClick={() => go(-1)} aria-label="Zurück">
              <ArrowLeft />
            </Button>
          )}
          {step < 2 ? (
            <Button size="lg" className="flex-1" disabled={!canNext} onClick={() => go(1)}>
              Weiter <ArrowRight />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" disabled={!canNext || pending} onClick={finish}>
              {pending ? "Wird gespeichert…" : "Los geht's"} <ArrowRight />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {leaving && (
          <motion.div className="fixed inset-0 z-50 origin-left bg-primary" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, ease: [0.7, 0, 0.3, 1] }} />
        )}
      </AnimatePresence>
    </div>
  );
}
