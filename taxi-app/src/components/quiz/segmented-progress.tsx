"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type SegmentState = "correct" | "wrong" | "answered" | "marked" | "open";

const fill: Record<SegmentState, string> = {
  correct: "bg-success",
  wrong: "bg-destructive",
  answered: "bg-primary",
  marked: "bg-warning",
  open: "bg-transparent",
};

/** Segmentierter Fortschritt: ein Segment pro Frage, füllt sich farbig. */
export function SegmentedProgress({ segments, current, label }: { segments: SegmentState[]; current: number; label?: string }) {
  const done = segments.filter((s) => s !== "open").length;
  return (
    <div
      className="flex h-2.5 w-full items-stretch gap-[3px]"
      role="progressbar"
      aria-label={label ?? "Fortschritt"}
      aria-valuemin={0}
      aria-valuemax={segments.length}
      aria-valuenow={done}
    >
      {segments.map((s, i) => (
        <div key={i} className={cn("relative flex-1 overflow-hidden rounded-full bg-foreground/10", i === current && "ring-2 ring-primary/70 ring-offset-1 ring-offset-background")}>
          <motion.div
            className={cn("absolute inset-0 origin-left rounded-full", fill[s])}
            initial={false}
            animate={{ scaleX: s === "open" ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          />
        </div>
      ))}
    </div>
  );
}
