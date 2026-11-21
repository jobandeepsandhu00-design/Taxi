"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Pause, Play, RotateCcw, SkipBack, SkipForward, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { READ_AFTER_MS, type ReadStatus, type StoryCard } from "@/lib/lernbuch";
import { haptic, spring } from "@/lib/motion";
import { speechSupported, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { saveChapterPositionAction, updateLernbuchSettingsAction } from "@/server/actions/lernbuch";
import { flushQueue, sendMark } from "./mark-queue";

type Settings = { audioSpeed: number; showWrongAnswers: boolean };
type Props = { categoryId: string; cards: StoryCard[]; settings: Settings };

function StatusDot({ status }: { status: ReadStatus | null }) {
  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", status === "verstanden" ? "bg-success" : status === "nochmal" ? "bg-warning" : status === "gelesen" ? "bg-primary" : "bg-foreground/15")}
      aria-label={status ?? "ungelesen"}
    />
  );
}

/** Lese-Liste: alle Karten untereinander; eine Karte gilt als gelesen, wenn sie ≥ 3 s sichtbar war. */
export function ListReader({ categoryId, cards: initial }: Props) {
  const [cards, setCards] = useState(initial);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    void flushQueue();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.cardId!;
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            if (timers.current.has(id)) continue;
            timers.current.set(
              id,
              setTimeout(() => {
                setCards((cs) => cs.map((c) => (c.id === id && !c.status ? { ...c, status: "gelesen" } : c)));
                void sendMark(id, "gelesen").then(() => saveChapterPositionAction(categoryId, idx).catch(() => undefined));
              }, READ_AFTER_MS),
            );
          } else {
            const t = timers.current.get(id);
            if (t) clearTimeout(t);
            timers.current.delete(id);
          }
        }
      },
      { threshold: [0, 0.6] },
    );
    document.querySelectorAll<HTMLElement>("[data-lb-list] [data-card-id]").forEach((el) => {
      const c = initial.find((x) => x.id === el.dataset.cardId);
      if (!c?.status) io.observe(el);
    });
    const ts = timers.current;
    return () => {
      io.disconnect();
      ts.forEach((t) => clearTimeout(t));
    };
  }, [categoryId, initial]);
  const read = cards.filter((c) => c.status).length;
  return (
    <div data-lb-list>
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {read} von {cards.length} gelesen
      </p>
      <ol className="space-y-4">
        {cards.map((c, i) => (
          <li key={c.id} data-card-id={c.id} data-idx={i} className="glass rounded-2xl p-4" data-testid="list-card">
            <div className="mb-2 flex items-start gap-2">
              <StatusDot status={c.status} />
              <h2 className="flex-1 leading-snug font-extrabold text-navy">
                <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                {c.question}
              </h2>
              {c.starred && <Star className="size-4 fill-primary text-primary" aria-label="Gemerkt" />}
            </div>
            <p className="rounded-xl bg-success/10 p-3 text-sm leading-relaxed whitespace-pre-line">{c.answer}</p>
            {c.explanation && <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{c.explanation}</p>}
            {c.legal && <p className="mt-2 text-xs text-muted-foreground">{c.legal}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Hör-Modus: liest Frage + Antwort nacheinander vor (de-AT), mit Media-Session-Steuerung. */
export function AudioReader({ categoryId, cards: initial, settings }: Props) {
  const [cards, setCards] = useState(initial);
  const firstOpen = Math.max(0, initial.findIndex((c) => !c.status));
  const [index, setIndex] = useState(firstOpen);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings.audioSpeed);
  const playingRef = useRef(false);
  const supported = typeof window !== "undefined" && speechSupported();
  const card = cards[index];

  const speakCard = useCallback(
    (i: number) => {
      const c = cards[i];
      if (!c || !speechSupported()) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(`Frage ${i + 1}. ${c.question}. Antwort: ${c.answer}`);
      u.lang = "de-AT";
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase() === "de-at") ?? window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("de"));
      if (voice) u.voice = voice;
      u.rate = speed;
      u.onend = () => {
        if (!c.status) {
          setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: "gelesen" } : x)));
          void sendMark(c.id, "gelesen").then(() => saveChapterPositionAction(categoryId, i).catch(() => undefined));
        }
        if (playingRef.current && i + 1 < cards.length) {
          setIndex(i + 1);
          setTimeout(() => playingRef.current && speakCard(i + 1), 600);
        } else {
          playingRef.current = false;
          setPlaying(false);
        }
      };
      window.speechSynthesis.speak(u);
    },
    [cards, speed, categoryId],
  );

  const play = useCallback(() => {
    playingRef.current = true;
    setPlaying(true);
    speakCard(index);
  }, [index, speakCard]);
  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    stopSpeaking();
  }, []);
  const jump = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(cards.length - 1, i));
      setIndex(n);
      if (playingRef.current) speakCard(n);
    },
    [cards.length, speakCard],
  );

  // Media Session (Sperrbildschirm / Kopfhörer)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !card) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: card.question.slice(0, 80), artist: `Karte ${index + 1} von ${cards.length}`, album: "TaxiFit Lernbuch" });
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("nexttrack", () => jump(index + 1));
    navigator.mediaSession.setActionHandler("previoustrack", () => jump(index - 1));
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [card, index, cards.length, play, pause, jump, playing]);

  useEffect(() => () => stopSpeaking(), []);

  const changeSpeed = (s: number) => {
    setSpeed(s);
    void updateLernbuchSettingsAction({ audioSpeed: s }).catch(() => undefined);
  };

  if (!supported) return <p className="text-sm text-muted-foreground">Dein Browser unterstützt das Vorlesen leider nicht.</p>;
  if (!card) return null;
  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5" aria-live="polite" data-testid="audio-card">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Karte {index + 1} von {cards.length}
        </p>
        <h2 className="text-lg leading-snug font-extrabold text-navy">{card.question}</h2>
        <p className="mt-3 rounded-xl bg-success/10 p-3 text-sm whitespace-pre-line">{card.answer}</p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={() => jump(index - 1)} className="rounded-full p-3 hover:bg-accent" aria-label="Vorherige Karte">
          <SkipBack className="size-6" />
        </button>
        <button type="button" onClick={playing ? pause : play} className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95" aria-label={playing ? "Pause" : "Abspielen"} data-testid="audio-play">
          {playing ? <Pause className="size-7" /> : <Play className="size-7 translate-x-0.5" />}
        </button>
        <button type="button" onClick={() => jump(index + 1)} className="rounded-full p-3 hover:bg-accent" aria-label="Nächste Karte">
          <SkipForward className="size-6" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="font-semibold text-muted-foreground">Tempo</span>
        {[0.8, 1, 1.2, 1.5].map((s) => (
          <button key={s} type="button" onClick={() => changeSpeed(s)} aria-pressed={speed === s} className={cn("rounded-lg px-2.5 py-1 font-semibold", speed === s ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>
            {s}×
          </button>
        ))}
      </div>
      <ol className="max-h-72 space-y-1 overflow-y-auto">
        {cards.map((c, i) => (
          <li key={c.id}>
            <button type="button" onClick={() => jump(i)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm", i === index ? "bg-primary/15 font-bold" : "hover:bg-accent")}>
              <StatusDot status={c.status} />
              <span className="truncate">
                {i + 1}. {c.question}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Karteikarten: Frage vorne, Skript-Antwort hinten – „Nochmal“ / „Verstanden“. */
export function ChapterFlashcards({ cards: initial }: Props) {
  const reduce = useReducedMotion();
  const [cards, setCards] = useState(initial);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  const done = index >= cards.length;
  useEffect(() => void flushQueue(), []);
  const rate = (status: "verstanden" | "nochmal") => {
    if (!card) return;
    haptic();
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, status } : c)));
    void sendMark(card.id, status);
    setFlipped(false);
    setIndex((i) => i + 1);
  };
  if (done) {
    const ok = cards.filter((c) => c.status === "verstanden").length;
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-2xl p-8 text-center" data-testid="cards-done">
        <Check className="size-10 text-success" />
        <p className="text-lg font-extrabold text-navy">Alle Karten durch!</p>
        <p className="text-sm text-muted-foreground">
          {ok} von {cards.length} verstanden.
        </p>
        <button type="button" onClick={() => setIndex(0)} className="h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground">
          Nochmal von vorne
        </button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-center text-xs font-semibold text-muted-foreground">
        Karte {index + 1} von {cards.length}
      </p>
      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.button
            key={`${card.id}-${flipped}`}
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="glass flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-3xl p-6 text-center"
            initial={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
            transition={{ ...spring, duration: 0.25 }}
            data-testid="flashcard"
            aria-label={flipped ? "Antwort – tippen für die Frage" : "Frage – tippen für die Antwort"}
          >
            <span className="text-xs font-bold tracking-wider text-link uppercase">{flipped ? "Antwort" : "Frage"}</span>
            <span className={cn("leading-relaxed whitespace-pre-line", flipped ? "text-base" : "text-xl font-extrabold text-navy")}>{flipped ? card.answer : card.question}</span>
            {!flipped && <span className="text-xs text-muted-foreground">Tippen zum Umdrehen</span>}
          </motion.button>
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => rate("nochmal")} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning/10 font-bold text-warning" data-testid="card-again">
          <RotateCcw className="size-4" /> Nochmal
        </button>
        <button type="button" onClick={() => rate("verstanden")} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-success font-bold text-white" data-testid="card-understood">
          <Check className="size-4" /> Verstanden
        </button>
      </div>
    </div>
  );
}
