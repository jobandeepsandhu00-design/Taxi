"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Eye, Headphones, Lightbulb, Mic, Pause, Play, Repeat, Scale, SkipBack, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FocusDialog, FocusSegments, type SegState } from "@/components/focus/focus-parts";
import type { DrillSettings } from "@/lib/audio/drill";
import { audioEngine } from "@/lib/audio/player";
import type { AudioMap } from "@/lib/audio/types";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { finishDrillAction, recordDrillAction, startDrillAction } from "@/server/actions/audio-drill";

export type DrillItem = { id: string; question: string; answer: string; explanation: string | null; mnemonic: string | null; legal: string | null; chapter: string };
type Result = "known" | "unknown";
type Phase = "question" | "countdown" | "timeout" | "answer";

const RATES = [0.8, 1, 1.15, 1.3];

export function DrillPlayer({
  sessionId,
  title,
  items,
  audio,
  settings,
  startIndex,
  initialResults,
  nextChapterId,
}: {
  sessionId: string;
  title: string;
  items: DrillItem[];
  audio: AudioMap;
  settings: DrillSettings;
  startIndex: number;
  initialResults: Record<string, Result>;
  nextChapterId: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const engine = audioEngine();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(startIndex);
  const [phase, setPhase] = useState<Phase>("question");
  const [revealed, setRevealed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [remaining, setRemaining] = useState(settings.answerSec * 1000);
  const [results, setResults] = useState<Record<string, Result>>(initialResults);
  const [rate, setRate] = useState(settings.rate);
  const [fallback, setFallback] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [recordings, setRecordings] = useState<Record<string, string>>({});
  const token = useRef(0);
  const pausedRef = useRef(false);
  const revealedRef = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const item = items[index];
  const total = items.length;
  const totalMs = settings.answerSec * 1000;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);
  useEffect(() => {
    engine.setRate(rate);
  }, [rate, engine]);

  // Autostart, wenn die Audiowiedergabe schon entsperrt ist (Tap auf „Start“)
  useEffect(() => {
    if (engine.unlocked) setStarted(true);
  }, [engine]);

  // Unterbrechungen (Anruf, Kopfhörer abgesteckt) → Pause + Fortsetzen-Hinweis
  useEffect(
    () =>
      engine.on((e) => {
        if (e.type === "interrupted") {
          setPaused(true);
          setInterrupted(true);
        }
      }),
    [engine],
  );

  // Bildschirm wach halten
  useEffect(() => {
    if (!started || done) return;
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null;
      } catch {
        /* nicht unterstützt */
      }
    };
    void req();
    const vis = () => document.visibilityState === "visible" && void req();
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      void lock?.release().catch(() => undefined);
    };
  }, [started, done]);

  useEffect(() => () => engine.stop(), [engine]);

  const stopRecording = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    recorder.current = null;
  }, []);

  const startRecording = useCallback(async (qid: string) => {
    if (!settings.record || typeof MediaRecorder === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length) setRecordings((r) => ({ ...r, [qid]: URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })) }));
      };
      rec.start();
      recorder.current = rec;
    } catch {
      /* kein Mikrofon – ohne Aufnahme weiter */
    }
  }, [settings.record]);

  const playAnswer = useCallback(async () => {
    const a = audio[item.id]?.answer;
    if (!a) setFallback(true);
    const text = item.explanation ? `Richtig ist: ${item.answer}. Weil: ${item.explanation}` : item.answer;
    return engine.playOrSpeak(a, text);
  }, [audio, item, engine]);

  const goTo = useCallback(
    (i: number) => {
      token.current++;
      engine.stop();
      stopRecording();
      if (i >= total) {
        setDone(true);
        void finishDrillAction(sessionId);
        return;
      }
      setIndex(Math.max(0, i));
    },
    [engine, stopRecording, total, sessionId],
  );

  /** Ablauf einer Frage: vorlesen → Countdown → Gong → Verhalten nach Ablauf */
  const run = useCallback(
    async (i: number) => {
      const my = ++token.current;
      const it = items[i];
      const set = audio[it.id];
      const alive = () => token.current === my;
      setPhase("question");
      setRevealed(false);
      setRemaining(totalMs);
      setAnnounce("");
      // die nächsten 2 Fragen vorladen
      void engine.preload([set?.question, set?.answer, ...items.slice(i + 1, i + 3).flatMap((n) => [audio[n.id]?.question, audio[n.id]?.answer])]);
      if (set?.question) void engine.cacheForOffline(set.question);
      engine.mediaSession(
        { title: `Frage ${i + 1}/${total}`, artist: it.chapter, album: "TaxiFit · Mündlich" },
        { play: () => (setPaused(false), engine.resume()), pause: () => (setPaused(true), engine.pause()), nexttrack: () => goTo(i + 1), previoustrack: () => goTo(i - 1) },
      );
      if (!set?.question) setFallback(true);
      await engine.playOrSpeak(set?.question, it.question);
      if (!alive()) return;
      if (settings.repeatQuestion) {
        await engine.silence(700);
        if (!alive()) return;
        await engine.playOrSpeak(set?.question, it.question);
        if (!alive()) return;
      }
      setPhase("countdown");
      void startRecording(it.id);
      let lastSec = Math.ceil(totalMs / 1000);
      const r = await engine.silence(
        totalMs,
        (ms) => {
          setRemaining(ms);
          const sec = Math.ceil(ms / 1000);
          if (sec !== lastSec) {
            lastSec = sec;
            if (sec <= 3 && sec > 0) engine.beep("tick");
            if (sec === 10 || sec === 5) setAnnounce(`Noch ${sec} Sekunden`);
          }
        },
        () => pausedRef.current || (revealedRef.current && settings.pauseOnReveal),
      );
      if (!alive() || r !== "ended") return;
      stopRecording();
      engine.beep("chime");
      haptic();
      if (settings.answerCard === "autoReveal" || settings.afterTimeout === "readAnswer") setRevealed(true);
      if (settings.afterTimeout === "stop") {
        setPhase("timeout");
        return;
      }
      if (settings.afterTimeout === "readAnswer") {
        setPhase("answer");
        const a = set?.answer;
        await engine.playOrSpeak(a, it.explanation ? `Richtig ist: ${it.answer}. Weil: ${it.explanation}` : it.answer);
        if (!alive()) return;
        await engine.silence(1500, undefined, () => pausedRef.current);
        if (!alive()) return;
      } else {
        await engine.silence(600);
        if (!alive()) return;
      }
      void recordDrillAction({ sessionId, questionId: it.id, known: null, position: i + 1 }).catch(() => undefined);
      goTo(i + 1);
    },
    [items, audio, engine, settings, total, totalMs, goTo, sessionId, startRecording, stopRecording],
  );

  useEffect(() => {
    if (started && !done) void run(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index, done]);

  const reveal = useCallback(async () => {
    haptic();
    token.current++; // Ablauf übernimmt jetzt die Nutzerin / der Nutzer
    stopRecording();
    setRevealed(true);
    setPhase("answer");
    await playAnswer();
  }, [stopRecording, playAnswer]);

  const rateAnswer = useCallback(
    (known: boolean) => {
      haptic();
      const r: Result = known ? "known" : "unknown";
      setResults((x) => ({ ...x, [item.id]: r }));
      void recordDrillAction({ sessionId, questionId: item.id, known, position: index + 1 }).catch(() => undefined);
      window.setTimeout(() => goTo(index + 1), reduce ? 150 : 650);
    },
    [item, index, sessionId, goTo, reduce],
  );

  const togglePause = () => {
    haptic();
    setInterrupted(false);
    if (paused) {
      setPaused(false);
      engine.resume();
    } else {
      setPaused(true);
      engine.pause();
    }
  };

  const states: SegState[] = useMemo(() => items.map((q) => (results[q.id] === "known" ? "correct" : results[q.id] === "unknown" ? "wrong" : "open")), [items, results]);

  if (done) return <DrillEnd title={title} items={items} audio={audio} results={results} recordings={recordings} nextChapterId={nextChapterId} onExit={() => router.push("/muendlich/auto")} />;

  const secLeft = Math.ceil(remaining / 1000);
  const ringColor = secLeft <= 3 ? "var(--destructive)" : secLeft <= 5 ? "#f97316" : "var(--primary)";

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }} data-testid="drill">
      <header className="space-y-2 px-4 pt-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setExitOpen(true)} className="rounded-full p-2 hover:bg-accent" aria-label="Beenden" data-testid="drill-exit">
            <X className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-navy">{item.chapter}</p>
            <p className="text-xs text-muted-foreground" data-testid="drill-counter">
              Frage {index + 1} / {total}
            </p>
          </div>
          {fallback && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning" title="Für diese Frage gibt es noch keine Studio-Aufnahme" data-testid="drill-fallback">
              Ersatzstimme
            </span>
          )}
          <button type="button" onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1)} className="rounded-full border border-border px-2.5 py-1 text-xs font-bold" aria-label={`Tempo ${rate}x ändern`} data-testid="drill-speed">
            {rate.toString().replace(".", ",")}×
          </button>
        </div>
        <FocusSegments states={states} flags={items.map(() => false)} current={index} onJump={(i) => goTo(i)} />
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 pt-4 pb-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={item.id} className="flex w-full max-w-xl flex-col items-center gap-5" initial={reduce ? { opacity: 0 } : { opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: -60 }} transition={reduce ? { duration: 0.15 } : spring}>
            {phase === "countdown" ? <CountdownRing remaining={remaining} total={totalMs} color={ringColor} pulse={secLeft <= 3 && !reduce} paused={paused || (revealed && settings.pauseOnReveal)} /> : <Waveform active={!paused && (phase === "question" || phase === "answer")} />}
            <p className="sr-only" aria-live="assertive">
              {announce}
            </p>
            {phase === "countdown" && <p className="text-sm font-bold text-navy">{paused ? "Pausiert" : "Antworte jetzt laut …"}</p>}
            {settings.showText ? (
              <h1 className="text-center text-2xl leading-snug font-extrabold text-navy sm:text-3xl" data-testid="drill-question">
                {item.question}
              </h1>
            ) : (
              <p className="flex items-center gap-2 text-center text-lg font-bold text-muted-foreground" data-testid="drill-question-hidden">
                <Headphones className="size-5" /> Hör genau zu
              </p>
            )}
            <AnswerCard item={item} revealed={revealed} onReveal={() => void reveal()} recording={recordings[item.id]} />
            {(revealed || phase === "timeout") && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="grid w-full grid-cols-2 gap-3">
                <RateButton known={false} active={results[item.id] === "unknown"} onClick={() => rateAnswer(false)} />
                <RateButton known active={results[item.id] === "known"} onClick={() => rateAnswer(true)} />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
        <CtrlButton label="Vorherige Frage" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <SkipBack className="size-5" />
        </CtrlButton>
        <CtrlButton label="Frage wiederholen" onClick={() => void run(index)}>
          <Repeat className="size-5" />
        </CtrlButton>
        <button type="button" onClick={togglePause} className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95" aria-label={paused ? "Fortsetzen" : "Pause"} data-testid="drill-pause">
          {paused ? <Play className="size-7 translate-x-0.5" /> : <Pause className="size-7" />}
        </button>
        <CtrlButton label="Antwort anzeigen" onClick={() => void reveal()} disabled={revealed}>
          <Eye className="size-5" />
        </CtrlButton>
        <CtrlButton label="Nächste Frage" onClick={() => goTo(index + 1)} testid="drill-next">
          <SkipForward className="size-5" />
        </CtrlButton>
      </footer>

      {!started && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <button
            type="button"
            onClick={async () => {
              await engine.unlock();
              setStarted(true);
            }}
            className="flex flex-col items-center gap-3"
            data-testid="drill-tap-start"
          >
            <span className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
              <Play className="size-9 translate-x-1" />
            </span>
            <span className="font-bold text-navy">Tippen zum Starten</span>
          </button>
        </div>
      )}
      {interrupted && (
        <div className="absolute inset-x-4 bottom-28 z-30 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-xl" role="status">
          <span className="flex-1 text-sm font-semibold">Unterbrochen – weitermachen?</span>
          <button type="button" onClick={togglePause} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Fortsetzen
          </button>
        </div>
      )}
      <FocusDialog
        open={exitOpen}
        title="Abfrage beenden?"
        text="Dein Fortschritt ist gespeichert – du kannst später weitermachen."
        onClose={() => setExitOpen(false)}
        actions={[
          { label: "Weitermachen", onClick: () => setExitOpen(false) },
          { label: "Beenden", variant: "outline", onClick: () => (engine.stop(), router.push("/muendlich/auto")) },
        ]}
      />
    </div>
  );
}

