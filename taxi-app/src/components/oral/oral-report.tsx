"use client";

import { Check, ChevronDown, Minus, RotateCcw, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CoachAvatar } from "@/components/coach/coach-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { ORAL_PASS_PERCENT, verdictLabel, type KeyPoint, type OralMode, type OralVerdict } from "@/lib/oral";
import { cn } from "@/lib/utils";
import { startOralSessionAction } from "@/server/actions/oral";

export type ReportItem = {
  id: string;
  questionDe: string;
  category: string;
  modelAnswerDe: string;
  keyPoints: KeyPoint[];
  attempt: { verdict: OralVerdict; score: number; transcript: string; followUpQuestion: string | null; followUpTranscript: string | null; coveredPointIds: string[]; feedbackDe: string } | null;
};

export function OralReport({ mode, percent, items }: { mode: OralMode; percent: number; items: ReportItem[] }) {
  const reduce = useReducedMotion();
  const exam = mode === "pruefung";
  const passed = percent >= ORAL_PASS_PERCENT;
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const weak = items.filter((i) => !i.attempt || i.attempt.verdict !== "richtig").map((i) => i.id);

  // Kategorien: Durchschnitt in Prozent
  const cats = new Map<string, { sum: number; n: number }>();
  for (const i of items) {
    const c = cats.get(i.category) ?? { sum: 0, n: 0 };
    if (exam || i.attempt) cats.set(i.category, { sum: c.sum + (i.attempt?.score ?? 0), n: c.n + 1 });
  }

  useEffect(() => {
    if (exam && passed && !reduce) void fireConfetti({ particleCount: 120, spread: 90, origin: { y: 0.35 } });
  }, [exam, passed, reduce]);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} data-testid="oral-report">
      <div className="mx-auto max-w-xl space-y-6 px-4 py-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex justify-end">
          <Link href="/muendlich" className="flex size-11 items-center justify-center rounded-xl text-foreground/80 hover:bg-accent" aria-label="Schließen">
            <X className="size-6" />
          </Link>
        </div>

        <motion.section className="flex flex-col items-center gap-3 text-center" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CoachAvatar mood={exam ? (passed ? "happy" : "sad") : percent >= ORAL_PASS_PERCENT ? "happy" : "idle"} size={88} />
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{exam ? "Mündliche Prüfung" : "Mündlich geübt"}</p>
          <p className="font-display text-5xl font-bold text-navy tabular-nums">
            <AnimatedNumber value={percent} suffix=" %" />
          </p>
          {exam ? (
            <span className={cn("rounded-full px-4 py-1.5 text-sm font-bold", passed ? "bg-success text-white" : "bg-destructive text-white")} data-testid="oral-pass">
              {passed ? "Bestanden" : "Nicht bestanden"}
            </span>
          ) : (
            <p className="text-sm text-muted-foreground">{items.filter((i) => i.attempt?.verdict === "richtig").length} von {items.length} Fragen richtig</p>
          )}
          {exam && <p className="text-xs text-muted-foreground">Bestanden ab {ORAL_PASS_PERCENT} %</p>}
        </motion.section>

        {cats.size > 1 && (
          <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-navy">Nach Kategorie</h2>
            {[...cats.entries()].map(([name, c], i) => {
              const pct = Math.round((c.sum / Math.max(1, c.n * 10)) * 100);
              return (
                <div key={name} className="text-sm">
                  <div className="flex justify-between">
                    <span>{name}</span>
                    <span className="font-semibold tabular-nums">{pct} %</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div className={cn("h-full rounded-full", pct >= ORAL_PASS_PERCENT ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive")} initial={reduce ? { width: `${pct}%` } : { width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }} />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy">Deine Antworten</h2>
          <ul className="space-y-2">
            {items.map((i, idx) => {
              const a = i.attempt;
              const isOpen = open === i.id;
              return (
                <li key={i.id} className="rounded-2xl border border-border bg-card">
                  <button type="button" className="flex w-full items-start gap-3 px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : i.id)} aria-expanded={isOpen}>
                    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white", !a ? "bg-muted-foreground" : a.verdict === "richtig" ? "bg-success" : a.verdict === "teilweise" ? "bg-warning" : "bg-destructive")} aria-hidden>
                      {!a ? <Minus className="size-3.5" /> : a.verdict === "richtig" ? <Check className="size-3.5" /> : a.verdict === "teilweise" ? <Minus className="size-3.5" /> : <X className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {idx + 1}. {i.questionDe}
                      </span>
                      <span className="text-xs text-muted-foreground">{a ? `${verdictLabel(a.verdict)} · ${a.score}/10` : "Nicht beantwortet"}</span>
                    </span>
                    <ChevronDown className={cn("mt-1 size-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-border px-4 py-3 text-sm">
                      {a?.transcript && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">Du hast gesagt:</p>
                          <p className="italic">„{a.transcript}“</p>
                        </div>
                      )}
                      {a?.followUpTranscript && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">Nachfrage: {a.followUpQuestion}</p>
                          <p className="italic">„{a.followUpTranscript}“</p>
                        </div>
                      )}
                      {a && <p className="text-muted-foreground">{a.feedbackDe}</p>}
                      <ul className="space-y-1">
                        {i.keyPoints.map((k) => {
                          const ok = a?.coveredPointIds.includes(k.id);
                          return (
                            <li key={k.id} className="flex gap-2">
                              <span aria-hidden>{ok ? "✅" : "❌"}</span>
                              <span>
                                <span className="sr-only">{ok ? "Genannt: " : "Fehlt: "}</span>
                                {k.text}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">Musterantwort</p>
                        <p>{i.modelAnswerDe}</p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {weak.length > 0 && (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await startOralSessionAction({ mode: "ueben", questionIds: weak });
                  if (res && !res.ok) setError(res.error);
                })
              }
            >
              <RotateCcw /> Schwache Fragen üben ({weak.length})
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/muendlich">Zur Übersicht</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
