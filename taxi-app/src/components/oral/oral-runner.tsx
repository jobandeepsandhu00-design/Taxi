"use client";

import { Keyboard, Loader2, Mic, Volume2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CoachAvatar, type CoachMood } from "@/components/coach/coach-avatar";
import { FocusDialog, FocusSegments, FocusTimer, type SegState } from "@/components/focus/focus-parts";
import { useFullscreenOnFirstTap } from "@/components/focus/focus-runner";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { spring } from "@/lib/motion";
import { ORAL_EXAM_SECONDS, ORAL_MAX_SECONDS, type OralMode } from "@/lib/oral";
import { playSound } from "@/lib/sound";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { finishOralSessionAction, leaveOralSessionAction } from "@/server/actions/oral";
import { MicButton } from "./mic-button";
import { OralFeedback, type OralResult } from "./oral-feedback";
import { useRecorder } from "./use-recorder";

export type RunnerQuestion = { id: string; questionDe: string; category: string; verified: boolean };

type Phase = "ask" | "processing" | "followup" | "feedback" | "limit";
type Pending = { question: string; transcript: string; audioPath: string | null; durationMs: number };

const MIC_OK_KEY = "tp-mic-ok";

function micAcknowledged() {
  try {
    return localStorage.getItem(MIC_OK_KEY) === "1";
  } catch {
    return false;
  }
}

