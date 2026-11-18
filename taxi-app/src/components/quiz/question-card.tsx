"use client";

import { Check, CheckCircle2, ExternalLink, Info, Loader2, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { OriginBadge } from "@/components/origin-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnswerReveal } from "@/server/questions";
import type { ActionResult } from "@/server/actions/types";
import { BookmarkButton } from "./bookmark-button";
import type { ClientQuestion } from "./types";

interface Props {
  question: ClientQuestion;
  bookmarked: boolean;
  initialReveal?: AnswerReveal | null;
  onSubmit: (selectedOptionIds: string[], timeSpentSec: number) => Promise<ActionResult<AnswerReveal>>;
  onRevealed?: (reveal: AnswerReveal) => void;
  /** Wird nach dem Aufdecken angezeigt (z. B. „Nächste Frage“) */
  nextSlot?: React.ReactNode;
  onNext?: () => void;
  headerSlot?: React.ReactNode;
}

export function QuestionCard({ question, bookmarked, initialReveal, onSubmit, onRevealed, nextSlot, onNext, headerSlot }: Props) {
  const [selected, setSelected] = useState<string[]>(initialReveal?.selectedOptionIds ?? []);
  const [reveal, setReveal] = useState<AnswerReveal | null>(initialReveal ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(Date.now());
  const resultRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(
    (id: string) => {
      if (reveal) return;
      setError(null);
      setSelected((prev) => {
        if (!question.multipleCorrect) return [id];
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [reveal, question.multipleCorrect],
  );

  const submit = useCallback(() => {
    if (reveal || pending) return;
    if (selected.length === 0) {
      setError("Bitte zuerst eine Antwort auswählen.");
      return;
    }
    start(async () => {
      const res = await onSubmit(selected, Math.round((Date.now() - startedAt.current) / 1000));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReveal(res.data);
      onRevealed?.(res.data);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    });
  }, [reveal, pending, selected, onSubmit, onRevealed]);

  // Tastatursteuerung: A–D / 1–4 auswählen, Enter = prüfen bzw. weiter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const idx = ["A", "B", "C", "D"].indexOf(key) >= 0 ? ["A", "B", "C", "D"].indexOf(key) : ["1", "2", "3", "4"].indexOf(key);
      if (idx >= 0 && question.options[idx]) {
        e.preventDefault();
        toggle(question.options[idx].id);
      } else if (e.key === "Enter" && target?.tagName !== "BUTTON" && target?.tagName !== "A") {
        e.preventDefault();
        if (reveal) onNext?.();
        else submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question.options, toggle, submit, reveal, onNext]);

  const correctSet = new Set(reveal?.correctOptionIds ?? []);
  const selectedSet = new Set(selected);

  return (
    <div className="animate-pop-in space-y-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{question.category.name}</Badge>
          {question.topic && <Badge variant="muted">{question.topic.name}</Badge>}
          <DifficultyBadge difficulty={question.difficulty} />
          <OriginBadge origin={question.origin} verifiedSource={question.source?.verified} />
          <div className="ml-auto flex items-center gap-2">
            {headerSlot}
            <BookmarkButton questionId={question.id} initial={bookmarked} />
          </div>
        </div>

        {question.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.imageUrl} alt="Abbildung zur Frage" className="mb-4 max-h-72 w-full rounded-xl border object-contain" />
        )}

        <h2 className="text-lg leading-relaxed font-bold text-navy sm:text-xl">{question.text}</h2>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          {question.multipleCorrect ? "Mehrfachauswahl: Es können mehrere Antworten richtig sein." : "Wähle die richtige Antwort."}
        </p>

        <div role={question.multipleCorrect ? "group" : "radiogroup"} aria-label="Antwortmöglichkeiten" className="mt-5 space-y-2.5">
          {question.options.map((o) => {
            const isSelected = selectedSet.has(o.id);
            const isCorrect = correctSet.has(o.id);
            const state = !reveal ? (isSelected ? "selected" : "idle") : isCorrect ? "correct" : isSelected ? "wrong" : "dim";
            return (
              <button
                key={o.id}
                type="button"
                role={question.multipleCorrect ? "checkbox" : "radio"}
                aria-checked={isSelected}
                disabled={Boolean(reveal) || pending}
                onClick={() => toggle(o.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border-2 p-3.5 text-left text-[15px] transition-all duration-200 disabled:cursor-default",
                  state === "idle" && "border-border bg-white hover:border-blue-300 hover:bg-blue-50/40",
                  state === "selected" && "border-primary bg-blue-50 shadow-sm shadow-primary/10",
                  state === "correct" && "border-emerald-500 bg-emerald-50",
                  state === "wrong" && "border-rose-500 bg-rose-50",
                  state === "dim" && "border-border bg-white opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center text-sm font-extrabold",
                    question.multipleCorrect ? "rounded-lg" : "rounded-full",
                    state === "idle" && "bg-slate-100 text-slate-600",
                    state === "selected" && "bg-primary text-white",
                    state === "correct" && "bg-emerald-500 text-white",
                    state === "wrong" && "bg-rose-500 text-white",
                    state === "dim" && "bg-slate-100 text-slate-500",
                  )}
                >
                  {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : o.label}
                </span>
                <span className="flex-1 pt-0.5 text-slate-800">{o.text}</span>
              </button>
            );
          })}
        </div>

        {error && <Alert variant="error" className="mt-4">{error}</Alert>}

        {!reveal && (
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">Tipp: Tasten A–D wählen, Enter prüft.</p>
            <Button size="lg" onClick={submit} disabled={pending || selected.length === 0} className="w-full sm:w-auto">
              {pending ? <Loader2 className="animate-spin" /> : null} Antwort prüfen
            </Button>
          </div>
        )}
      </div>

      {reveal && (
        <div ref={resultRef} className="animate-pop-in space-y-4">
          <div className={cn("flex items-center gap-3 rounded-2xl p-4 text-white shadow-md", reveal.isCorrect ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-rose-500 to-rose-600")}>
            {reveal.isCorrect ? <CheckCircle2 className="size-7" /> : <XCircle className="size-7" />}
            <div>
              <p className="text-lg font-extrabold">{reveal.isCorrect ? "Richtig!" : "Leider falsch"}</p>
              <p className="text-sm text-white/90">
                {reveal.isCorrect
                  ? "Sehr gut – weiter so."
                  : `Richtige Antwort: ${reveal.options.filter((o) => o.isCorrect).map((o) => o.label).join(", ")}. Die Frage wurde zu deinen Fehlern hinzugefügt.`}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 font-extrabold text-navy"><Info className="size-5 text-primary" /> Erklärung</h3>
            <p className="mt-2 leading-relaxed whitespace-pre-line text-slate-700">{reveal.explanation}</p>

            <h4 className="mt-5 text-sm font-bold text-navy">Die Antworten im Einzelnen</h4>
            <ul className="mt-2 space-y-2">
              {reveal.options.map((o) => {
                const text = question.options.find((q) => q.id === o.id)?.text;
                return (
                  <li key={o.id} className={cn("rounded-xl border-l-4 p-3 text-sm", o.isCorrect ? "border-emerald-500 bg-emerald-50/60" : "border-rose-300 bg-rose-50/40")}>
                    <p className="font-semibold text-navy">
                      {o.label}) {text}{" "}
                      <span className={o.isCorrect ? "text-emerald-700" : "text-rose-700"}>– {o.isCorrect ? "richtig" : "falsch"}</span>
                    </p>
                    {o.explanation && <p className="mt-1 text-slate-600">{o.explanation}</p>}
                  </li>
                );
              })}
            </ul>

            {(reveal.sourceTitle || reveal.sourceDetail) && (
              <p className="mt-4 text-xs text-muted-foreground">
                Quelle: {[reveal.sourceTitle, reveal.sourceDetail].filter(Boolean).join(" · ")}
                {reveal.sourceUrl && (
                  <a href={reveal.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                    öffnen <ExternalLink className="size-3" />
                  </a>
                )}
              </p>
            )}
            {question.origin !== "OFFICIAL" && (
              <p className="mt-2 text-xs text-amber-700">
                Hinweis: Eigenständig erstellte {question.origin === "DEMO" ? "Demo-Frage" : "Übungsfrage"} – keine offizielle Prüfungsfrage. Rechtslage bitte anhand der aktuellen Gesetzestexte prüfen.
              </p>
            )}
          </div>
          {nextSlot && <div className="sticky bottom-20 z-10 lg:bottom-4">{nextSlot}</div>}
        </div>
      )}
    </div>
  );
}
