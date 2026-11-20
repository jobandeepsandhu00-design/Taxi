"use client";

import { Mic, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Großer gelber Mikrofon-Knopf: Antippen startet/stoppt. Pulsierender Ring, Live-Wellenform, Laufzeit, optional Countdown-Ring. */
export function MicButton({
  recording,
  busy,
  disabled,
  levels,
  elapsed,
  countdownSeconds,
  onToggle,
}: {
  recording: boolean;
  busy?: boolean;
  disabled?: boolean;
  levels: number[];
  elapsed: number;
  countdownSeconds?: number;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const level = levels.length ? levels.slice(-4).reduce((a, b) => a + b, 0) / 4 : 0;
  const R = 58;
  const C = 2 * Math.PI * R;
  const frac = countdownSeconds ? Math.min(1, elapsed / (countdownSeconds * 1000)) : 0;
  const left = countdownSeconds ? Math.max(0, Math.ceil(countdownSeconds - elapsed / 1000)) : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex size-[132px] items-center justify-center">
        {recording && !reduce && (
          <>
            <motion.span className="absolute inset-3 rounded-full bg-[#FFC107]/35" animate={{ scale: [1, 1.35], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} aria-hidden />
            <motion.span className="absolute inset-3 rounded-full bg-[#FFC107]/30" animate={{ scale: 1 + level * 0.45 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} aria-hidden />
          </>
        )}
        {recording && reduce && <span className="absolute inset-2 rounded-full border-4 border-[#FFC107]/60" aria-hidden />}
        {countdownSeconds && recording && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 132 132" aria-hidden>
            <circle cx="66" cy="66" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-foreground/10" />
            <circle cx="66" cy="66" r={R} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * frac} className={cn("transition-[stroke-dashoffset] duration-200", left <= 10 ? "text-destructive" : "text-primary")} />
          </svg>
        )}
        <motion.button
          type="button"
          onClick={onToggle}
          disabled={disabled || busy}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          className={cn(
            "relative z-10 flex size-24 items-center justify-center rounded-full shadow-xl outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:opacity-50",
            recording ? "bg-[#FFB300] text-black" : "bg-[#FFC107] text-black",
          )}
          aria-label={recording ? "Aufnahme beenden" : "Antwort aufnehmen"}
          aria-pressed={recording}
          data-testid="oral-mic"
        >
          {recording ? <Square className="size-9 fill-current" /> : <Mic className="size-10" />}
        </motion.button>
      </div>

      <div className="flex h-10 items-center gap-[3px]" aria-hidden>
        {levels.map((l, i) => (
          <span key={i} className={cn("w-[4px] rounded-full transition-[height] duration-75", recording ? "bg-primary" : "bg-foreground/15")} style={{ height: `${Math.max(4, Math.round((recording ? l : 0) * 40))}px` }} />
        ))}
      </div>
      <p className="h-5 text-sm font-semibold text-muted-foreground tabular-nums" aria-live="polite">
        {recording ? (countdownSeconds ? `${mmss(elapsed)} · noch ${left} s` : mmss(elapsed)) : busy ? "" : "Tippen zum Sprechen"}
      </p>
    </div>
  );
}
