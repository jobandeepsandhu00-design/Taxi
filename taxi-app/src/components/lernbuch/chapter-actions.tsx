"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Loader2, ShieldAlert, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChapterSummaryAction, startChapterCheckAction } from "@/server/actions/lernbuch";
import { spring } from "@/lib/motion";

type Summary = { content: string; keyNumbers: { value: string; unit: string; rule: string }[]; traps: string[]; verified: boolean };

/** Kapitel-Check starten – erst wenn alle Karten gelesen sind. */
export function ChapterCheckButton({ categoryId, ready, remaining, score }: { categoryId: string; ready: boolean; remaining: number; score: number | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Trophy className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-navy">Kapitel-Check</h3>
          <p className="text-sm text-muted-foreground">
            5 Fragen · ab 80 % ist das Kapitel fürs Quiz freigeschaltet.
            {score !== null && <> Bestes Ergebnis: <b>{score} %</b>.</>}
          </p>
          {!ready && <p className="mt-1 text-xs font-semibold text-warning">Noch {remaining} {remaining === 1 ? "Karte" : "Karten"} lesen, dann geht’s los.</p>}
          {error && <p className="mt-1 text-xs font-semibold text-destructive" role="alert">{error}</p>}
        </div>
      </div>
      <Button
        className="mt-3 w-full"
        disabled={!ready || pending}
        data-testid="start-chapter-check"
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await startChapterCheckAction(categoryId);
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} Kapitel-Check starten
      </Button>
    </div>
  );
}

/** Spickzettel: KI-Zusammenfassung + wichtige Zahlen + 3 Fallen (zwischengespeichert). */
export function SpickzettelButton({ categoryId, title }: { categoryId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const load = () => {
    setOpen(true);
    if (data) return;
    start(async () => {
      const r = await getChapterSummaryAction(categoryId);
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
  };
  return (
    <>
      <button type="button" onClick={load} className="glass glow-hover flex w-full items-center gap-3 rounded-2xl p-4 text-left" data-testid="spickzettel">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><FileText className="size-5" /></span>
        <span className="flex-1">
          <span className="block font-extrabold text-navy">Spickzettel</span>
          <span className="block text-xs text-muted-foreground">Das Wichtigste auf einen Blick</span>
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Spickzettel ${title}`}>
            <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              className="pb-safe relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card-solid p-5 shadow-2xl sm:rounded-3xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-navy">Spickzettel: {title}</h2>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-accent" aria-label="Schließen">
                  <X className="size-5" />
                </button>
              </div>
              {pending && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Wird erstellt …</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {data && (
                <div className="space-y-4 text-sm">
                  {!data.verified && (
                    <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning">
                      <ShieldAlert className="size-4 shrink-0" /> KI-Zusammenfassung aus den Skript-Antworten – noch nicht geprüft. Im Zweifel gilt das Skript.
                    </p>
                  )}
                  <p className="leading-relaxed whitespace-pre-line" data-testid="spickzettel-content">{data.content}</p>
                  {data.keyNumbers.length > 0 && (
                    <div>
                      <h3 className="mb-2 font-bold text-navy">Wichtige Zahlen</h3>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {data.keyNumbers.map((k, i) => (
                          <li key={i} className="rounded-xl bg-foreground/5 p-3">
                            <span className="text-lg font-extrabold text-primary">{k.value}</span> <span className="font-semibold">{k.unit}</span>
                            <span className="block text-xs text-muted-foreground">{k.rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.traps.length > 0 && (
                    <div>
                      <h3 className="mb-2 font-bold text-navy">Typische Fallen</h3>
                      <ul className="list-disc space-y-1 pl-5">
                        {data.traps.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
