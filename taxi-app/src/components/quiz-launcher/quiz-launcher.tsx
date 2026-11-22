"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Dice5, Loader2, Play, RotateCcw, Target, Timer, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/motion";
import { configLabel, configToQuery, ORAL_SIM_ANSWER_SEC, simulationQuestionCount, SIM_DURATIONS, type QuizConfig, type QuizType } from "@/lib/quiz-config";
import { cn } from "@/lib/utils";
import { getLauncherDataAction } from "@/server/actions/quiz-launcher";
import type { LauncherData } from "@/server/quiz-launch";

const TYPE_KEY = "tp-launcher-type";
type View = { kind: "home" } | { kind: "confirm"; cfg: QuizConfig } | { kind: "chapters" };

function readType(): QuizType {
  try {
    return localStorage.getItem(TYPE_KEY) === "muendlich" ? "muendlich" : "schriftlich";
  } catch {
    return "schriftlich";
  }
}

/** Quiz-Launcher (Bottom-Sheet): Schriftlich/Mündlich, Simulation, gezieltes Üben, „Zuletzt“. */
export function QuizLauncher({ open, onClose, returnFocus, last }: { open: boolean; onClose: () => void; returnFocus: React.RefObject<HTMLButtonElement | null>; last: QuizConfig | null }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<QuizType>("schriftlich");
  const [data, setData] = useState<LauncherData | null>(null);
  const [view, setView] = useState<View>({ kind: "home" });
  const [starting, setStarting] = useState(false);

  useEffect(() => setType(readType()), []);
  useEffect(() => {
    if (!open) return;
    setView({ kind: "home" });
    setStarting(false);
    void getLauncherDataAction().then(setData).catch(() => undefined);
  }, [open]);

  const close = useCallback(() => {
    onClose();
    window.setTimeout(() => returnFocus.current?.focus(), 50);
  }, [onClose, returnFocus]);

  // Esc schließt, Fokus bleibt im Dialog
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => sheetRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const els = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (els.length === 0) return;
        const first = els[0];
        const lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const switchType = (t: QuizType) => {
    haptic();
    setType(t);
    try {
      localStorage.setItem(TYPE_KEY, t);
    } catch {
      /* ignorieren */
    }
  };

  const start = (cfg: QuizConfig) => {
    haptic(20);
    setStarting(true);
    router.push(`/quiz/start?${configToQuery(cfg)}`);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) close();
  };

  const oral = type === "muendlich";
  const answerSec = data?.answerSec ?? 30;
  const mistakes = data ? (oral ? data.mistakes.muendlich : data.mistakes.schriftlich) : null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 lg:z-50" data-testid="quiz-launcher">
          <motion.button type="button" aria-label="Schließen" tabIndex={-1} className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-launcher-title"
            layoutId={reduce ? undefined : "quiz-launcher"}
            initial={reduce ? { opacity: 0 } : undefined}
            animate={reduce ? { opacity: 1 } : undefined}
            exit={reduce ? { opacity: 0 } : undefined}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            style={{ borderRadius: "28px 28px 0 0" }}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden bg-card-solid shadow-2xl"
          >
            <div className="shrink-0 cursor-grab touch-none px-5 pt-2.5 pb-1" onPointerDown={(e) => drag.start(e)}>
              <div className="mx-auto h-1.5 w-10 rounded-full bg-foreground/15" />
            </div>
            <motion.div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.12 }}>
              <div className="mb-4 flex items-center justify-between gap-2 pt-1">
                {view.kind === "home" ? (
                  <h2 id="quiz-launcher-title" className="text-xl font-extrabold text-navy">
                    Was möchtest du üben?
                  </h2>
                ) : (
                  <button type="button" onClick={() => setView({ kind: "home" })} className="-ml-2 flex min-h-12 items-center gap-1 rounded-xl px-2 text-sm font-bold text-link" id="quiz-launcher-title">
                    <ChevronLeft className="size-4" /> Zurück
                  </button>
                )}
                <button type="button" onClick={close} className="flex size-12 items-center justify-center rounded-full hover:bg-accent" aria-label="Quiz-Auswahl schließen" data-testid="quiz-launcher-close">
                  <X className="size-5" />
                </button>
              </div>

              {view.kind === "home" && (
                <>
                  <Segmented type={type} onChange={switchType} />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduce ? 0.1 : 0.2 }}>
                      <Section title="Prüfung simulieren" delay={0}>
                        <div className="grid grid-cols-3 gap-2" data-testid="sim-cards">
                          {SIM_DURATIONS.map((d, i) => {
                            const n = simulationQuestionCount(type, d);
                            const best = data?.best[type][d] ?? null;
                            return (
                              <motion.button
                                key={d}
                                type="button"
                                onClick={() => setView({ kind: "confirm", cfg: { type, mode: "simulation", durationMin: d } })}
                                initial={reduce ? { opacity: 0 } : { opacity: 0, rotateX: -25, y: 10 }}
                                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 22, delay: reduce ? 0 : 0.04 * i }}
                                whileTap={{ scale: 0.96 }}
                                className="relative flex min-h-[112px] flex-col items-start gap-1 rounded-2xl border border-border bg-background/60 p-3 text-left transition-shadow hover:border-primary focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                                data-testid={`sim-${d}`}
                                data-autofocus={i === 0 ? true : undefined}
                              >
                                {d === 60 && <span className="absolute -top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">Wie echt</span>}
                                <Timer className="size-4 text-primary" />
                                <span className="text-lg leading-none font-extrabold text-navy">{d} min</span>
                                <span className="text-[11px] font-semibold text-muted-foreground">{d === 15 ? "Kurztest" : d === 30 ? "Standard" : "Echte Prüfung"}</span>
                                <span className="mt-auto text-[11px] text-muted-foreground">
                                  {oral ? "≈ " : ""}
                                  {n} Fragen
                                </span>
                                <span className="text-[11px] font-bold text-navy">{best !== null ? `Best: ${best} %` : "–"}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </Section>

                      <Section title="Gezielt üben" delay={0.08}>
                        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                          <Row icon={<BookOpen className="size-5" />} title="Nach Kapitel" text="Kapitel wählen, Anzahl und Zeit festlegen" onClick={() => setView({ kind: "chapters" })} testid="row-chapter" chevron i={0} />
                          <Row icon={<Zap className="size-5" />} title="Mini-Quiz" text={oral ? "3 Fragen · fällige + schwache" : "5 Fragen · fällige + schwache"} onClick={() => start({ type, mode: "mini" })} testid="row-mini" chevron i={1} />
                          <Row
                            icon={<RotateCcw className="size-5" />}
                            title="Fehler wiederholen"
                            text={oral ? "Als „nicht gewusst“ markiert" : "Falsch beantwortete Fragen"}
                            badge={mistakes}
                            onClick={() => start({ type, mode: "mistakes" })}
                            disabled={mistakes === 0}
                            testid="row-mistakes"
                            i={2}
                          />
                          <Row icon={<Dice5 className="size-5" />} title="Zufällig" text="10 Fragen aus freigeschalteten Kapiteln" onClick={() => start({ type, mode: "random" })} testid="row-random" chevron i={3} />
                          <Row icon={<Target className="size-5" />} title="Schwächen-Training" text="Deine 3 schwächsten Kapitel" onClick={() => start({ type, mode: "weak" })} testid="row-weak" i={4} />
                        </ul>
                      </Section>
                    </motion.div>
                  </AnimatePresence>

                  {(data?.last ?? last) && (
                    <button type="button" onClick={() => start((data?.last ?? last)!)} className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-primary/12 px-4 py-3 text-left" data-testid="launcher-last">
                      <Play className="size-5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-navy">
                        Zuletzt: {configLabel((data?.last ?? last)!)}
                        {data?.lastScore != null ? ` · ${data.lastScore} %` : ""}
                      </span>
                    </button>
                  )}

                  <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    Mehr:
                    <Link href="/ueben" className="font-semibold text-link" onClick={close}>
                      Üben & Lektionen
                    </Link>
                    <Link href="/lernkarten" className="font-semibold text-link" onClick={close}>
                      Karteikarten
                    </Link>
                    <Link href="/pruefung" className="font-semibold text-link" onClick={close}>
                      Prüfungsübersicht
                    </Link>
                    <Link href="/muendlich" className="font-semibold text-link" onClick={close}>
                      Mündlich mit Bewertung
                    </Link>
                  </p>
                </>
              )}

              {view.kind === "confirm" && <ConfirmSim cfg={view.cfg} answerSec={answerSec} onStart={() => start(view.cfg)} starting={starting} />}
              {view.kind === "chapters" && <ChapterPicker type={type} data={data} onStart={start} starting={starting} />}
            </motion.div>
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-card-solid/70" aria-live="polite">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="sr-only">Quiz wird gestartet …</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Segmented({ type, onChange }: { type: QuizType; onChange: (t: QuizType) => void }) {
  return (
    <div className="mb-5 grid grid-cols-2 rounded-2xl bg-foreground/6 p-1" role="tablist" aria-label="Art der Prüfung">
      {(["schriftlich", "muendlich"] as const).map((t) => (
        <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => onChange(t)} className="relative min-h-12 rounded-xl text-sm font-bold" data-testid={`launcher-type-${t}`}>
          {type === t && <motion.span layoutId="launcher-type-pill" className="absolute inset-0 rounded-xl bg-card-solid shadow" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className={cn("relative", type === t ? "text-navy" : "text-muted-foreground")}>{t === "schriftlich" ? "✍️ Schriftlich" : "🎙 Mündlich"}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.section className="mb-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <h3 className="mb-2 text-xs font-bold tracking-wider text-link uppercase">{title}</h3>
      {children}
    </motion.section>
  );
}

function Row({ icon, title, text, onClick, badge, chevron, disabled, testid, i }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; badge?: number | null; chevron?: boolean; disabled?: boolean; testid: string; i: number }) {
  return (
    <motion.li initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
      <motion.button type="button" onClick={onClick} disabled={disabled} whileTap={{ scale: 0.98 }} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent disabled:opacity-50" data-testid={testid}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-navy">{title}</span>
          <span className="block text-xs text-muted-foreground">{text}</span>
        </span>
        {badge !== undefined && badge !== null && badge > 0 && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-extrabold text-white">
            <NumberFlow value={badge} />
          </span>
        )}
        {chevron && <ChevronRight className="size-5 text-muted-foreground" />}
      </motion.button>
    </motion.li>
  );
}

