"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Loader2, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CoachAvatar, type CoachMood } from "@/components/coach/coach-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { gradeOralAnswerAction, startOralExamAction } from "@/server/actions/coach";

type Verdict = "richtig" | "teilweise" | "falsch";
interface Graded {
  verdict: Verdict;
  feedback: string;
  musterantwort: string;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const verdictStyle: Record<Verdict, { cls: string; label: string; points: number; mood: CoachMood }> = {
  richtig: { cls: "border-success bg-success/12 text-success", label: "Richtig", points: 1, mood: "happy" },
  teilweise: { cls: "border-warning bg-warning/12 text-warning", label: "Teilweise", points: 0.5, mood: "idle" },
  falsch: { cls: "border-destructive bg-destructive/12 text-destructive", label: "Falsch", points: 0, mood: "sad" },
};

export function OralExam({ enabled }: { enabled: boolean }) {
  const [questions, setQuestions] = useState<{ id: string; text: string; category: string }[] | null>(null);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<Graded | null>(null);
  const [results, setResults] = useState<Graded[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setCanListen(Boolean(getRecognition()));
    return () => {
      stopSpeaking();
      recRef.current?.stop();
    };
  }, []);

  const q = questions?.[i];
  const done = questions !== null && i >= questions.length;
  const score = results.reduce((s, r) => s + verdictStyle[r.verdict].points, 0);

  useEffect(() => {
    if (q && speechSupported()) speak(`Frage ${i + 1}. ${q.text}`);
  }, [q, i]);

  useEffect(() => {
    if (done && questions) {
      if (score / questions.length >= 0.7) {
        playSound("levelUp");
        void fireConfetti({ particleCount: 140, spread: 100 });
      }
    }
  }, [done, score, questions]);

