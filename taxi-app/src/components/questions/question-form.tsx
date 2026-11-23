"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type Option = { id?: string; text: string; isCorrect: boolean };

const field = "w-full rounded-xl border border-input bg-muted px-3 py-2 text-sm text-foreground";
const LABELS = ["A", "B", "C", "D", "E", "F"];

/**
 * Führt eine Server-Action aus. Bewusst OHNE useTransition: das Formular schließt sich nach dem Speichern
 * (Komponente wird entfernt) – eine noch offene Transition würde sonst spätere Aktualisierungen blockieren.
 */
export function useRun() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) => {
    setPending(true);
    try {
      const r = await fn();
      setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error ?? "Fehler" });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Speichern fehlgeschlagen – bitte erneut versuchen." });
    } finally {
      setPending(false);
    }
  };
  return { pending, msg, run, setMsg };
}

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={cn("text-xs font-semibold", msg.ok ? "text-success" : "text-destructive")} role="status">{msg.text}</p>;
}

/** Bearbeiten/Anlegen einer Frage mit Antworten */
export type QuestionFormValue = { text: string; options: Option[]; explanation: string; sourceDetail: string; published: boolean; archived?: boolean };
export type SaveResult = { ok: boolean; message?: string; error?: string };

export function QuestionForm({ q, onSave, onDone, showMeta = true, minOptions = 2 }: { q?: QuestionFormValue; onSave: (v: QuestionFormValue) => Promise<SaveResult>; onDone: () => void; showMeta?: boolean; minOptions?: number }) {
  const { pending, msg, run } = useRun();
  const [text, setText] = useState(q?.text ?? "");
  const [options, setOptions] = useState<Option[]>(q?.options.length ? q.options : [{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);
  const [explanation, setExplanation] = useState(q?.explanation ?? "");
  const [source, setSource] = useState(q?.sourceDetail ?? "");
  const [published, setPublished] = useState(q ? q.published : true);
  const setOpt = (i: number, patch: Partial<Option>) => setOptions((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  return (
    <form
      className="space-y-3"
      data-testid="question-form"
      onSubmit={(e) => {
        e.preventDefault();
        const opts = options.filter((o) => o.text.trim());
        void run(() => onSave({ text, explanation, sourceDetail: source, published, options: opts }), onDone);
      }}
    >
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted-foreground">Frage</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} required className={field} aria-label="Frage" />
      </label>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground">Antworten – Haken = richtig</span>
        {options.map((o, i) => (
          <div key={o.id ?? `new-${i}`} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setOpt(i, { isCorrect: !o.isCorrect })}
              aria-pressed={o.isCorrect}
              aria-label={`Antwort ${LABELS[i]} ${o.isCorrect ? "ist richtig" : "als richtig markieren"}`}
              className={cn("mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border-2 text-xs font-extrabold", o.isCorrect ? "border-success bg-success text-white" : "border-border text-muted-foreground")}
            >
              {o.isCorrect ? <Check className="size-4" /> : LABELS[i]}
            </button>
            <textarea value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} rows={o.isCorrect ? 3 : 2} className={field} aria-label={`Antwort ${LABELS[i]}`} placeholder={o.isCorrect ? "Richtige Antwort" : "Falsche Antwort (optional)"} />
            {options.length > minOptions && (
              <button type="button" onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} aria-label={`Antwort ${LABELS[i]} entfernen`} className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button type="button" onClick={() => setOptions((os) => [...os, { text: "", isCorrect: false }])} className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-link">
            <Plus className="size-3.5" /> Antwort hinzufügen
          </button>
        )}
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted-foreground">Erklärung (optional)</span>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={field} aria-label="Erklärung" />
      </label>
      {showMeta && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Quelle (optional)</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} className={cn(field, "h-10")} aria-label="Quelle" placeholder="z. B. Skript, Frage 12 / § 5 BO" />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-4" /> Veröffentlicht (für Lernende sichtbar){q?.archived && !published ? " – bleibt archiviert" : ""}
        </label>
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground" data-testid="question-save">
          {pending && <Loader2 className="size-4 animate-spin" />} Speichern
        </button>
        <button type="button" onClick={onDone} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-accent">
          Abbrechen
        </button>
        <Msg msg={msg} />
      </div>
    </form>
  );
}

