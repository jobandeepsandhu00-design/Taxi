"use client";

import { AnimatePresence, motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { haptic, spring } from "@/lib/motion";
import { CoachAvatar } from "./coach-avatar";
import { readCoachStream } from "./stream";

/** „Warum?“ – der Coach erklärt die Regel (nur aus Erklärung + Rechtsquelle der Frage). */
export function WhyPanel({ questionId, selectedOptionIds }: { questionId: string; selectedOptionIds: string[] }) {
  const [state, setState] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [text, setText] = useState("");

  async function ask() {
    haptic();
    setState("loading");
    setText("");
    await readCoachStream("/api/coach/why", { questionId, selectedOptionIds }, (e) => {
      if (e.type === "delta") {
        setState("streaming");
        setText((t) => t + e.text);
      } else if (e.type === "error") {
        setText(e.message);
        setState("error");
      } else if (e.type === "done") setState((s) => (s === "error" ? s : "done"));
    }).catch(() => {
      setText("Der Coach ist gerade nicht erreichbar.");
      setState("error");
    });
  }

  return (
    <div>
      {state === "idle" ? (
        <Button variant="outline" onClick={() => void ask()} className="w-full border-primary/40">
          <HelpCircle /> Warum? – Coach erklären lassen
        </Button>
      ) : (
        <AnimatePresence>
          <motion.div className="glass flex gap-3 rounded-2xl border-primary/40 p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} aria-live="polite">
            <CoachAvatar mood={state === "loading" ? "thinking" : state === "error" ? "sad" : state === "done" ? "happy" : "idle"} size={40} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wider text-link uppercase">Dein Taxi-Coach erklärt</p>
              {state === "loading" ? (
                <p className="mt-1 text-sm text-muted-foreground">Einen Moment …</p>
              ) : (
                <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line text-foreground">{text}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