export function OralRunner({ sessionId, mode, timer, questions, answered }: { sessionId: string; mode: OralMode; timer: boolean; questions: RunnerQuestion[]; answered: Record<string, SegState> }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const exam = mode === "pruefung";
  useFullscreenOnFirstTap();

  const firstOpen = Math.max(0, questions.findIndex((q) => !answered[q.id]));
  const [index, setIndex] = useState(firstOpen);
  const [states, setStates] = useState<Record<string, SegState>>(answered);
  const [phase, setPhase] = useState<Phase>("ask");
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [micPrompt, setMicPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OralResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const leaving = useRef(false);
  const q = questions[index];
  const total = questions.length;
  const maxSeconds = exam && timer ? ORAL_EXAM_SECONDS : ORAL_MAX_SECONDS;

  // ── Antwort auswerten ────────────────────────────────────────────────
  const grade = useCallback(
    async (text: string, audioPath: string | null, durationMs: number | null, dontKnow = false) => {
      setPhase("processing");
      setError(null);
      const body = pending
        ? { sessionId, questionId: q.id, transcript: pending.transcript, followUpQuestion: pending.question, followUpTranscript: text, audioPath: pending.audioPath ?? audioPath, durationMs: (pending.durationMs ?? 0) + (durationMs ?? 0) }
        : { sessionId, questionId: q.id, transcript: text, audioPath, durationMs, dontKnow, allowFollowUp: exam };
      try {
        const res = await fetch("/api/oral/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const json = await res.json();
        if (res.status === 402) return setPhase("limit");
        if (!res.ok) {
          setError(json.error ?? "Die Bewertung hat nicht geklappt.");
          setPhase(pending ? "followup" : "ask");
          return;
        }
        if (json.followUp) {
          setPending({ question: json.followUp, transcript: text, audioPath, durationMs: durationMs ?? 0 });
          setPhase("followup");
          if (speechSupported()) speak(json.followUp);
          return;
        }
        const r = json as OralResult;
        setPending(null);
        setTranscript(pending ? `${pending.transcript} … ${text}` : text);
        setStates((s) => ({ ...s, [q.id]: exam ? "answered" : r.verdict === "richtig" ? "correct" : r.verdict === "falsch" ? "wrong" : "answered" }));
        if (exam) {
          advance();
          return;
        }
        setResult(r);
        setPhase("feedback");
        playSound(r.verdict === "falsch" ? "wrong" : "correct");
        if (r.verdict === "richtig" && !reduce) void fireConfetti({ particleCount: 70, spread: 70, origin: { y: 0.3 } });
      } catch {
        setError("Keine Verbindung – bitte nochmal versuchen.");
        setPhase(pending ? "followup" : "ask");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, q?.id, sessionId, exam, reduce],
  );

  const onAudio = useCallback(
    async (blob: Blob, durationMs: number) => {
      if (durationMs < 700) {
        setError("Das war sehr kurz – tippe auf den Knopf, sprich deine Antwort und tippe dann zum Beenden.");
        return;
      }
      setPhase("processing");
      setError(null);
      const form = new FormData();
      form.append("audio", new File([blob], blob.type.includes("mp4") ? "antwort.m4a" : "antwort.webm", { type: blob.type || "audio/webm" }));
      form.append("sessionId", sessionId);
      form.append("questionId", q.id);
      try {
        const res = await fetch("/api/oral/transcribe", { method: "POST", body: form });
        const json = await res.json();
        if (res.status === 402) return setPhase("limit");
        if (!res.ok) {
          setError(json.error ?? "Die Spracherkennung hat nicht geklappt.");
          if (json.fallback) setTyping(true);
          setPhase(pending ? "followup" : "ask");
          return;
        }
        await grade(json.transcript, json.audioPath ?? null, durationMs);
      } catch {
        setError("Keine Verbindung – bitte nochmal versuchen.");
        setPhase(pending ? "followup" : "ask");
      }
    },
    [grade, pending, q?.id, sessionId],
  );

  const rec = useRecorder({ maxSeconds, onDone: onAudio });
  const recording = rec.state === "recording";

  useEffect(() => {
    if (rec.state === "denied") {
      setError("Kein Zugriff aufs Mikrofon. Du kannst es in den Browser-Einstellungen erlauben – oder deine Antwort tippen.");
      setTyping(true);
    }
    if (rec.state === "unsupported") setTyping(true);
  }, [rec.state]);

  // ── Prüfungsmodus: Frage automatisch vorlesen ────────────────────────
  useEffect(() => {
    if (!exam || !q || phase !== "ask" || !speechSupported()) return;
    const t = window.setTimeout(() => speak(q.questionDe), 450);
    return () => {
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, index]);

  useEffect(() => () => stopSpeaking(), []);

  // ── Zurück-Taste abfangen ────────────────────────────────────────────
  useEffect(() => {
    history.pushState({ focusGuard: true }, "");
    const onPop = () => {
      if (leaving.current) return;
      history.pushState({ focusGuard: true }, "");
      setExitOpen(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function finish() {
    setFinishing(true);
    stopSpeaking();
    await finishOralSessionAction(sessionId);
    leaving.current = true;
    router.refresh();
  }

  function advance() {
    setResult(null);
    setPending(null);
    setTyped("");
    setTranscript("");
    setError(null);
    setPhase("ask");
    stopSpeaking();
    if (index + 1 >= total) {
      void finish();
      return;
    }
    setIndex((i) => i + 1);
  }

  async function toggleMic() {
    stopSpeaking();
    if (recording) return rec.stop();
    if (!micAcknowledged()) return setMicPrompt(true);
    await rec.start({ live: !exam });
  }

  async function allowMic() {
    setMicPrompt(false);
    const ok = await rec.start({ live: !exam });
    if (ok) {
      try {
        localStorage.setItem(MIC_OK_KEY, "1");
      } catch {
        /* egal */
      }
    }
  }

  function skip() {
    rec.cancel();
    advance();
  }

  function retry() {
    setResult(null);
    setTranscript("");
    setPhase("ask");
  }

  async function leave() {
    leaving.current = true;
    rec.cancel();
    stopSpeaking();
    await leaveOralSessionAction(sessionId);
  }

  const segStates = questions.map((x) => states[x.id] ?? "open");
  const mood: CoachMood = phase === "processing" ? "thinking" : phase === "followup" ? "idle" : "idle";
  const busy = phase === "processing" || finishing;
  const isLast = index + 1 >= total;

  if (!q) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} data-testid="oral-mode">
      {/* Kopfleiste */}
      <motion.header className="shrink-0" initial={reduce ? false : { y: -56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}>
        <div className="flex h-14 items-center gap-2 px-2">
          <button type="button" onClick={() => setExitOpen(true)} className="flex size-12 items-center justify-center rounded-xl text-foreground/80 hover:bg-accent" aria-label={exam ? "Prüfung beenden" : "Sitzung verlassen"}>
            <X className="size-6" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{exam ? "Mündliche Prüfung" : "Mündlich üben"}</h1>
            <p className="font-display text-[15px] font-bold text-navy tabular-nums" aria-live="polite">
              Mündlich · Frage {index + 1}/{total}
            </p>
          </div>
          <div className="flex w-12 justify-end pr-1">{exam && timer && recording && <FocusTimer remaining={Math.max(0, Math.ceil(ORAL_EXAM_SECONDS - rec.elapsed / 1000))} />}</div>
        </div>
        <div className="px-4 pb-2">
          <FocusSegments states={segStates} flags={segStates.map(() => false)} current={index} onJump={() => undefined} />
        </div>
      </motion.header>

      {/* Inhalt */}
      <main className="relative min-h-0 flex-1 overflow-y-auto px-4">
        <AnimatePresence mode="wait">
          {phase === "feedback" && result ? (
            <motion.div key={`fb-${q.id}`} className="pt-4" initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
              <p className="mb-4 text-center text-sm font-semibold text-muted-foreground">{q.questionDe}</p>
              <OralFeedback result={result} transcript={transcript} onRetry={retry} onNext={advance} nextLabel={isLast ? "Ergebnis" : "Weiter"} />
            </motion.div>
          ) : phase === "limit" ? (
            <motion.div key="limit" className="mx-auto flex h-full max-w-sm flex-col items-center justify-center gap-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CoachAvatar mood="sad" size={88} />
              <h2 className="font-display text-xl font-bold text-navy">Für heute geschafft!</h2>
              <p className="text-sm text-muted-foreground">Deine kostenlosen mündlichen Fragen für heute sind verbraucht. Morgen geht&apos;s weiter – mit Premium übst du unbegrenzt.</p>
              <Button onClick={() => void finish()} disabled={finishing}>
                Zum Ergebnis
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={`q-${q.id}-${phase === "followup" ? "f" : "a"}`}
              className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 py-6 text-center"
              initial={reduce ? false : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 }}
              transition={spring}
            >
              {(exam || phase === "processing") && <CoachAvatar mood={mood} size={exam ? 72 : 56} />}
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">{q.category}</span>
                {!q.verified && <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-warning">Ungeprüft</span>}
              </div>
              {phase === "followup" && pending ? (
                <>
                  <p className="text-sm font-semibold text-muted-foreground">Nachfrage von Toni</p>
                  <h2 className="font-display text-[22px] leading-snug font-semibold text-navy sm:text-2xl" data-testid="oral-followup">
                    {pending.question}
                  </h2>
                </>
              ) : (
                <h2 className="font-display text-[22px] leading-snug font-semibold text-navy sm:text-2xl" data-testid="oral-question">
                  {q.questionDe}
                </h2>
              )}
              {speechSupported() && phase !== "processing" && (
                <Button variant="ghost" size="sm" onClick={() => speak(phase === "followup" && pending ? pending.question : q.questionDe)}>
                  <Volume2 /> Vorlesen
                </Button>
              )}
              {phase === "processing" && (
                <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground" role="status">
                  <Loader2 className="size-4 animate-spin" /> {exam ? "Toni hört sich deine Antwort an …" : "Wird ausgewertet …"}
                </p>
              )}
              {!exam && recording && rec.liveText && (
                <p className="max-w-md text-sm text-muted-foreground italic" aria-live="polite">
                  „{rec.liveText}“ <span className="block text-[10px] not-italic">Live-Vorschau – bewertet wird die Aufnahme</span>
                </p>
              )}
              {error && (
                <p className="max-w-md rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Steuerung */}
      {(phase === "ask" || phase === "followup" || phase === "processing") && (
        <motion.footer className="shrink-0 px-4 pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }} initial={reduce ? false : { y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}>
          {typing ? (
            <form
              className="mx-auto max-w-xl space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim().length > 1) void grade(typed.trim(), null, null);
              }}
            >
              <label htmlFor="oral-typed" className="sr-only">
                Deine Antwort
              </label>
              <textarea id="oral-typed" value={typed} onChange={(e) => setTyped(e.target.value)} rows={4} maxLength={2000} placeholder="Deine Antwort …" className="w-full rounded-2xl border border-input bg-card p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/40" disabled={busy} />
              <div className="flex gap-2">
                {rec.state !== "unsupported" && (
                  <Button type="button" variant="outline" onClick={() => setTyping(false)} disabled={busy}>
                    <Mic /> Sprechen
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={busy || typed.trim().length < 2}>
                  {busy ? <Loader2 className="animate-spin" /> : null} Antwort abgeben
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center">
              <MicButton recording={recording} busy={busy || rec.state === "requesting"} levels={rec.levels} elapsed={rec.elapsed} countdownSeconds={exam && timer ? ORAL_EXAM_SECONDS : undefined} onToggle={() => void toggleMic()} />
              <button type="button" className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline" onClick={() => setTyping(true)} disabled={busy || recording}>
                <Keyboard className="size-3.5" /> Antwort tippen
              </button>
            </div>
          )}
          {phase !== "followup" && (
            <div className="mx-auto mt-3 flex max-w-xl justify-between">
              <Button variant="ghost" size="sm" onClick={skip} disabled={busy}>
                Überspringen
              </Button>
              <Button variant="ghost" size="sm" onClick={() => (rec.cancel(), void grade("", null, null, true))} disabled={busy}>
                Weiß ich nicht
              </Button>
            </div>
          )}
        </motion.footer>
      )}

      {/* Mikrofon-Hinweis vor der ersten Aufnahme */}
      <FocusDialog
        open={micPrompt}
        title="Mikrofon erlauben"
        text="Damit Toni deine Antwort hören kann, braucht TaxiFit dein Mikrofon. Aufgenommen wird nur, während der gelbe Knopf aktiv ist."
        onClose={() => setMicPrompt(false)}
        actions={[
          { label: "Mikrofon erlauben", onClick: () => void allowMic() },
          { label: "Lieber tippen", variant: "outline", onClick: () => (setMicPrompt(false), setTyping(true)) },
        ]}
      />

      <FocusDialog
        open={exitOpen}
        title={exam ? "Prüfung wirklich beenden?" : "Sitzung verlassen?"}
        text={exam ? "Bisherige Antworten werden gewertet, offene Fragen zählen als nicht beantwortet." : "Deine bisherigen Antworten bleiben gespeichert."}
        onClose={() => setExitOpen(false)}
        actions={[
          { label: exam ? "Beenden" : "Verlassen", variant: "destructive", onClick: () => void leave() },
          { label: "Abbrechen", variant: "outline", onClick: () => setExitOpen(false) },
        ]}
      />

      {finishing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80" role="status">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="sr-only">Ergebnis wird berechnet</span>
        </div>
      )}
      <Link href="/muendlich" className="sr-only">
        Zur Übersicht
      </Link>
    </div>
  );
}
