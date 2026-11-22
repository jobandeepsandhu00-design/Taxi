"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Languages, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCoach } from "@/components/coach/coach-provider";
import { getHelperLang, storeHelperLang } from "@/lib/helper-lang";
import { HELPER_LANGS, isRtl, type HelperLang } from "@/lib/languages";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getTranslationAction, setHelperLangAction, type TranslationView } from "@/server/actions/variants";

/** @deprecated – Liste lebt jetzt in lib/languages (HELPER_LANGS) */
export const TRANSLATE_LANGS = HELPER_LANGS;

const EXAM_HINT = "Die Prüfung ist auf Deutsch – lerne die deutschen Begriffe.";

/**
 * Übersetzungshilfe als Bottom-Sheet: Frage, Antworten (und nach dem Beantworten die Erklärung)
 * in der Hilfssprache – einmal per KI erzeugt und zwischengespeichert. RTL für Arabisch, Farsi, Urdu.
 */
export function TranslateSheet({ open, onClose, text, questionId, answered = false }: { open: boolean; onClose: () => void; text: string; questionId?: string; answered?: boolean }) {
  const { enabled: aiEnabled } = useCoach();
  const [lang, setLang] = useState<HelperLang>("en");
  const [data, setData] = useState<TranslationView | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (code: HelperLang, persist = false) => {
      setLang(code);
      storeHelperLang(code);
      if (persist) void setHelperLangAction(code).catch(() => undefined);
      setData(null);
      setError(null);
      if (!questionId) return;
      setState("loading");
      const res = await getTranslationAction(questionId, code).catch(() => null);
      if (!res || !res.ok) {
        setError(res && !res.ok ? res.error : "Übersetzung nicht verfügbar.");
        setState("error");
        return;
      }
      setData(res.data);
      setState("idle");
    },
    [questionId],
  );

  useEffect(() => {
    if (open) void run(getHelperLang() ?? "en");
  }, [open, run, answered]);

  const rtl = isRtl(lang);
  const googleUrl = `https://translate.google.com/?sl=de&tl=${lang === "bs" ? "bs" : lang}&text=${encodeURIComponent(text)}&op=translate`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="translate-title">
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="pb-safe relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card-solid p-5 shadow-2xl sm:rounded-3xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-foreground/15 sm:hidden" />
            <button type="button" onClick={onClose} className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-xl hover:bg-muted" aria-label="Schließen">
              <X className="size-5" />
            </button>
            <h2 id="translate-title" className="flex items-center gap-2 text-lg font-bold text-navy">
              <Languages className="size-5 text-link" /> Übersetzungshilfe
            </h2>
            <p className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">🇦🇹 {EXAM_HINT}</p>
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Hilfssprache">
              {HELPER_LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={lang === l.code}
                  onClick={() => void run(l.code, true)}
                  className={cn("min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition", lang === l.code ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/80 hover:border-primary/50")}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-28 rounded-2xl bg-muted p-4" aria-live="polite">
              {state === "loading" && (
                <div className="space-y-2" aria-label="Wird übersetzt">
                  <div className="skeleton h-4 w-11/12" />
                  <div className="skeleton h-4 w-9/12" />
                  <div className="skeleton h-4 w-10/12" />
                </div>
              )}
              {data && (
                <div dir={rtl ? "rtl" : "ltr"} lang={lang} className="space-y-3 text-foreground" data-testid="translation">
                  {!data.verified && <span className="inline-block rounded-full bg-warning/12 px-2 py-0.5 text-[10px] font-bold text-warning">Ungeprüft</span>}
                  <p className="leading-relaxed font-semibold">{data.question}</p>
                  <ul className="space-y-1.5">
                    {data.options.map((o) => (
                      <li key={o.label} className="flex gap-2 leading-relaxed">
                        <span className="font-bold" dir="ltr">
                          {o.label})
                        </span>
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ul>
                  {data.explanation && <p className="border-t border-border pt-3 text-sm leading-relaxed text-foreground/85">{data.explanation}</p>}
                </div>
              )}
              {state === "error" && aiEnabled && (
                <div className="text-sm text-muted-foreground">
                  <p>{error}</p>
                  <button type="button" onClick={() => void run(lang)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-link">
                    <RotateCcw className="size-4" /> Erneut versuchen
                  </button>
                </div>
              )}
              {state === "error" && !aiEnabled && (
                <div className="text-sm text-muted-foreground">
                  <p>Für diese Frage gibt es noch keine Übersetzung in der App – öffne sie im Übersetzer:</p>
                  <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-link hover:underline">
                    In Google Übersetzer öffnen <ExternalLink className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="min-h-11 cursor-pointer py-3">Originaltext (Deutsch)</summary>
              <p className="whitespace-pre-line">{text}</p>
            </details>
            {state === "loading" && <Loader2 className="sr-only" aria-hidden />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
