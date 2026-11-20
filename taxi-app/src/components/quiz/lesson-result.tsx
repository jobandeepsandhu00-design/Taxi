"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Coffee, RotateCcw, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import { spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { startLessonAction } from "@/server/actions/learning";

export interface LessonInfo {
  kind: string;
  categoryId: string | null;
  lessonIndex: number | null;
  /** Gibt es eine nächste feste Lektion in der Kategorie? */
  hasNext: boolean;
}

/** Kurzer Abschluss einer Mini-Lektion – nie eine längere Sitzung erzwingen. */
export function LessonResult({ correct, total, xp, lesson, results }: { correct: number; total: number; xp: number; lesson: LessonInfo; results: boolean[] }) {
  const perfect = total > 0 && correct === total;
  useEffect(() => {
    if (perfect) {
      playSound("levelUp");
      void fireConfetti({ particleCount: 70, spread: 75, origin: { y: 0.45 } });
    }
  }, [perfect]);
  const headline = perfect ? "Perfekt! 5 von 5 🎉" : correct >= total - 1 ? "Stark gemacht!" : correct >= total / 2 ? "Gut gefahren!" : "Dranbleiben – das wird!";
  const nextIndex = lesson.kind === "category" && lesson.lessonIndex ? (lesson.hasNext ? lesson.lessonIndex + 1 : lesson.lessonIndex) : null;
  return (
    <div className="mx-auto max-w-md space-y-6 py-4 text-center" data-testid="lesson-result">
      <p className="text-xs font-bold tracking-widest text-link uppercase">Lektion geschafft</p>
      <h1 className="text-center text-3xl font-bold text-navy">{headline}</h1>
      <div className="glass rounded-3xl p-6">
        <p className="font-display text-6xl font-bold text-navy" aria-label={`${correct} von ${total} richtig`}>
          <AnimatedNumber value={correct} />
          <span className="text-muted-foreground">/{total}</span>
        </p>
        <div className="mt-4 flex justify-center gap-2" aria-hidden>
          {results.map((ok, i) => (
            <motion.span
              key={i}
              className={cn("flex size-9 items-center justify-center rounded-full text-sm font-bold text-white", ok ? "bg-success" : "bg-destructive")}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring, delay: 0.25 + i * 0.08 }}
            >
              {ok ? "✓" : "✗"}
            </motion.span>
          ))}
        </div>
        {xp > 0 && (
          <motion.p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Sparkles className="size-4" /> +{xp} XP
          </motion.p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <form action={startLessonAction}>
          {lesson.categoryId && <input type="hidden" name="categoryId" value={lesson.categoryId} />}
          {nextIndex && <input type="hidden" name="lessonIndex" value={nextIndex} />}
          <Button type="submit" size="lg" className="w-full">
            <RotateCcw /> {nextIndex && lesson.hasNext ? `Weiter mit Lektion ${nextIndex}` : "Noch eine?"}
          </Button>
        </form>
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href="/dashboard">
            <Coffee /> Für heute fertig
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Kurze Einheiten wirken – lieber täglich 3 Minuten als einmal pro Woche eine Stunde.</p>
    </div>
  );
}
