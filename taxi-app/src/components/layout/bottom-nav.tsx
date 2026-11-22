"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QuizLauncher } from "@/components/quiz-launcher/quiz-launcher";
import { haptic, spring } from "@/lib/motion";
import { configToQuery, type QuizConfig } from "@/lib/quiz-config";
import { cn } from "@/lib/utils";
import { mobileNav, pathInTab, QUIZ_PATHS } from "./nav-items";

const SIGN = "M168 132 H344 L392 326 H120 Z";
const CHECK = "M194 236 L238 280 L320 194";

/** Dachschild mit Häkchen (TaxiFit-Zeichen) – schwarz auf Taxigelb */
function RoofSignIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="100 110 312 240" className={className} aria-hidden>
      <path d={SIGN} fill="#0A0A0A" stroke="#0A0A0A" strokeWidth={28} strokeLinejoin="round" />
      <path d={CHECK} fill="none" stroke="var(--primary)" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Seite sichtbar? (Puls-Animation im Hintergrund pausieren) */
function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}

/**
 * Untere Leiste: Start · Lernbuch · [QUIZ] · Fortschritt · Profil.
 * Mittiger, leuchtender Quiz-Knopf in einer Aussparung; öffnet den Quiz-Launcher (Morph per layoutId).
 */
export function BottomNav({ due, last }: { due: number; last: QuizConfig | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const visible = usePageVisible();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ timer: number | null; long: boolean }>({ timer: null, long: false });
  const quizActive = QUIZ_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const left = mobileNav.slice(0, 2);
  const right = mobileNav.slice(2);

  useEffect(() => setOpen(false), [pathname]);

  const startLongPress = () => {
    press.current.long = false;
    if (!last) return;
    press.current.timer = window.setTimeout(() => {
      press.current.long = true;
      haptic(30);
      router.push(`/quiz/start?${configToQuery(last)}`);
    }, 550);
  };
  const cancelLongPress = () => {
    if (press.current.timer) window.clearTimeout(press.current.timer);
    press.current.timer = null;
  };

  const tab = (item: (typeof mobileNav)[number]) => {
    const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathInTab(pathname, item);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={() => haptic()}
          aria-current={active ? "page" : undefined}
          className={cn("relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition-colors", active ? "text-primary-foreground" : "text-foreground/60 active:text-foreground")}
        >
          {active && <motion.span layoutId="tab-pill" className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-primary" transition={spring} />}
          <motion.span className="relative" initial={false} animate={active && !reduce ? { y: [0, -4, 0], scale: [1, 1.15, 1] } : { y: 0, scale: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <item.icon className={cn("size-5", active && "stroke-[2.4]")} />
          </motion.span>
          <span className="relative">{item.label}</span>
        </Link>
      </li>
    );
  };

  const fastPulse = due > 0;
  return (
    <>
      <nav aria-label="Schnellnavigation" className="fixed inset-x-0 bottom-0 z-30 lg:hidden" style={{ filter: "drop-shadow(0 -6px 18px rgba(0,0,0,0.12))" }}>
        {/* Leiste mit konkaver Aussparung oben in der Mitte */}
        <div
          className="relative rounded-t-[28px] bg-card-solid"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            WebkitMaskImage: "radial-gradient(circle 40px at 50% -14px, transparent 39px, #000 40px)",
            maskImage: "radial-gradient(circle 40px at 50% -14px, transparent 39px, #000 40px)",
          }}
        >
          <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pt-2 pb-1.5">
            {left.map(tab)}
            <li aria-hidden />
            {right.map(tab)}
          </ul>
        </div>

        {/* Mittiger Quiz-Knopf (20 px über der Leiste) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[46px]">
          {!reduce && visible && !open && (
            <>
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-primary"
                animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                transition={{ duration: fastPulse ? 1.6 : 2.8, repeat: Infinity, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
              />
              <span aria-hidden className="pointer-events-none absolute -inset-4 rounded-full" style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 45%, transparent) 0%, transparent 70%)" }} />
            </>
          )}
          <motion.button
            ref={buttonRef}
            type="button"
            aria-label="Quiz starten"
            aria-expanded={open}
            aria-haspopup="dialog"
            data-testid="quiz-fab"
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (press.current.long) return;
              haptic();
              setOpen((o) => !o);
            }}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/60",
              quizActive && "ring-4 ring-primary/40 ring-offset-2 ring-offset-background",
            )}
          >
            {!open && <motion.span layoutId="quiz-launcher" className="absolute inset-0 bg-primary shadow-[0_8px_24px_-6px_var(--glow)]" style={{ borderRadius: 999 }} transition={{ type: "spring", stiffness: 260, damping: 26 }} />}
            {open && <span className="absolute inset-0 rounded-full bg-primary" />}
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span key="x" className="relative" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <X className="size-7 text-[#0A0A0A]" strokeWidth={2.6} />
                </motion.span>
              ) : (
                <motion.span key="sign" className="relative" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <RoofSignIcon className="size-9" />
                </motion.span>
              )}
            </AnimatePresence>
            {due > 0 && !open && (
              <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-extrabold text-white ring-2 ring-background" data-testid="quiz-fab-badge" aria-label={`${due} fällig`}>
                <NumberFlow value={Math.min(due, 99)} />
                {due > 99 ? "+" : ""}
              </span>
            )}
          </motion.button>
        </div>
      </nav>
      <QuizLauncher open={open} onClose={() => setOpen(false)} returnFocus={buttonRef} last={last} />
    </>
  );
}
