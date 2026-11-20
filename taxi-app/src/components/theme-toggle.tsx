"use client";

import { motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { resolvedDark, useThemeState } from "@/lib/theme/client";
import { cn } from "@/lib/utils";
import { originOf, useThemeActions } from "./theme/use-theme-actions";

/** Schneller Hell/Dunkel-Umschalter mit Sonne-/Mond-Morph und kreisförmiger Enthüllung. */
export function ThemeToggle({ className, persistRemote = true }: { className?: string; persistRemote?: boolean }) {
  const { mode } = useThemeState();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(resolvedDark(mode)), [mode]);
  const change = useThemeActions(persistRemote);
  const maskId = `moon-${useId().replace(/:/g, "")}`;

  return (
    <button
      type="button"
      onClick={(e) => change({ mode: dark ? "light" : "dark" }, originOf(e))}
      className={cn("relative flex size-11 items-center justify-center rounded-xl text-foreground/80 transition hover:bg-accent hover:text-foreground active:scale-95", className)}
      aria-label={dark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
      title={dark ? "Hell" : "Dunkel"}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <motion.circle r="9" fill="black" animate={{ cx: dark ? 17 : 30, cy: dark ? 7 : 0 }} />
        </mask>
        <motion.circle cx="12" cy="12" fill="currentColor" stroke="none" mask={`url(#${maskId})`} animate={{ r: dark ? 9 : 5 }} />
        <motion.g animate={{ opacity: dark ? 0 : 1, rotate: dark ? -45 : 0, scale: dark ? 0.5 : 1 }} style={{ originX: "12px", originY: "12px" }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line key={deg} x1="12" y1="1.5" x2="12" y2="3.5" transform={`rotate(${deg} 12 12)`} />
          ))}
        </motion.g>
      </svg>
    </button>
  );
}
