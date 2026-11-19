"use client";

import { motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { haptic } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Umschalter „Wien bei Nacht" / „Wien bei Tag" mit Sonne-/Mond-Morph. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true);
  const maskId = `moon-${useId().replace(/:/g, "")}`;
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    haptic();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tp-theme", next ? "dark" : "light");
    } catch {
      /* ignorieren */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("relative flex size-10 items-center justify-center rounded-xl text-foreground/80 transition hover:bg-accent hover:text-foreground active:scale-95", className)}
      aria-label={dark ? "Zu „Wien bei Tag“ wechseln" : "Zu „Wien bei Nacht“ wechseln"}
      title={dark ? "Wien bei Tag" : "Wien bei Nacht"}
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