function ConfirmSim({ cfg, answerSec, onStart, starting }: { cfg: QuizConfig; answerSec: number; onStart: () => void; starting: boolean }) {
  const oral = cfg.type === "muendlich";
  const n = simulationQuestionCount(cfg.type, cfg.durationMin ?? 30);
  void answerSec;
  const rules = oral
    ? [`≈ ${n} Fragen in ${cfg.durationMin} Minuten`, `Jede Frage wird vorgelesen – ${ORAL_SIM_ANSWER_SEC} s Zeit zum laut Antworten (wie in der Prüfung)`, "Danach hörst du die richtige Antwort und bewertest dich selbst", "Ergebnis am Ende"]
    : [`${n} Fragen · ${cfg.durationMin} Minuten Zeit`, "Der Timer läuft weiter – auch wenn du die App verlässt", "Kein Feedback bis zum Ende", "Fragen markieren und am Ende nochmal ansehen"];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="sim-confirm">
      <p className="text-xs font-bold tracking-wider text-link uppercase">{oral ? "🎙 Mündliche" : "✍️ Schriftliche"} Simulation</p>
      <h3 className="mt-1 text-2xl font-extrabold text-navy">{cfg.durationMin === 60 ? "Echte Prüfung · 60 min" : cfg.durationMin === 30 ? "Standard · 30 min" : "Kurztest · 15 min"}</h3>
      <ul className="mt-4 space-y-2">
        {rules.map((r) => (
          <li key={r} className="flex gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-success" /> {r}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onStart} disabled={starting} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground active:scale-[0.98]" data-testid="sim-start" data-autofocus>
        <Play className="size-5" /> Starten
      </button>
    </motion.div>
  );
}

function ChapterPicker({ type, data, onStart, starting }: { type: QuizType; data: LauncherData | null; onStart: (c: QuizConfig) => void; starting: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [count, setCount] = useState<0 | 10 | 20>(10);
  const [time, setTime] = useState<0 | 15 | 30>(0);
  if (!data) return <Loader2 className="mx-auto size-6 animate-spin text-primary" />;
  const all = data.topics.flatMap((t) => t.chapters.map((c) => c.id));
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const total = data.topics.flatMap((t) => t.chapters).filter((c) => sel.has(c.id)).reduce((s, c) => s + c.total, 0);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="chapter-picker">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-navy">Kapitel wählen</h3>
        <button type="button" className="min-h-12 rounded-xl px-2 text-sm font-bold text-link" onClick={() => setSel(sel.size === all.length ? new Set() : new Set(all))} data-testid="chapter-all">
          {sel.size === all.length ? "Keine" : "Alle auswählen"}
        </button>
      </div>
      <div className="space-y-4">
        {data.topics.map((t) => (
          <div key={t.id}>
            <p className="mb-1 text-xs font-bold text-muted-foreground">{t.title}</p>
            <ul className="space-y-1">
              {t.chapters.map((c) => (
                <li key={c.id}>
                  <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2", sel.has(c.id) ? "border-primary bg-primary/10" : "border-border")}>
                    <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} className="size-5 accent-[var(--primary)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">
                        {c.order}. {c.name}
                      </span>
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-foreground/10">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} />
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{c.total}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 -mx-5 mt-4 space-y-3 border-t border-border bg-card-solid px-5 pt-3 pb-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-16 font-semibold">Fragen</span>
          {([10, 20, 0] as const).map((n) => (
            <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={cn("min-h-10 flex-1 rounded-xl font-bold", count === n ? "bg-primary text-primary-foreground" : "bg-foreground/6")}>
              {n || "Alle"}
            </button>
          ))}
        </div>
        {type === "schriftlich" && (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-16 font-semibold">Zeit</span>
            {([0, 15, 30] as const).map((n) => (
              <button key={n} type="button" aria-pressed={time === n} onClick={() => setTime(n)} className={cn("min-h-10 flex-1 rounded-xl font-bold", time === n ? "bg-primary text-primary-foreground" : "bg-foreground/6")}>
                {n ? `${n} min` : "Ohne"}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={sel.size === 0 || starting}
          onClick={() => onStart({ type, mode: "chapter", chapterIds: [...sel], questionCount: count, timeLimitMin: type === "schriftlich" ? time : 0 })}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-extrabold text-primary-foreground disabled:opacity-50"
          data-testid="chapter-start"
        >
          <Play className="size-5" /> {sel.size ? `Starten · ${count ? Math.min(count, total) : total} Fragen` : "Kapitel wählen"}
        </button>
      </div>
    </motion.div>
  );
}
