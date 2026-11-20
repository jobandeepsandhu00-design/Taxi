"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Wert erscheint wie auf einer Abfahrtstafel – Zeichen für Zeichen umklappend. */
export function FlipValue({ value, className, tone = "default" }: { value: string; className?: string; tone?: "default" | "correct" | "wrong" }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-0.5", className)} aria-label={value} style={{ perspective: 400 }}>
      {Array.from(value).map((ch, i) =>
        ch === " " ? (
          <span key={i} className="w-1.5" aria-hidden />
        ) : (
          <motion.span
            key={`${value}-${i}`}
            aria-hidden
            className={cn(
              "inline-flex min-w-[0.9em] items-center justify-center rounded-md px-1 py-0.5 font-display font-bold tabular shadow-sm",
              tone === "correct" ? "bg-success text-white" : tone === "wrong" ? "bg-destructive text-white" : "bg-foreground text-background",
            )}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22, delay: i * 0.05 }}
            style={{ transformOrigin: "50% 0%" }}
          >
            {ch}
          </motion.span>
        ),
      )}
    </span>
  );
}