function CtrlButton({ label, onClick, disabled, children, testid }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; testid?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} data-testid={testid} className="flex size-12 items-center justify-center rounded-full text-foreground/80 hover:bg-accent disabled:opacity-30">
      {children}
    </button>
  );
}

/** Wellenform aus dem echten Audiopegel (AnalyserNode); bei Ersatzstimme sanft animiert. */
function Waveform({ active }: { active: boolean }) {
  const engine = audioEngine();
  const [levels, setLevels] = useState<number[]>(() => Array(24).fill(0.08));
  useEffect(() => {
    if (!active) {
      setLevels(Array(24).fill(0.08));
      return;
    }
    let raf = 0;
    let t = 0;
    const loop = () => {
      const l = engine.levels(24);
      t += 0.12;
      setLevels(l.length && l.some((x) => x > 0.02) ? l.map((x) => Math.max(0.08, x)) : Array.from({ length: 24 }, (_, i) => 0.25 + 0.2 * Math.sin(t + i * 0.6)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, engine]);
  return (
    <div className="flex h-24 items-center gap-1" aria-hidden data-testid="drill-wave">
      {levels.map((l, i) => (
        <span key={i} className="w-1.5 rounded-full bg-primary transition-[height] duration-75" style={{ height: `${Math.round(8 + l * 80)}px`, opacity: active ? 1 : 0.35 }} />
      ))}
    </div>
  );
}

/** Countdown-Ring: läuft ab (pathLength), gelb → orange (letzte 5 s) → rot + Puls (letzte 3 s). */
function CountdownRing({ remaining, total, color, pulse, paused }: { remaining: number; total: number; color: string; pulse: boolean; paused: boolean }) {
  const size = 132;
  const r = 56;
  const frac = Math.max(0, Math.min(1, remaining / total));
  return (
    <motion.div className="relative" style={{ width: size, height: size }} animate={pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={pulse ? { duration: 1, repeat: Infinity } : undefined} role="timer" aria-label={`Noch ${Math.ceil(remaining / 1000)} Sekunden`} data-testid="drill-countdown">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-foreground/10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - frac)} style={{ transition: "stroke 0.3s" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold tabular-nums text-navy">{paused ? "II" : Math.ceil(remaining / 1000)}</span>
    </motion.div>
  );
}

/** Verdeckte Antwortkarte: unscharf → Tippen deckt auf (Blur → 0, Pop, grüner Wisch). */
function AnswerCard({ item, revealed, onReveal, recording }: { item: DrillItem; revealed: boolean; onReveal: () => void; recording?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative w-full" data-testid="drill-answer-card">
      <motion.div
        className={cn("relative overflow-hidden rounded-2xl border p-4", revealed ? "border-success/40 bg-success/10" : "border-border bg-foreground/5")}
        animate={reduce ? { opacity: 1 } : revealed ? { filter: "blur(0px)", scale: [0.97, 1.02, 1] } : { filter: "blur(12px)", scale: 1 }}
        transition={{ duration: 0.45 }}
        aria-hidden={!revealed}
      >
        {revealed && !reduce && <motion.span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-success/25 to-transparent" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 0.7, ease: "easeOut" }} />}
        <p className="mb-1 text-[11px] font-bold tracking-wider text-success uppercase">Richtige Antwort</p>
        <p className="text-[15px] leading-relaxed whitespace-pre-line" data-testid="drill-answer">
          {revealed ? item.answer : item.answer.replace(/\S/g, "•").slice(0, 160)}
        </p>
        {revealed && item.explanation && <p className="mt-2 text-sm whitespace-pre-line text-foreground/80">{item.explanation}</p>}
        {revealed && item.mnemonic && (
          <p className="mt-2 flex gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
            <Lightbulb className="size-4 shrink-0" /> {item.mnemonic}
          </p>
        )}
        {revealed && item.legal && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="size-3.5" /> {item.legal}
          </p>
        )}
        {revealed && recording && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-background/70 p-2 text-sm">
            <Mic className="size-4 text-primary" /> <span className="font-semibold">Deine Antwort</span>
            <audio src={recording} controls className="h-8 flex-1" />
          </div>
        )}
      </motion.div>
      {!revealed && (
        <button type="button" onClick={onReveal} className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl text-sm font-bold text-navy" data-testid="drill-reveal">
          <span className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 shadow">
            <Eye className="size-4" /> Antwort anzeigen
          </span>
        </button>
      )}
    </div>
  );
}

function RateButton({ known, active, onClick }: { known: boolean; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex h-14 items-center justify-center gap-2 rounded-2xl font-bold active:scale-[0.98]", known ? "bg-success text-white" : "border border-destructive/40 bg-destructive/10 text-destructive", active && "ring-4 ring-primary/40")}
      data-testid={known ? "drill-known" : "drill-unknown"}
    >
      {known ? (
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: active ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
        </svg>
      ) : (
        <X className="size-5" />
      )}
      {known ? "Gewusst" : "Nicht gewusst"}
    </button>
  );
}

function DrillEnd({ title, items, audio, results, recordings, nextChapterId, onExit }: { title: string; items: DrillItem[]; audio: AudioMap; results: Record<string, Result>; recordings: Record<string, string>; nextChapterId: string | null; onExit: () => void }) {
  const engine = audioEngine();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const known = items.filter((i) => results[i.id] === "known").length;
  const unknown = items.filter((i) => results[i.id] === "unknown");
  const go = async (input: Parameters<typeof startDrillAction>[0]) => {
    setBusy(true);
    await engine.unlock();
    const r = await startDrillAction(input);
    if (r && !r.ok) setBusy(false);
  };
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background px-5 py-6" style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }} data-testid="drill-end">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="text-center">
          <p className="text-xs font-bold tracking-wider text-link uppercase">{title}</p>
          <motion.h1 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-1 text-3xl font-extrabold text-navy">
            {known} gewusst · {unknown.length} nicht gewusst
          </motion.h1>
          {items.length - known - unknown.length > 0 && <p className="text-sm text-muted-foreground">{items.length - known - unknown.length} ohne Bewertung</p>}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {unknown.length > 0 && (
            <button type="button" disabled={busy} onClick={() => go({ mode: "ids", ids: unknown.map((u) => u.id) })} className="h-12 rounded-xl bg-primary font-bold text-primary-foreground" data-testid="drill-repeat-unknown">
              Nicht gewusste wiederholen
            </button>
          )}
          {nextChapterId && (
            <button type="button" disabled={busy} onClick={() => go({ mode: "chapter", id: nextChapterId })} className="h-12 rounded-xl border border-border font-bold">
              Nächstes Kapitel
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => go({ mode: "ids", ids: items.map((i) => i.id) })} className="h-12 rounded-xl border border-border font-bold">
            Nochmal
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={it.id} className="glass rounded-xl">
              <button type="button" className="flex w-full items-start gap-3 p-3 text-left" onClick={() => setOpen(open === it.id ? null : it.id)} aria-expanded={open === it.id}>
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", results[it.id] === "known" ? "bg-success" : results[it.id] === "unknown" ? "bg-destructive" : "bg-foreground/25")}>
                  {results[it.id] === "known" ? <Check className="size-3.5" /> : results[it.id] === "unknown" ? <X className="size-3.5" /> : i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold">{it.question}</span>
              </button>
              {open === it.id && (
                <div className="space-y-2 px-3 pb-3 text-sm">
                  <p className="rounded-xl bg-success/10 p-3 whitespace-pre-line">{it.answer}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-full border border-border px-3 py-1 text-xs font-bold" onClick={() => void engine.playOrSpeak(audio[it.id]?.answer, it.answer)}>
                      🔊 Antwort anhören
                    </button>
                    {recordings[it.id] && <audio src={recordings[it.id]} controls className="h-8" />}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-center gap-4 text-sm font-bold">
          <button type="button" onClick={onExit} className="text-link">
            Zur Übersicht
          </button>
          <Link href="/lernbuch" className="text-link">
            Zum Lernbuch
          </Link>
        </div>
      </div>
    </div>
  );
}
