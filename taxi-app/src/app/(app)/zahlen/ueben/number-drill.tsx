"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FlipValue } from "@/components/numbers/flip-value";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { fillStatement } from "@/lib/number-facts";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { answerNumberAction, finishNumberDrillAction, getNumberDrillAction, type NumberAnswer } from "@/server/actions/numbers";
import type { DrillItem } from "@/server/numbers";

type Type = "auswahl" | "eingabe" | "blitz";
const BLITZ_SECONDS = 60;
const titles: Record<Type, string> = { auswahl: "Auswahl", eingabe: "Eingabe", blitz: "Blitz-Runde" };

function Unverified({ show }: { show: boolean }) {
  return show ? <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[10px] font-bold text-warning">Ungeprüft</span> : null;
}

export function NumberDrill({ type }: { type: Type }) {
  const [items, setItems] = useState<DrillItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [result, setResult] = useState<NumberAnswer | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState("");
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [combo, setCombo] = useState(0);
  const [busy, setBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BLITZ_SECONDS);
  const [done, setDone] = useState(false);
  const [xp, setXp] = useState(0);
  const finished = useRef(false);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    setI(0);
    setScore(0);
    setAnswered(0);
    setCombo(0);
    setDone(false);
    setResult(null);
    setTimeLeft(BLITZ_SECONDS);
    finished.current = false;
    const res = await getNumberDrillAction(type).catch(() => null);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Laden fehlgeschlagen.");
      return;
    }
    setItems(res.data);
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = useCallback(async (finalScore: number, total: number) => {
    if (finished.current) return;
    finished.current = true;
    setDone(true);
    if (total > 0 && finalScore / total >= 0.8) {
      playSound("levelUp");
      void fireConfetti({ particleCount: 90, spread: 80 });
    }
    const r = await finishNumberDrillAction(finalScore).catch(() => null);
    if (r) setXp(r.xp);
  }, []);

  // Blitz-Timer
  useEffect(() => {
    if (type !== "blitz" || !items || done) return;
    if (timeLeft <= 0) {
      void finish(score, answered);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [type, items, done, timeLeft, finish, score, answered]);

  const item = items?.[i];
  useEffect(() => {
    setPicked(null);
    setInput("");
    setUnit(item?.units?.[0] ?? "");
  }, [item]);

  async function submit(payload: Parameters<typeof answerNumberAction>[0]) {
    if (busy || !item) return;
    setBusy(true);
    const res = await answerNumberAction(payload).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Antwort konnte nicht gespeichert werden.");
      return;
    }
    const ok = res.data.correct;
    haptic(ok ? 10 : 30);
    playSound(ok ? "correct" : "wrong");
    setAnswered((a) => a + 1);
    if (ok) setScore((s) => s + 1);
    setCombo((c) => (ok ? c + 1 : 0));
    if (type === "blitz") {
      // Blitz: kurzes Aufblitzen, dann sofort weiter
      setResult(res.data);
      window.setTimeout(() => {
        setResult(null);
        if (items && i + 1 >= items.length) void finish(score + (ok ? 1 : 0), answered + 1);
        else setI((n) => n + 1);
      }, 450);
    } else setResult(res.data);
  }

  function next() {
    if (!items) return;
    setResult(null);
    if (i + 1 >= items.length) void finish(score, answered);
    else setI((n) => n + 1);
  }

  if (error && !items)
    return (
      <div className="mx-auto max-w-md space-y-3 py-10 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => void load()}>
          <RotateCcw /> Erneut versuchen
        </Button>
      </div>
    );

  if (!items)
    return (
      <div className="mx-auto max-w-xl space-y-3 py-6" aria-label="Wird geladen">
        <div className="skeleton h-6 w-1/3" />
        <div className="skeleton h-40 w-full rounded-3xl" />
        <div className="skeleton h-12 w-full" />
      </div>
    );

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md py-10 text-center text-muted-foreground">
        Noch keine Zahlen-Fakten vorhanden. <Link href="/zahlen" className="text-link underline">Zurück</Link>
      </div>
    );

  if (done) {
    const total = type === "blitz" ? answered : items.length;
    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center" data-testid="number-result">
        <p className="text-xs font-bold tracking-widest text-link uppercase">{titles[type]} beendet</p>
        <h1 className="text-center text-3xl font-bold text-navy">{total && score / total >= 0.8 ? "Zahlen-Profi! 🎯" : "Gut geübt!"}</h1>
        <p className="font-display text-6xl font-bold text-navy">
          <AnimatedNumber value={score} />
          <span className="text-muted-foreground">/{total}</span>
        </p>
        {xp > 0 && <p className="text-sm font-bold text-link">+{xp} XP</p>}
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => void load()}>
            <RotateCcw /> Nochmal
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/zahlen">Zur Übersicht</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cur = item!;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/zahlen" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-navy">
          ← Zahlen-Trainer
        </Link>
        {type === "blitz" ? (
          <BlitzTimer left={timeLeft} />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground tabular">
            {i + 1} / {items.length}
          </span>
        )}
      </div>
      {type === "blitz" && (
        <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-2 text-sm font-semibold">
          <span>
            Punkte: <strong className="text-navy tabular">{score}</strong>
          </span>
          <AnimatePresence mode="popLayout">
            {combo >= 2 && (
              <motion.span key={combo} className="font-display font-bold text-link" initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                🔥 {combo}er-Combo
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={cur.id + i}
          className={cn("glass relative rounded-3xl p-5 transition-shadow", result && (result.correct ? "shadow-[0_0_0_3px_var(--success)]" : "shadow-[0_0_0_3px_var(--destructive)]"))}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={spring}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-bold text-secondary-foreground">{cur.category}</span>
            <Unverified show={!cur.verified} />
          </div>
          {type === "blitz" ? (
            <>
              <p className="text-lg leading-relaxed font-semibold text-navy">{cur.claim}</p>
              <p className="mt-1 text-sm text-muted-foreground">Stimmt das?</p>
            </>
          ) : (
            <p className="text-lg leading-relaxed font-semibold text-navy">
              {fillStatement(cur.statement, "___")}
            </p>
          )}

          {result && type !== "blitz" && (
            <motion.div className="mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-live="polite">
              <p className={cn("mb-2 flex items-center gap-1.5 text-sm font-bold", result.correct ? "text-success" : "text-destructive")}>
                {result.correct ? <Check className="size-4" /> : <X className="size-4" />} {result.correct ? "Richtig!" : "Leider falsch – richtig ist:"}
              </p>
              <FlipValue value={result.display} tone={result.correct ? "correct" : "default"} className="text-2xl" />
              {result.legalReference && <p className="mt-2 text-xs text-muted-foreground">Rechtsgrundlage: {result.legalReference}</p>}
            </motion.div>
          )}
          {result && type === "blitz" && (
            <motion.span className={cn("absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-white", result.correct ? "bg-success" : "bg-destructive")} initial={{ scale: 0 }} animate={{ scale: 1 }} aria-live="polite">
              {result.correct ? <Check /> : <X />}
              <span className="sr-only">{result.correct ? "Richtig" : "Falsch"}</span>
            </motion.span>
          )}
        </motion.div>
      </AnimatePresence>

      {type === "auswahl" && !result && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Werte">
          {cur.choices!.map((c, k) => (
            <motion.button
              key={c}
              type="button"
              role="radio"
              aria-checked={picked === c}
              disabled={busy}
              onClick={() => {
                setPicked(c);
                void submit({ type: "auswahl", factId: cur.id, answer: c });
              }}
              initial={{ opacity: 0, rotateX: -60 }}
              animate={{ opacity: 1, rotateX: 0 }}
              transition={{ ...spring, delay: k * 0.06 }}
              whileTap={{ scale: 0.96 }}
              className="glass min-h-14 rounded-2xl px-3 font-display text-lg font-bold text-navy"
            >
              {busy && picked === c ? <Loader2 className="mx-auto animate-spin" /> : c}
            </motion.button>
          ))}
        </div>
      )}

      {type === "eingabe" && !result && (
        <form
          className="glass flex flex-wrap items-end gap-2 rounded-2xl p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) void submit({ type: "eingabe", factId: cur.id, answer: input, unit });
          }}
        >
          <label className="min-w-28 flex-1">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Zahl</span>
            <input value={input} onChange={(e) => setInput(e.target.value)} inputMode="decimal" autoFocus aria-label="Zahl" className="h-12 w-full rounded-xl border border-input bg-muted px-3 font-display text-xl font-bold outline-none focus:border-primary" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Einheit</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Einheit" className="h-12 rounded-xl border border-input bg-muted px-3 text-base">
              {cur.units!.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="lg" disabled={!input.trim() || busy} className="h-12">
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Prüfen
          </Button>
        </form>
      )}

      {type === "blitz" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: true, label: "Stimmt ✓", cls: "bg-success text-white" },
            { v: false, label: "Stimmt nicht ✗", cls: "bg-destructive text-white" },
          ].map((b) => (
            <motion.button key={String(b.v)} type="button" whileTap={{ scale: 0.95 }} disabled={busy || Boolean(result)} onClick={() => void submit({ type: "blitz", factId: cur.id, shown: cur.shown!, saysTrue: b.v })} className={cn("min-h-16 rounded-2xl font-display text-lg font-bold disabled:opacity-70", b.cls)}>
              {b.label}
            </motion.button>
          ))}
        </div>
      )}

      {result && type !== "blitz" && (
        <Button size="lg" className="w-full" onClick={next}>
          {i + 1 >= items.length ? "Ergebnis anzeigen" : "Weiter"} <ArrowRight />
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function BlitzTimer({ left }: { left: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const frac = left / BLITZ_SECONDS;
  return (
    <div className="relative size-12" role="timer" aria-label={`Noch ${left} Sekunden`}>
      <svg viewBox="0 0 44 44" className="size-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" />
        <motion.circle cx="22" cy="22" r={r} fill="none" stroke={left <= 10 ? "var(--destructive)" : "var(--primary)"} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - frac) }} transition={{ duration: 0.9, ease: "linear" }} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center font-display text-sm font-bold tabular", left <= 10 ? "text-destructive" : "text-navy")}>{left}</span>
    </div>
  );
}
