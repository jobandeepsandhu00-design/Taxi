"use client";

import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type SegState = "open" | "answered" | "correct" | "wrong";

/** Ein Segment pro Frage: aktuell = gelber Rahmen, beantwortet = gelb (Lernmodus grün/rot), markiert = oranger Punkt. */
export function FocusSegments({ states, flags, current, onJump }: { states: SegState[]; flags: boolean[]; current: number; onJump: (i: number) => void }) {
  const done = states.filter((s) => s !== "open").length;
  return (
    <div className="flex h-3 items-center gap-[3px]" role="progressbar" aria-label={`${done} von ${states.length} beantwortet`} aria-valuemin={0} aria-valuemax={states.length} aria-valuenow={done}>
      {states.map((s, i) => (
        <button
          key={i}
          type="button"
          tabIndex={-1}
          onClick={() => onJump(i)}
          aria-hidden
          className={cn(
            "relative h-2 min-w-[4px] flex-1 rounded-full transition-colors",
            s === "answered" ? "bg-primary" : s === "correct" ? "bg-success" : s === "wrong" ? "bg-destructive" : "bg-foreground/12",
            i === current && "outline-2 outline-offset-1 outline-primary [outline-style:solid]",
          )}
        >
          {flags[i] && <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-warning" />}
        </button>
      ))}
    </div>
  );
}

/** Countdown mm:ss – normal, orange unter 5 Minuten, rot + Puls unter 1 Minute. */
export function FocusTimer({ remaining }: { remaining: number }) {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const critical = remaining < 60;
  const low = remaining < 300;
  return (
    <motion.span
      role="timer"
      aria-label={`Verbleibende Zeit: ${m} Minuten ${s} Sekunden`}
      aria-live={critical ? "polite" : "off"}
      className={cn("rounded-lg px-2 py-1 font-display text-[15px] font-bold tabular-nums", critical ? "bg-destructive/12 text-destructive" : low ? "bg-warning/12 text-warning" : "text-navy")}
      animate={critical ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={critical ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
    >
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </motion.span>
  );
}

/** Untere Leiste als Bottom-Sheet (Fragen-Übersicht, Erklärung). */
export function FocusSheet({ open, onClose, title, children, testId }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; testId?: string }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            data-testid={testId}
            className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/15" aria-hidden />
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
              <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-xl hover:bg-accent" aria-label={`${title} schließen`}>
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Fragen-Raster mit Legende; Tippen springt zur Frage. */
export function QuestionGrid({ states, flags, current, onJump }: { states: SegState[]; flags: boolean[]; current: number; onJump: (i: number) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {states.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Frage ${i + 1}${s === "open" ? ", offen" : ", beantwortet"}${flags[i] ? ", markiert" : ""}`}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "relative flex h-12 items-center justify-center rounded-xl border-2 font-display font-bold tabular-nums transition",
              s === "answered" ? "border-primary bg-primary text-primary-foreground" : s === "correct" ? "border-success bg-success/15 text-success" : s === "wrong" ? "border-destructive bg-destructive/12 text-destructive" : "border-border text-navy",
              i === current && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            )}
          >
            {i + 1}
            {flags[i] && <span className="absolute top-1 right-1 size-2 rounded-full bg-warning" />}
          </button>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-primary" /> beantwortet
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border-2 border-border" /> offen
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" /> markiert
        </li>
      </ul>
    </div>
  );
}

export function GridButton({ current, total, onClick }: { current: number; total: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 items-center gap-1.5 rounded-xl px-3 font-display font-bold text-navy tabular-nums hover:bg-accent" aria-label={`Fragen-Übersicht öffnen (Frage ${current} von ${total})`}>
      <LayoutGrid className="size-4" /> {current}/{total}
    </button>
  );
}

/** Bestätigungsdialog im Fokus-Modus (kein window.confirm). */
export function FocusDialog({
  open,
  title,
  text,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  actions: { label: string; onClick: () => void; variant?: "default" | "outline" | "destructive" | "ghost"; busy?: boolean }[];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="focus-dialog-title">
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={spring}>
            <h2 id="focus-dialog-title" className="font-display text-xl font-bold text-navy">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            <div className="mt-5 flex flex-col gap-2">
              {actions.map((a) => (
                <Button key={a.label} variant={a.variant ?? "default"} size="lg" disabled={a.busy} onClick={a.onClick}>
                  {a.label}
                </Button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Einmaliger Hinweis für iOS Safari (kein Fullscreen-API): App zum Home-Bildschirm hinzufügen. */
export function IosFullscreenHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (ios && !standalone && !localStorage.getItem("tp-ios-fullscreen-hint")) setShow(true);
    } catch {
      /* ignorieren */
    }
  }, []);
  if (!show) return null;
  return (
    <motion.div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="note">
      <span className="flex-1">📲 Für Vollbild: Zum Home-Bildschirm hinzufügen (Teilen → „Zum Home-Bildschirm“).</span>
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-lg"
        aria-label="Hinweis schließen"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem("tp-ios-fullscreen-hint", "1");
          } catch {
            /* ignorieren */
          }
        }}
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
