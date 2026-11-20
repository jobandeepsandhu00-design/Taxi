"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Languages, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const TRANSLATE_LANGS = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية", rtl: true },
  { code: "fa", label: "فارسی", rtl: true },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "bs", label: "Bosanski" },
  { code: "ro", label: "Română" },
  { code: "pl", label: "Polski" },
  { code: "uk", label: "Українська" },
  { code: "hu", label: "Magyar" },
] as const;

type TranslatorLike = { translate: (t: string) => Promise<string> };
type TranslatorApi = {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<TranslatorLike>;
};

function getTranslator(): TranslatorApi | null {
  const t = (globalThis as unknown as { Translator?: TranslatorApi }).Translator;
  return t ?? null;
}

function preferredLang(): string {
  try {
    return localStorage.getItem("tp-lang") ?? "en";
  } catch {
    return "en";
  }
}

/** Übersetzungshilfe als Bottom-Sheet. Nutzt die geräteinterne Browser-Übersetzung, sonst Google Übersetzer. */
export function TranslateSheet({ open, onClose, text }: { open: boolean; onClose: () => void; text: string }) {
  const [lang, setLang] = useState<string>("en");
  const [result, setResult] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unavailable" | "error">("idle");

  const run = useCallback(
    async (code: string) => {
      setLang(code);
      try {
        localStorage.setItem("tp-lang", code);
      } catch {
        /* ignorieren */
      }
      setResult(null);
      const api = getTranslator();
      if (!api) {
        setState("unavailable");
        return;
      }
      setState("loading");
      try {
        const timeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), 3500))]);
        const avail = await timeout(api.availability({ sourceLanguage: "de", targetLanguage: code }));
        // Nur bereits installierte Sprachmodelle nutzen – keine langen Downloads im Hintergrund
        if (avail !== "available") {
          setState("unavailable");
          return;
        }
        const tr = await timeout(api.create({ sourceLanguage: "de", targetLanguage: code }));
        setResult(await timeout(tr.translate(text)));
        setState("idle");
      } catch {
        setState("error");
      }
    },
    [text],
  );

  useEffect(() => {
    if (open) void run(preferredLang());
  }, [open, run]);

  const meta = TRANSLATE_LANGS.find((l) => l.code === lang);
  const googleUrl = `https://translate.google.com/?sl=de&tl=${lang}&text=${encodeURIComponent(text)}&op=translate`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="translate-title">
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="pb-safe relative w-full max-w-lg rounded-t-3xl border border-border bg-card-solid p-5 shadow-2xl sm:rounded-3xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-foreground/15 sm:hidden" />
            <button type="button" onClick={onClose} className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-muted" aria-label="Schließen">
              <X className="size-5" />
            </button>
            <h2 id="translate-title" className="flex items-center gap-2 text-lg font-bold text-navy">
              <Languages className="size-5 text-link" /> Übersetzungshilfe
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Nur zum Verständnis – die Prüfung findet auf Deutsch statt.</p>
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
              {TRANSLATE_LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => void run(l.code)}
                  className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition", lang === l.code ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/80 hover:border-primary/50")}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="mt-4 min-h-24 rounded-2xl bg-muted p-4" aria-live="polite">
              {state === "loading" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Wird übersetzt…
                </p>
              )}
              {result && (
                <p dir={meta && "rtl" in meta && meta.rtl ? "rtl" : "ltr"} lang={lang} className="leading-relaxed whitespace-pre-line text-foreground">
                  {result}
                </p>
              )}
              {(state === "unavailable" || state === "error") && (
                <div className="text-sm text-muted-foreground">
                  <p>Dein Browser bietet für diese Sprache keine geräteinterne Übersetzung an.</p>
                  <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-link hover:underline">
                    In Google Übersetzer öffnen <ExternalLink className="size-3.5" />
                  </a>
                </div>
              )}
            </div>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Originaltext</summary>
              <p className="mt-1 whitespace-pre-line">{text}</p>
            </details>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