  async function start() {
    setStarting(true);
    setError(null);
    const res = await startOralExamAction().catch(() => null);
    setStarting(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Start fehlgeschlagen.");
      return;
    }
    setQuestions(res.data);
    setI(0);
    setResults([]);
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    stopSpeaking();
    rec.lang = "de-AT";
    rec.interimResults = true;
    rec.continuous = false;
    const base = answer ? `${answer} ` : "";
    rec.onresult = (e) => {
      let text = "";
      for (let k = 0; k < e.results.length; k++) text += e.results[k][0].transcript;
      setAnswer(base + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    haptic();
    setListening(true);
    rec.start();
  }

  async function submit() {
    if (!q || !answer.trim() || grading) return;
    recRef.current?.stop();
    setGrading(true);
    setError(null);
    const res = await gradeOralAnswerAction({ questionId: q.id, answer }).catch(() => null);
    setGrading(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Bewertung fehlgeschlagen.");
      return;
    }
    setResult(res.data);
    setResults((r) => [...r, res.data]);
    playSound(res.data.verdict === "richtig" ? "correct" : res.data.verdict === "falsch" ? "wrong" : "streak");
  }

  function next() {
    setResult(null);
    setAnswer("");
    setI((n) => n + 1);
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-10 text-center">
        <div className="flex justify-center">
          <CoachAvatar mood="sad" size={90} />
        </div>
        <h1 className="text-2xl font-bold text-navy">Mündliche Prüfung</h1>
        <p className="text-muted-foreground">Dieser Modus braucht den KI-Coach, der noch nicht eingerichtet ist.</p>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="mx-auto max-w-lg space-y-5 py-6 text-center">
        <div className="flex justify-center">
          <CoachAvatar mood="idle" size={110} />
        </div>
        <h1 className="text-3xl font-bold text-navy">Mündliche Prüfung</h1>
        <p className="text-muted-foreground">Ich spiele den Prüfer und stelle dir 10 Fragen – ohne Antwortmöglichkeiten. Antworte mit deinen eigenen Worten, per Sprache oder Text. Jede Antwort bewerte ich mit „richtig“, „teilweise“ oder „falsch“.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button size="lg" onClick={() => void start()} disabled={starting}>
          {starting ? <Loader2 className="animate-spin" /> : <Mic />} Prüfung beginnen
        </Button>
        <p className="text-xs text-muted-foreground">Jede Bewertung zählt als eine Coach-Nachricht.</p>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <div className="flex justify-center">
          <CoachAvatar mood={pct >= 70 ? "happy" : pct >= 40 ? "idle" : "sad"} size={110} />
        </div>
        <h1 className="text-3xl font-bold text-navy">{pct >= 70 ? "Stark geantwortet!" : "Da geht noch was"}</h1>
        <p className="font-display text-6xl font-bold text-navy">
          <AnimatedNumber value={score} />/{questions.length}
        </p>
        <p className="text-muted-foreground">richtig = 1 Punkt, teilweise = ½ Punkt</p>
        <div className="flex justify-center gap-1.5">
          {results.map((r, k) => (
            <motion.span key={k} className={cn("size-3 rounded-full", r.verdict === "richtig" ? "bg-success" : r.verdict === "teilweise" ? "bg-warning" : "bg-destructive")} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: k * 0.06 }} />
          ))}
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={() => void start()}>Nochmal</Button>
          <Button asChild variant="outline">
            <Link href="/coach">Zum Coach</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        {questions.map((_, k) => (
          <span key={k} className={cn("h-1.5 flex-1 rounded-full", k < results.length ? (results[k].verdict === "richtig" ? "bg-success" : results[k].verdict === "teilweise" ? "bg-warning" : "bg-destructive") : k === i ? "bg-primary" : "bg-foreground/10")} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="flex gap-3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={spring}>
          <CoachAvatar mood={grading ? "thinking" : result ? verdictStyle[result.verdict].mood : "idle"} size={52} className="shrink-0" />
          <div className="glass flex-1 rounded-2xl rounded-tl-md p-4">
            <p className="text-xs font-bold tracking-wider text-link uppercase">
              Prüfer · Frage {i + 1} von {questions.length} · {q!.category}
            </p>
            <p className="mt-1 text-lg leading-relaxed font-bold text-navy">{q!.text}</p>
            {speechSupported() && (
              <button type="button" onClick={() => speak(q!.text)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-link">
                <Volume2 className="size-3.5" /> Nochmal vorlesen
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {result ? (
        <motion.div className={cn("rounded-2xl border-2 p-4", verdictStyle[result.verdict].cls)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={spring} aria-live="polite">
          <p className="font-display text-xl font-bold">{verdictStyle[result.verdict].label}</p>
          <p className="mt-1 text-sm text-foreground">{result.feedback}</p>
          <p className="mt-2 text-sm text-foreground/80">
            <span className="font-semibold">Musterantwort:</span> {result.musterantwort}
          </p>
          <Button className="mt-4 w-full" onClick={next}>
            {i + 1 < questions.length ? "Nächste Frage" : "Ergebnis anzeigen"} <ArrowRight />
          </Button>
        </motion.div>
      ) : (
        <div className="glass space-y-3 rounded-2xl p-4">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder={canListen ? "Antwort sprechen (Mikrofon) oder eintippen …" : "Deine Antwort …"}
            aria-label="Deine Antwort"
            className="w-full resize-none rounded-xl border border-input bg-muted px-3 py-2 text-[15px] outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            {canListen && (
              <Button type="button" variant={listening ? "destructive" : "outline"} onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Aufnahme stoppen" : "Antwort sprechen"}>
                {listening ? (
                  <>
                    <motion.span className="size-2 rounded-full bg-white" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                    <MicOff /> Stopp
                  </>
                ) : (
                  <>
                    <Mic /> Sprechen
                  </>
                )}
              </Button>
            )}
            <Button className="flex-1" onClick={() => void submit()} disabled={!answer.trim() || grading}>
              {grading ? <Loader2 className="animate-spin" /> : <Send />} Antwort abgeben
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
