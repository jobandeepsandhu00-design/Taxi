"use client";

import { motion } from "motion/react";
import { Check, Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { resolvedDark, useThemeState } from "@/lib/theme/client";
import { THEME_IDS, THEMES, type ThemeId, type ThemeMode } from "@/lib/theme/themes";
import { cn } from "@/lib/utils";
import { originOf, useThemeActions } from "./use-theme-actions";

/** Mini-Handy mit Live-Vorschau eines Themes (Variablen wirken über data-theme auf den Ausschnitt). */
export function ThemePreview({ id, dark }: { id: ThemeId; dark: boolean }) {
  const t = THEMES[id];
  return (
    <div data-theme={id} className={cn("font-sans relative mx-auto aspect-[9/16] w-full max-w-[150px] overflow-hidden rounded-[22px] border-[5px] border-neutral-900 bg-background text-foreground shadow-lg", !dark && "light-scope")} aria-hidden>
      <div className="absolute inset-x-0 top-0 h-3 bg-foreground/5" />
      <div className="absolute top-1 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-neutral-900" />
      <div className="space-y-2 p-2.5 pt-4">
        <p className="text-[11px] leading-tight font-bold text-navy" style={{ fontFamily: "var(--theme-display)" }}>
          Servus! {t.emoji}
        </p>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 40 40" className="size-10 shrink-0 -rotate-90">
            <circle cx="20" cy="20" r="15" fill="none" stroke="var(--muted)" strokeWidth="5" />
            <motion.circle cx="20" cy="20" r="15" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" initial={{ pathLength: 0.15 }} animate={{ pathLength: [0.15, 0.78, 0.15] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
          </svg>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="h-1.5 w-2/3 rounded-full bg-muted" />
          </div>
        </div>
        <div className="glass rounded-2xl p-2">
          <p className="text-[8px] font-semibold text-muted-foreground">Heute fällig</p>
          <p className="text-sm font-bold text-navy" style={{ fontFamily: "var(--theme-display)" }}>
            12 Fragen
          </p>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full" style={{ background: "var(--theme-gradient)" }} initial={{ width: "20%" }} animate={{ width: ["20%", "85%", "20%"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          </div>
        </div>
        <motion.div
          data-slot="button"
          data-variant="default"
          className="flex h-6 items-center justify-center rounded-xl bg-primary text-[9px] font-bold text-primary-foreground"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          Los geht&apos;s
        </motion.div>
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

const modes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Hell", icon: Sun },
  { id: "dark", label: "Dunkel", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function ModeSwitch({ persistRemote = true }: { persistRemote?: boolean }) {
  const { mode } = useThemeState();
  const change = useThemeActions(persistRemote);
  return (
    <div role="radiogroup" aria-label="Hell oder Dunkel" className="glass inline-flex rounded-2xl p-1">
      {modes.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => change({ mode: m.id }, originOf(e))}
            className={cn("relative flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {active && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-xl bg-primary" />}
            <m.icon className="relative size-4" />
            <span className="relative">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ReduceMotionToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(document.documentElement.classList.contains("reduce-motion")), []);
  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.classList.toggle("reduce-motion", next);
    try {
      localStorage.setItem("tp-reduce-motion", next ? "on" : "off");
    } catch {
      /* ignorieren */
    }
  }
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-1">
      <span>
        <span className="block text-sm font-semibold text-navy">Animationen reduzieren</span>
        <span className="block text-xs text-muted-foreground">Weniger Bewegung, keine Signatur-Effekte.</span>
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-foreground/15")}>
        <motion.span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow" animate={{ x: on ? 20 : 0 }} />
        <span className="sr-only">Animationen reduzieren</span>
      </button>
    </label>
  );
}

/** Design-Auswahl: 5 große Live-Vorschau-Karten, Wechsel mit kreisförmiger Enthüllung. */
export function ThemePicker({ persistRemote = true, compact = false }: { persistRemote?: boolean; compact?: boolean }) {
  const { theme, mode } = useThemeState();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(resolvedDark(mode)), [mode]);
  const change = useThemeActions(persistRemote);
  return (
    <div className="space-y-4">
      <div className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")} role="radiogroup" aria-label="Design wählen">
        {THEME_IDS.map((id, i) => {
          const t = THEMES[id];
          const active = theme === id;
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Design ${t.name}`}
              onClick={(e) => change({ theme: id }, originOf(e))}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={cn("relative rounded-3xl border-2 p-3 text-left transition-colors", active ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/40")}
            >
              {active && (
                <motion.span layoutId="theme-check" className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="size-4 stroke-[3]" />
                </motion.span>
              )}
              <ThemePreview id={id} dark={dark} />
              <p className="mt-3 flex items-center gap-1.5 font-display text-sm font-bold text-navy">
                {t.name}
                {id === "weiss" && <Sparkles className="size-3.5 text-link" aria-label="Standard" />}
              </p>
              {!compact && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.tagline}</p>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
