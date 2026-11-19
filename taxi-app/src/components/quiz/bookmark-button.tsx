"use client";

import { AnimatePresence, motion } from "motion/react";
import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { haptic } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toggleBookmarkAction } from "@/server/actions/learning";

/** Merken-Stern: füllt sich mit Feder-Animation und Partikel-Burst. */
export function BookmarkButton({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [burst, setBurst] = useState(0);
  const [pending, start] = useTransition();
  return (
    <motion.button
      type="button"
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Von der Merkliste entfernen" : "Zur Merkliste hinzufügen"}
      title={bookmarked ? "Gemerkt" : "Merken"}
      whileTap={{ scale: 0.85 }}
      onClick={() => {
        haptic();
        const next = !bookmarked;
        setBookmarked(next);
        if (next) setBurst((b) => b + 1);
        start(async () => {
          const res = await toggleBookmarkAction(questionId);
          if (res.ok) setBookmarked(res.data.bookmarked);
          else setBookmarked(!next);
        });
      }}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-xl border transition-colors",
        bookmarked ? "border-primary/50 bg-primary/12 text-primary" : "glass text-muted-foreground hover:text-navy",
      )}
    >
      <motion.span key={bookmarked ? "on" : "off"} initial={{ scale: bookmarked ? 0.3 : 1, rotate: bookmarked ? -60 : 0 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
        <Star className={cn("size-[18px]", bookmarked && "fill-primary")} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && bookmarked && (
          <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-full bg-primary"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 22, y: Math.sin(a) * 22, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
