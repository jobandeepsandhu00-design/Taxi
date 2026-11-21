"use client";

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { Check, RotateCcw, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { haptic, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { markFlashcardAction } from "@/server/actions/learning";

export interface Flashcard {
  id: string;
  front: string;
  answers: string[];
  explanation: string;
  imageUrl: string | null;
  category: string;
  status: "NEW" | "LEARNING" | "LEARNED";
}

const SWIPE = 110;

function CardFaces({ card, flipped }: { card: Flashcard; flipped: boolean }) {
  return (
    <motion.div className="relative grid h-full" animate={{ rotateY: flipped ? 180 : 0 }} transition={spring} style={{ transformStyle: "preserve-3d" }}>
      <div className="flip-face glass col-start-1 row-start-1 flex flex-col rounded-3xl bg-card-solid/95 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:p-8">
        <span className="text-xs font-bold tracking-wider text-link uppercase">{card.category}</span>
        {card.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt="" className="mt-3 max-h-40 rounded-xl object-contain" />
        )}
        <p className="my-auto py-6 text-xl leading-relaxed font-bold text-navy sm:text-2xl">{card.front}</p>
        <span className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <RotateCw className="size-4" /> Tippen zum Umdrehen
        </span>
      </div>
      <div className="flip-face flip-back panel-night col-start-1 row-start-1 flex flex-col overflow-y-auto rounded-3xl p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:p-8">
        <span className="text-xs font-bold tracking-wider text-primary uppercase">Antwort</span>
        <ul className="mt-3 space-y-1.5">
          {card.answers.map((a) => (
            <li key={a} className="text-lg font-bold whitespace-pre-line">
              {a}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-white/80">{card.explanation}</p>
        <p className="mt-auto pt-4 text-center text-xs text-white/50">→ gewusst · ← nochmal</p>
      </div>
    </motion.div>
  );
}

/** Oberste Karte: ziehbar (rechts = gewusst, links = nochmal), mit Neigung und Stempel-Overlays. */
function TopCard({ card, flipped, onFlip, onCommit, onAdvance, registerFly }: { card: Flashcard; flipped: boolean; onFlip: () => void; onCommit: (learned: boolean) => void; onAdvance: () => void; registerFly: (fn: (learned: boolean) => void) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const yes = useTransform(x, [20, SWIPE], [0, 1]);
  const no = useTransform(x, [-SWIPE, -20], [1, 0]);
  const dragged = useRef(false);

  const fly = useCallback(
    (learned: boolean) => {
      haptic(learned ? 12 : 25);
      onCommit(learned);
      void animate(x, learned ? 640 : -640, { duration: 0.32, ease: "easeIn" }).then(onAdvance);
    },
    [x, onCommit, onAdvance],
  );
  useEffect(() => {
    registerFly(fly);
  }, [fly, registerFly]);

  return (
    <motion.div
      className="absolute inset-0 z-10 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, rotate }}
      drag={flipped ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={(_, info) => {
        window.setTimeout(() => (dragged.current = false), 50);
        if (info.offset.x > SWIPE || info.velocity.x > 700) fly(true);
        else if (info.offset.x < -SWIPE || info.velocity.x < -700) fly(false);
      }}
      initial={{ scale: 0.94, y: 14, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={spring}
    >
      <button
        type="button"
        onClick={() => {
          if (!dragged.current) onFlip();
        }}
        aria-label={flipped ? "Karte umdrehen: Frage anzeigen" : "Karte umdrehen: Antwort anzeigen"}
        className="flip-scene block h-full w-full text-left outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded-3xl"
      >
        <CardFaces card={card} flipped={flipped} />
      </button>
      <motion.span style={{ opacity: yes }} className="pointer-events-none absolute top-6 left-6 -rotate-12 rounded-xl border-4 border-success px-3 py-1 font-display text-2xl font-bold text-success" aria-hidden>
        GEWUSST
      </motion.span>
      <motion.span style={{ opacity: no }} className="pointer-events-none absolute top-6 right-6 rotate-12 rounded-xl border-4 border-destructive px-3 py-1 font-display text-2xl font-bold text-destructive" aria-hidden>
        NOCHMAL
      </motion.span>
    </motion.div>
  );
}

export function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [queue, setQueue] = useState<Flashcard[]>(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);
  const [repeatCount, setRepeatCount] = useState(0);
  const [, start] = useTransition();
  const flyRef = useRef<((learned: boolean) => void) | null>(null);
  const card = queue[position];
  const done = position >= queue.length;

  /** Bewertung sofort speichern (auch wenn die Karte noch wegfliegt). */
  const commit = useCallback(
    (learned: boolean) => {
      if (!card) return;
      start(() => {
        markFlashcardAction({ questionId: card.id, result: learned ? "LEARNED" : "NOT_LEARNED" }).catch(() => {});
      });
      if (learned) setLearnedCount((n) => n + 1);
      else {
        setRepeatCount((n) => n + 1);
        // Schwierige Karte später in dieser Runde wiederholen
        setQueue((q) => [...q, card]);
      }
    },
    [card],
  );

  const advance = useCallback(() => {
    setFlipped(false);
    setPosition((p) => p + 1);
  }, []);

  const rate = useCallback(
    (learned: boolean) => {
      if (!card || !flipped) return;
      if (flyRef.current) flyRef.current(learned);
      else {
        commit(learned);
        advance();
      }
    },
    [card, flipped, commit, advance],
  );

  useEffect(() => {
    if (done && learnedCount + repeatCount > 0) {
      playSound("levelUp");
      void fireConfetti({ particleCount: 120, spread: 90 });
    }
  }, [done, learnedCount, repeatCount]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") rate(true);
      else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "n") rate(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate, done]);

  if (done) {
    return (
      <motion.div className="glass mx-auto max-w-lg rounded-3xl p-8 text-center" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
        <motion.p className="text-6xl" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }} aria-hidden>
          🏁
        </motion.p>
        <h2 className="mt-3 text-2xl font-bold text-navy">Runde geschafft!</h2>
        <p className="mt-1 text-muted-foreground">
          {learnedCount} Karten gelernt · {repeatCount}× wiederholt
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          <RotateCcw /> Neue Runde
        </Button>
      </motion.div>
    );
  }

  const behind = queue.slice(position + 1, position + 3);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/12 px-3 py-1 text-destructive">
          <X className="size-4" /> Nochmal <AnimatedNumber value={repeatCount} />
        </span>
        <span className="font-display font-bold text-navy tabular-nums">
          {position + 1} / {queue.length}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-success">
          <Check className="size-4" /> Gewusst <AnimatedNumber value={learnedCount} />
        </span>
      </div>

      <div className="relative h-[380px] sm:h-[420px]">
        {behind
          .map((c, i) => (
            <motion.div
              key={`${c.id}-${position + i + 1}`}
              className="glass absolute inset-0 rounded-3xl bg-card-solid/80"
              initial={false}
              animate={{ scale: 1 - (i + 1) * 0.05, y: (i + 1) * 14, opacity: 1 - (i + 1) * 0.25 }}
              transition={spring}
              aria-hidden
            />
          ))
          .reverse()}
        <AnimatePresence initial={false}>
          <TopCard
            key={`${card.id}-${position}`}
            card={card}
            flipped={flipped}
            onFlip={() => {
              haptic();
              setFlipped((f) => !f);
            }}
            onCommit={commit}
            onAdvance={advance}
            registerFly={(fn) => {
              flyRef.current = fn;
            }}
          />
        </AnimatePresence>
      </div>

      <div className={cn("grid grid-cols-2 gap-3 transition-opacity", flipped ? "opacity-100" : "pointer-events-none opacity-40")}>
        <Button variant="outline" size="lg" className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15" onClick={() => rate(false)} disabled={!flipped}>
          <X /> Nicht gelernt
        </Button>
        <Button variant="success" size="lg" onClick={() => rate(true)} disabled={!flipped}>
          <Check /> Gelernt
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        <span className="sm:hidden">Tippen zum Umdrehen, dann nach rechts (gewusst) oder links (nochmal) wischen.</span>
        <span className="hidden sm:inline">Leertaste = umdrehen · ← nochmal · → gewusst · oder Karte ziehen</span>
      </p>
    </div>
  );
}
