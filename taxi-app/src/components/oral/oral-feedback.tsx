"use client";

import { Check, ChevronDown, ChevronRight, HelpCircle, Loader2, RotateCcw, Volume2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { verdictLabel, type KeyPoint, type OralVerdict } from "@/lib/oral";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

export type OralResult = {
  attemptId: string;
  verdict: OralVerdict;
  score: number;
  coveredPointIds: string[];
  feedbackDe: string;
  keyPoints: KeyPoint[];
  modelAnswerDe: string;
  legalReference: string | null;
  box?: number;
  previousBox?: number | null;
  remaining?: number | null;
};

const verdictStyle: Record<OralVerdict, string> = {
  richtig: "bg-success text-white",
  teilweise: "bg-warning text-black",
  falsch: "bg-destructive text-white",
};

export function OralFeedback({ result, transcript, onRetry, onNext, nextLabel }: { result: OralResult; transcript: string; onRetry: () => void; onNext: () => void; nextLabel: string }) {
  const reduce = useReducedMotion();
  const [showTranscript, setShowTranscript] = useState(false);
  const [showModel, setShowModel] = useState(result.verdict !== "richtig");
  const [why, setWhy] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });
  const covered = new Set(result.coveredPointIds);

  async function loadWhy() {
    setWhy({ loading: true });
    try {
      const res = await fetch("/api/oral/why", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: result.attemptId }) });
      const json = await res.json();
      setWhy(res.ok ? { loading: false, text: json.explanation } : { loading: false, error: json.error ?? "Fehler" });
    } catch {
      setWhy({ loading: false, error: "Keine Verbindung." });
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-4" data-testid="oral-feedback">
      <div className="flex items-center justify-between gap-3">
        <motion.span
          className={cn("rounded-full px-4 py-1.5 text-sm font-bold", verdictStyle[result.verdict])}
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 14 }}
          data-testid="oral-verdict"
        >
          {verdictLabel(result.verdict)}
        </motion.span>
        <span className="font-display text-3xl font-bold text-navy tabular-nums" aria-label={`${result.score} von 10 Punkten`}>
          <AnimatedNumber value={result.score} />
          <span className="text-lg text-muted-foreground">/10</span>
        </span>
      </div>

      {transcript && (
        <div className="rounded-2xl border border-border bg-card">
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript}>
            Du hast gesagt:
            <ChevronDown className={cn("size-4 transition-transform", showTranscript && "rotate-180")} />
          </button>
          {showTranscript && <p className="px-4 pb-4 text-sm text-muted-foreground italic">„{transcript}“</p>}
        </div>
      )}

      <ul className="space-y-2" aria-label="Kernpunkte">
        {result.keyPoints.map((p, i) => {
          const ok = covered.has(p.id);
          return (
            <motion.li
              key={p.id}
              className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", ok ? "border-success/30 bg-success/8" : "border-destructive/25 bg-destructive/5")}
              initial={reduce ? false : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduce ? 0 : 0.25 + i * 0.12, type: "spring", stiffness: 320, damping: 24 }}
            >
              <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-success text-white" : "bg-destructive text-white")} aria-hidden>
                {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
              <span className="flex-1">
                <span className="sr-only">{ok ? "Genannt: " : "Fehlt: "}</span>
                {p.text}
                {p.required && <span className="ml-1.5 text-[11px] font-bold text-muted-foreground uppercase">Pflicht</span>}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <div className="rounded-2xl bg-muted/60 p-4 text-sm">
        <p>{result.feedbackDe}</p>
        {!why.text && (
          <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={loadWhy} disabled={why.loading}>
            {why.loading ? <Loader2 className="animate-spin" /> : <HelpCircle />} Warum?
          </Button>
        )}
        {why.text && <p className="mt-3 border-t border-border pt-3 text-muted-foreground">{why.text}</p>}
        {why.error && <p className="mt-2 text-destructive">{why.error}</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold" onClick={() => setShowModel((v) => !v)} aria-expanded={showModel}>
          Musterantwort
          <ChevronDown className={cn("size-4 transition-transform", showModel && "rotate-180")} />
        </button>
        {showModel && (
          <div className="space-y-2 px-4 pb-4 text-sm">
            <p data-testid="oral-model-answer">{result.modelAnswerDe}</p>
            {result.legalReference && <p className="text-xs text-muted-foreground">Rechtsgrundlage: {result.legalReference}</p>}
            {speechSupported() && (
              <Button size="sm" variant="outline" onClick={() => (window.speechSynthesis.speaking ? stopSpeaking() : speak(result.modelAnswerDe))}>
                <Volume2 /> Vorlesen
              </Button>
            )}
          </div>
        )}
      </div>

      {result.box != null && (
        <p className="text-center text-xs text-muted-foreground">
          Karteikasten {result.previousBox ?? "neu"} → {result.box}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button variant="outline" size="lg" onClick={onRetry}>
          <RotateCcw /> Nochmal sprechen
        </Button>
        <Button size="lg" onClick={onNext} data-testid="oral-next">
          {nextLabel} <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
