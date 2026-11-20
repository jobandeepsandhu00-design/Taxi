"use client";

import { motion } from "motion/react";
import { Loader2, Timer, Zap } from "lucide-react";
import { useFormStatus } from "react-dom";
import { haptic } from "@/lib/motion";
import { startLessonAction } from "@/server/actions/learning";

function Inner({ due }: { due: number }) {
  const { pending } = useFormStatus();
  return (
    <motion.button
      type="submit"
      data-slot="button"
      data-variant="default"
      onPointerDown={() => haptic()}
      whileTap={{ scale: 0.97 }}
      className="relative flex min-h-[88px] w-full items-center gap-4 overflow-hidden rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-[0_14px_40px_-14px_var(--glow)]"
    >
      <motion.span
        className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-black/10"
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.5 }}
      >
        {pending ? <Loader2 className="size-7 animate-spin" /> : <Zap className="size-7" />}
      </motion.span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl leading-tight font-bold">3-Minuten-Lektion starten</span>
        <span className="mt-0.5 flex items-center gap-1 text-sm opacity-85">
          <Timer className="size-3.5" /> 5 Fragen{due > 0 ? ` · inkl. ${Math.min(2, due)} fällige` : " · neue + Schwachstellen"}
        </span>
      </span>
    </motion.button>
  );
}

/** Immer ein Tipp zum Lernen: großer Start-Button für eine Mini-Lektion. */
export function LessonCta({ due }: { due: number }) {
  return (
    <form action={startLessonAction} data-testid="lesson-cta">
      <Inner due={due} />
    </form>
  );
}
