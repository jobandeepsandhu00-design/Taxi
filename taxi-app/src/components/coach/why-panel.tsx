"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, HelpCircle, Lightbulb, RotateCcw, Scale, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CoachAvatar } from "./coach-avatar";

type WhyData = {
  answer: string;
  explanation: string | null;
  mnemonic: string | null;
  simple: string | null;
  legal: string | null;
  wrong: { label: string; text: string } | null;
};

/** „Warum?“ – Erklärung, Merkhilfe, Einfache Sprache und § direkt aus der Datenbank (ohne KI). */
export function WhyPanel({ questionId, selectedOptionIds, isCorrect = false, autoOpen = false }: { questionId: string; selectedOptionIds: string[]; isCorrect?: boolean; autoOpen?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(autoOpen ? "loading" : "idle");
  const [data, setData] = useState<WhyData | null>(null);
  const [started, setStarted] = useState(false);

  async function load() {
    haptic();
    setState("loading");
    try {
      const res = await fetch("/api/coach/why", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId, selectedOptionIds }) });
      if (!res.ok) throw new Error();
      setData((await res.json()) as WhyData);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (autoOpen && !started) {
    setStarted(true);
    void load();
  }

  if (state === "idle") {
    return (
      <Button variant="outline" onClick={() => void load()} className={cn("min-h-12 w-full", !isCorrect && "border-primary/50")} data-testid="why-button">
        <HelpCircle /> {isCorrect ? "Warum ist das richtig?" : "Warum?"}
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div className="glass flex gap-3 rounded-2xl p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} aria-live="polite" data-testid="why-panel">
        <CoachAvatar mood={state === "loading" ? "thinking" : state === "error" ? "sad" : "happy"} size={44} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-link uppercase">Toni erklärt</p>
          {state === "loading" && (
            <div className="mt-2 space-y-2" aria-label="Erklärung wird geladen">
              <div className="skeleton h-3.5 w-11/12" />
              <div className="skeleton h-3.5 w-8/12" />
            </div>
          )}
          {state === "error" && (
            <div className="mt-1">
              <p className="text-sm">Das hat gerade nicht geklappt.</p>
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => void load()}>
                <RotateCcw /> Erneut versuchen
              </Button>
            </div>
          )}
          {state === "done" && data && (
            <div className="mt-2 space-y-3 text-[15px] leading-relaxed">
              <Block icon={<Check className="size-3.5" />} label="Richtige Antwort" delay={0}>
                <p className="whitespace-pre-line">{data.answer}</p>
              </Block>
              <Block icon={<HelpCircle className="size-3.5" />} label="Erklärung" delay={0.05}>
                {data.explanation ? <p className="whitespace-pre-line">{data.explanation}</p> : <p className="text-muted-foreground" data-testid="why-pending">Erklärung folgt – wir ergänzen sie bald.</p>}
              </Block>
              {data.simple && (
                <Block icon={<Sparkles className="size-3.5" />} label="Einfach erklärt" delay={0.1}>
                  <p className="whitespace-pre-line">{data.simple}</p>
                </Block>
              )}
              {data.mnemonic && (
                <motion.div className="rounded-xl bg-secondary px-3 py-2 text-secondary-foreground" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }}>
                  <p className="flex items-center gap-1 text-xs font-bold">
                    <Lightbulb className="size-3.5" /> Merkhilfe
                  </p>
                  <p>{data.mnemonic}</p>
                </motion.div>
              )}
              {data.wrong && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2">
                  <p className="text-xs font-bold text-destructive">Warum war deine Antwort ({data.wrong.label}) falsch?</p>
                  <p className="text-sm">{data.wrong.text}</p>
                </div>
              )}
              {data.legal && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Scale className="size-3.5" /> {data.legal}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Block({ icon, label, delay, children }: { icon: React.ReactNode; label: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay }}>
      <p className="flex items-center gap-1 text-xs font-bold text-navy">
        {icon} {label}
      </p>
      {children}
    </motion.div>
  );
}
