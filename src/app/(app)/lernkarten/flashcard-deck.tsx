"use client";

import { Check, RotateCcw, RotateCw, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

export function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [queue, setQueue] = useState<Flashcard[]>(cards);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);
  const [repeatCount, setRepeatCount] = useState(0);
  const [, start] = useTransition();
  const card = queue[position];
  const done = position >= queue.length;

  const rate = useCallback(
    (learned: boolean) => {
      if (!card || !flipped) return;
      start(() => {
        markFlashcardAction({ questionId: card.id, result: learned ? "LEARNED" : "NOT_LEARNED" }).catch(() => {});
      });
      if (learned) setLearnedCount((n) => n + 1);
      else {
        setRepeatCount((n) => n + 1);
        // Schwierige Karte später in dieser Runde wiederholen
        setQueue((q) => [...q, card]);
      }
      setFlipped(false);
      setTimeout(() => setPosition((p) => p + 1), 150);
    },
    [card, flipped],
  );

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
      <div className="animate-pop-in mx-auto max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm">
        <Trophy className="mx-auto size-10 text-amber-500" />
        <h2 className="mt-3 text-2xl font-extrabold text-navy">Runde geschafft!</h2>
        <p className="mt-1 text-muted-foreground">{learnedCount} Karten gelernt · {repeatCount}× wiederholt</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          <RotateCcw /> Neue Runde
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(position / queue.length) * 100} />
        <span className="shrink-0 text-sm font-bold text-navy">{position + 1} / {queue.length}</span>
      </div>

      <div className="flip-scene">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Karte umdrehen: Frage anzeigen" : "Karte umdrehen: Antwort anzeigen"}
          className={cn("flip-card relative grid min-h-[340px] w-full text-left sm:min-h-[380px]", flipped && "is-flipped")}
        >
          <div className="flip-face col-start-1 row-start-1 flex flex-col rounded-3xl border bg-white p-6 shadow-lg sm:p-8">
            <span className="text-xs font-bold tracking-wider text-primary uppercase">{card.category}</span>
            {card.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.imageUrl} alt="" className="mt-3 max-h-40 rounded-xl object-contain" />
            )}
            <p className="my-auto py-6 text-xl leading-relaxed font-bold text-navy sm:text-2xl">{card.front}</p>
            <span className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
              <RotateCw className="size-4" /> Tippen zum Umdrehen
            </span>
          </div>
          <div className="flip-face flip-back col-start-1 row-start-1 flex flex-col overflow-y-auto rounded-3xl bg-gradient-to-br from-navy to-blue-700 p-6 text-white shadow-lg sm:p-8">
            <span className="text-xs font-bold tracking-wider text-blue-200 uppercase">Antwort</span>
            <ul className="mt-3 space-y-1.5">
              {card.answers.map((a) => (
                <li key={a} className="text-lg font-bold">{a}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-blue-100">{card.explanation}</p>
          </div>
        </button>
      </div>

      <div className={cn("grid grid-cols-2 gap-3 transition-opacity", flipped ? "opacity-100" : "pointer-events-none opacity-40")}>
        <Button variant="outline" size="lg" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={() => rate(false)} disabled={!flipped}>
          <X /> Nicht gelernt
        </Button>
        <Button variant="success" size="lg" onClick={() => rate(true)} disabled={!flipped}>
          <Check /> Gelernt
        </Button>
      </div>
      <p className="hidden text-center text-xs text-muted-foreground sm:block">Leertaste = umdrehen · ← nicht gelernt · → gelernt</p>
    </div>
  );
}
