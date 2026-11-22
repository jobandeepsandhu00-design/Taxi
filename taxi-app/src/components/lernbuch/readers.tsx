"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Pause, Play, RotateCcw, SkipBack, SkipForward, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { READ_AFTER_MS, type ReadStatus, type StoryCard } from "@/lib/lernbuch";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { saveChapterPositionAction, updateLernbuchSettingsAction } from "@/server/actions/lernbuch";
import { flushQueue, sendMark } from "./mark-queue";
import { useQuestionAudio } from "@/components/audio/use-question-audio";
import { audioEngine } from "@/lib/audio/player";

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

/** Hör-Modus: Frage → Pause → Antwort → Erklärung (Studio-Audios, sonst Gerätestimme), mit Media-Session-Steuerung. */
export function AudioReader({ categoryId, cards: initial, settings }: Props) {
  const [cards, setCards] = useState(initial);
  const firstOpen = Math.max(0, initial.findIndex((c) => !c.status));
  const [index, setIndex] = useState(firstOpen);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(settings.audioSpeed);
  const [fallback, setFallback] = useState(false);
  const run = useRef(0);
  const audioFor = useQuestionAudio();
  const card = cards[index];

  const playFrom = useCallback(
    async (start: number) => {
      const engine = audioEngine();
      if (!engine.unlocked) await engine.unlock();
      const my = ++run.current;
      setPlaying(true);
      for (let i = start; i < cards.length; i++) {
        if (my !== run.current) return;
        const c = cards[i];
        setIndex(i);
        const map = await audioFor.load(cards.slice(i, i + 3).map((x) => x.id));
        const set = map[c.id] ?? {};
        void engine.preload([map[cards[i + 1]?.id]?.question, map[cards[i + 1]?.id]?.answer]);
        setFallback(!set.question);
        engine.mediaSession({ title: c.question.slice(0, 80), artist: `Karte ${i + 1} von ${cards.length}`, album: "TaxiFit Lernbuch" }, {
          play: () => engine.resume(),
          pause: () => engine.pause(),
          nexttrack: () => void playFrom(Math.min(cards.length - 1, i + 1)),
          previoustrack: () => void playFrom(Math.max(0, i - 1)),
        });
        await engine.playOrSpeak(set.question, c.question, { rate: speed });
        if (my !== run.current) return;
        await engine.silence(700);
        if (my !== run.current) return;
        await engine.playOrSpeak(set.answer, c.answer, { rate: speed });
        if (my !== run.current) return;
        if (c.explanation) {
          await engine.silence(400);
          if (my !== run.current) return;
          await engine.playOrSpeak(set.explanation, c.explanation, { rate: speed });
          if (my !== run.current) return;
        }
        if (!c.status) {
          setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, status: "gelesen" } : x)));
          void sendMark(c.id, "gelesen").then(() => saveChapterPositionAction(categoryId, i).catch(() => undefined));
        }
        await engine.silence(1200);
      }
      if (my === run.current) setPlaying(false);
    },
    [cards, audioFor, speed, categoryId],
  );

  const pause = useCallback(() => {
    run.current++;
    audioEngine().stop();
    setPlaying(false);
  }, []);
  const jump = (i: number) => {
    const n = Math.max(0, Math.min(cards.length - 1, i));
    if (playing) void playFrom(n);
    else setIndex(n);
  };

  useEffect(() => {
    const r = run;
    return () => {
      r.current++;
      audioEngine().stop();
    };
  }, []);

  const changeSpeed = (sp: number) => {
    setSpeed(sp);
    audioEngine().setRate(sp);
    void updateLernbuchSettingsAction({ audioSpeed: sp }).catch(() => undefined);
  };

  if (!card) return null;
  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5" aria-live="polite" data-testid="audio-card">
        <p className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            Karte {index + 1} von {cards.length}
          </span>
          {fallback && playing && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">Ersatzstimme</span>}
        </p>
        <h2 className="text-lg leading-snug font-extrabold text-navy">{card.question}</h2>
        <p className="mt-3 rounded-xl bg-success/10 p-3 text-sm whitespace-pre-line">{card.answer}</p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={() => jump(index - 1)} className="rounded-full p-3 hover:bg-accent" aria-label="Vorherige Karte">
          <SkipBack className="size-6" />
        </button>
        <button type="button" onClick={playing ? pause : () => void playFrom(index)} className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95" aria-label={playing ? "Pause" : "Abspielen"} data-testid="audio-play">
          {playing ? <Pause className="size-7" /> : <Play className="size-7 translate-x-0.5" />}
        </button>
        <button type="button" onClick={() => jump(index + 1)} className="rounded-full p-3 hover:bg-accent" aria-label="Nächste Karte">
          <SkipForward className="size-6" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="font-semibold text-muted-foreground">Tempo</span>
        {[0.8, 1, 1.2, 1.5].map((sp) => (
          <button key={sp} type="button" onClick={() => changeSpeed(sp)} aria-pressed={speed === sp} className={cn("rounded-lg px-2.5 py-1 font-semibold", speed === sp ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>
            {sp}×
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
  const [autoplay, setAutoplay] = useState(false);
  const audioFor = useQuestionAudio();
  const card = cards[index];
  const done = index >= cards.length;
  useEffect(() => void flushQueue(), []);
  useEffect(() => {
    try {
      setAutoplay(localStorage.getItem("tp-cards-autoplay") === "1");
    } catch {
      /* ignorieren */
    }
  }, []);
  // Automatisch vorlesen: Frage vorne, Antwort beim Umdrehen
  useEffect(() => {
    if (!autoplay || !card) return;
    let alive = true;
    void audioFor.get(card.id).then((set) => {
      if (!alive) return;
      const engine = audioEngine();
      void (flipped ? engine.playOrSpeak(set.answer, card.answer) : engine.playOrSpeak(set.question, card.question));
    });
    return () => {
      alive = false;
      audioEngine().stop();
    };
  }, [autoplay, card, flipped, audioFor]);
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
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          Karte {index + 1} von {cards.length}
        </span>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={autoplay}
            onChange={(e) => {
              const v = e.target.checked;
              setAutoplay(v);
              if (v) void audioEngine().unlock();
              try {
                localStorage.setItem("tp-cards-autoplay", v ? "1" : "0");
              } catch {
                /* ignorieren */
              }
            }}
            data-testid="cards-autoplay"
          />
          Automatisch vorlesen
        </label>
      </div>
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
