"use client";

import { AnimatePresence, motion } from "motion/react";
import { Globe, HelpCircle, Lightbulb, RotateCcw, Scale, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getHelperLang } from "@/lib/helper-lang";
import { isRtl, langInfo, type HelperLang } from "@/lib/languages";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { rateVariantAction } from "@/server/actions/variants";
import { CoachAvatar } from "./coach-avatar";
import { readCoachStream } from "./stream";

type Section = { key: "regel" | "beispiel" | "merkhilfe" | "recht" | "text"; label: string; text: string };

const PREFIXES: { re: RegExp; key: Section["key"]; label: string }[] = [
  { re: /^\s*(?:\d\)\s*)?(?:Regel|Die Regel|Rule)\s*:\s*/i, key: "regel", label: "Die Regel" },
  { re: /^\s*(?:\d\)\s*)?(?:Beispiel(?: aus dem (?:Taxi-)?Alltag)?|Example)\s*:\s*/i, key: "beispiel", label: "Beispiel aus dem Taxi-Alltag" },
  { re: /^\s*(?:\d\)\s*)?(?:Merkhilfe|Tip|Memory aid)\s*:\s*/i, key: "merkhilfe", label: "Merkhilfe" },
  { re: /^\s*(?:\d\)\s*)?(?:Rechtsgrundlage|Legal basis)\s*:\s*/i, key: "recht", label: "Rechtsgrundlage" },
];

/** Zerlegt die Coach-Antwort in Abschnitte (funktioniert auch während des Streamens). */
export function parseWhy(text: string): Section[] {
  const out: Section[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const p = PREFIXES.find((x) => x.re.test(line));
    if (p) out.push({ key: p.key, label: p.label, text: line.replace(p.re, "") });
    else if (out.length) out[out.length - 1].text += ` ${line}`;
    else out.push({ key: "text", label: "", text: line });
  }
  return out;
}

const sectionStyle: Record<Section["key"], string> = {
  regel: "",
  beispiel: "",
  merkhilfe: "rounded-xl bg-secondary px-3 py-2 text-secondary-foreground",
  recht: "text-sm text-muted-foreground",
  text: "",
};

function Rating({ variantId }: { variantId: string }) {
  const [value, setValue] = useState<1 | -1 | null>(null);
  const rate = (v: 1 | -1) => {
    const next = value === v ? null : v;
    setValue(next);
    haptic();
    void rateVariantAction(variantId, next ?? 0);
  };
  return (
    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
      <span className="mr-1">Hilfreich?</span>
      {([1, -1] as const).map((v) => (
        <motion.button
          key={v}
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={() => rate(v)}
          aria-pressed={value === v}
          aria-label={v === 1 ? "Hilfreiche Erklärung" : "Erklärung nicht hilfreich – zur Prüfung melden"}
          className={cn("flex size-11 items-center justify-center rounded-xl transition-colors", value === v ? (v === 1 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive") : "hover:bg-accent hover:text-foreground")}
        >
          {v === 1 ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
        </motion.button>
      ))}
      {value === -1 && <span className="ml-1">Danke – wir prüfen die Erklärung.</span>}
    </div>
  );
}

/** „Warum?“ – kurze Erklärung (Regel, Beispiel, Merkhilfe, Rechtsgrundlage) nur aus Erklärung + Rechtsquelle der Frage. */
export function WhyPanel({ questionId, selectedOptionIds, isCorrect = false }: { questionId: string; selectedOptionIds: string[]; isCorrect?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [wrong, setWrong] = useState<{ label: string; text: string } | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [verified, setVerified] = useState(true);
  const [lang, setLang] = useState<"de" | HelperLang>("de");
  const [helper, setHelper] = useState<HelperLang | null>(null);
  useEffect(() => setHelper(getHelperLang()), []);

  async function ask(l: "de" | HelperLang = "de") {
    haptic();
    setLang(l);
    setState("loading");
    setText("");
    setWrong(null);
    setVariantId(null);
    await readCoachStream("/api/coach/why", { questionId, selectedOptionIds, lang: l }, (e) => {
      if (e.type === "meta") {
        if (e.variantId) setVariantId(e.variantId);
        if (e.verified !== undefined) setVerified(e.verified);
      } else if (e.type === "delta") {
        setState("streaming");
        setText((t) => t + e.text);
      } else if (e.type === "extra") {
        setWrong({ label: e.label, text: e.text });
      } else if (e.type === "error") {
        setText(e.message);
        setState("error");
      } else if (e.type === "done") setState((s) => (s === "error" ? s : "done"));
    }).catch(() => {
      setText("Der Coach ist gerade nicht erreichbar.");
      setState("error");
    });
  }

  const sections = parseWhy(text);
  const rtl = lang !== "de" && isRtl(lang);

  if (state === "idle") {
    return (
      <Button variant="outline" onClick={() => void ask()} className={cn("min-h-12 w-full", !isCorrect && "border-primary/50")}>
        <HelpCircle /> {isCorrect ? "Warum ist das richtig?" : "Warum? – Coach erklären lassen"}
      </Button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div className="glass flex gap-3 rounded-2xl p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} aria-live="polite" data-testid="why-panel">
        <CoachAvatar mood={state === "loading" ? "thinking" : state === "error" ? "sad" : state === "done" ? "happy" : "thinking"} size={44} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider text-link uppercase">
            Dein Taxi-Coach erklärt
            {state === "done" && !verified && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[10px] tracking-normal text-warning normal-case">Ungeprüft</span>}
          </p>
          {state === "loading" ? (
            <div className="mt-2 space-y-2" aria-label="Erklärung wird erstellt">
              <div className="skeleton h-3.5 w-11/12" />
              <div className="skeleton h-3.5 w-8/12" />
            </div>
          ) : state === "error" ? (
            <div className="mt-1">
              <p className="text-sm text-foreground">{text}</p>
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => void ask(lang)}>
                <RotateCcw /> Erneut versuchen
              </Button>
            </div>
          ) : (
            <div dir={rtl ? "rtl" : "ltr"} lang={lang} className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-foreground">
              {sections.map((s, i) => (
                <motion.div key={`${s.key}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={sectionStyle[s.key]}>
                  {s.label && (
                    <p className="flex items-center gap-1 text-xs font-bold text-navy">
                      {s.key === "merkhilfe" ? <Lightbulb className="size-3.5" /> : s.key === "recht" ? <Scale className="size-3.5" /> : null}
                      {s.label}
                    </p>
                  )}
                  <p>{s.text}</p>
                </motion.div>
              ))}
              {state === "streaming" && <span className="inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />}
              {wrong && (
                <motion.div className="rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
                  <p className="text-xs font-bold text-destructive">Warum war deine Antwort ({wrong.label}) falsch?</p>
                  <p className="text-sm">{wrong.text}</p>
                </motion.div>
              )}
            </div>
          )}
          {state === "done" && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {variantId && <Rating variantId={variantId} />}
              {helper && (
                <Button size="sm" variant="ghost" className="mt-2 min-h-11" onClick={() => void ask(lang === "de" ? helper : "de")}>
                  <Globe /> {lang === "de" ? `Auf ${langInfo(helper).label} erklären` : "Auf Deutsch erklären"}
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
