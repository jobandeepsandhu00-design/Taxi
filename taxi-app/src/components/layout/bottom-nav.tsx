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

/** TaxiFit-Zeichen: Dachschild mit Häkchen (schwarz, Häkchen in Pillenfarbe) */
function RoofSignIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="100 110 312 240" className={className} aria-hidden>
      <path d={SIGN} fill="currentColor" stroke="currentColor" strokeWidth={28} strokeLinejoin="round" />
      <path d={CHECK} fill="none" stroke="var(--dock-pill)" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

/** Beim schnellen Herunterscrollen wird das Dock etwas kompakter; beim Hochscrollen/Anhalten wieder normal. */
function useCompactOnScroll() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    let idle: number | undefined;
    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      const v = (y - lastY) / Math.max(1, t - lastT); // px/ms
      if (v > 0.6 && y > 80) setCompact(true);
      else if (v < -0.2) setCompact(false);
      lastY = y;
      lastT = t;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setCompact(false), 220);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
    };
  }, []);
  return compact;
}

/** Launcher-Zustand für andere Komponenten (z. B. Toni ausblenden) */
function announceLauncher(open: boolean) {
  window.dispatchEvent(new CustomEvent("tp-launcher", { detail: { open } }));
}

/**
 * Schwebendes dunkles Dock: Start · Lernbuch · [Quiz] · Fortschritt · Profil.
 * Seitliche Tabs nur als Icon (gelber Punkt = aktiv), mittig die leuchtende Quiz-Pille → Quiz-Launcher.
 */
export function BottomNav({ due, last }: { due: number; last: QuizConfig | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const visible = usePageVisible();
  const compact = useCompactOnScroll();
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ timer: number | null; long: boolean }>({ timer: null, long: false });
  const tipTimer = useRef<number | null>(null);
  const quizActive = QUIZ_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => announceLauncher(open), [open]);

  const pillDown = () => {
    press.current.long = false;
    if (!last) return;
    press.current.timer = window.setTimeout(() => {
      press.current.long = true;
      haptic(30);
      router.push(`/quiz/start?${configToQuery(last)}`);
    }, 550);
  };
  const pillCancel = () => {
    if (press.current.timer) window.clearTimeout(press.current.timer);
    press.current.timer = null;
  };

  const tab = (item: (typeof mobileNav)[number]) => {
    const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathInTab(pathname, item);
    return (
      <li key={item.href} className="relative flex justify-center">
        <Link
          href={item.href}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          onClick={() => haptic()}
          onPointerDown={() => {
            tipTimer.current = window.setTimeout(() => setTooltip(item.label), 450);
          }}
          onPointerUp={() => {
            if (tipTimer.current) window.clearTimeout(tipTimer.current);
            window.setTimeout(() => setTooltip(null), 900);
          }}
          onPointerLeave={() => tipTimer.current && window.clearTimeout(tipTimer.current)}
          onContextMenu={(e) => e.preventDefault()}
          className="relative flex size-14 flex-col items-center justify-center rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--dock-pill)]"
        >
          <motion.span key={active ? "on" : "off"} initial={false} animate={active && !reduce ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}>
            <item.icon className="size-6 transition-colors" style={{ color: active ? "var(--dock-active)" : "var(--dock-icon)", opacity: compact && !active ? 0.9 : 1 }} strokeWidth={active ? 2.3 : 2} />
          </motion.span>
          {active && <motion.span layoutId="dock-dot" className="absolute bottom-1.5 size-1 rounded-full bg-[var(--dock-pill)]" transition={spring} />}
        </Link>
        <AnimatePresence>
          {tooltip === item.label && (
            <motion.span role="tooltip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute -top-9 rounded-lg bg-[var(--dock-active)] px-2 py-1 text-xs font-semibold whitespace-nowrap text-[var(--dock)] shadow">
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </li>
    );
  };

  const breathe = !reduce && visible && !open;
  const halo = due > 0 ? "0 0 29px color-mix(in oklab, var(--dock-pill) 54%, transparent)" : "0 0 24px color-mix(in oklab, var(--dock-pill) 45%, transparent)";

  return (
    <>
      <motion.nav
        aria-label="Hauptnavigation"
        className="fixed z-30 flex items-center lg:hidden"
        style={{
          left: 16,
          right: 16,
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          borderRadius: 32,
          background: "var(--dock)",
          border: "1px solid var(--dock-border)",
          boxShadow: "0 12px 32px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.06)",
        }}
        animate={{ height: compact ? 56 : 64 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <ul className="mx-auto grid w-full max-w-md grid-cols-[1fr_1fr_auto_1fr_1fr] items-center px-1">
          {mobileNav.slice(0, 2).map(tab)}
          <li className="relative flex justify-center px-1">
            {breathe && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-1 right-1 rounded-[23px] border-2"
                style={{ borderColor: "var(--dock-pill)", willChange: "transform, opacity" }}
                animate={{ scale: [1, 1.12], opacity: [0.45, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <motion.button
              ref={pillRef}
              type="button"
              aria-label={open ? "Quiz-Auswahl schließen" : "Quiz starten"}
              aria-expanded={open}
              aria-haspopup="dialog"
              data-testid="quiz-fab"
              onPointerDown={pillDown}
              onPointerUp={pillCancel}
              onPointerLeave={pillCancel}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (press.current.long) return;
                haptic();
                setOpen((o) => !o);
              }}
              whileTap={{ scale: 0.94 }}
              className={cn("relative flex h-[46px] w-[104px] items-center justify-center gap-1.5 rounded-[23px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dock-pill)]", quizActive && "outline-2 outline-offset-2 outline-[color-mix(in_oklab,var(--dock-pill)_60%,transparent)]")}
              style={{ color: "var(--dock-pill-fg)" }}
            >
              {!open && <motion.span layoutId="quiz-launcher" className="absolute inset-0" style={{ borderRadius: 23, background: "var(--dock-pill)", boxShadow: halo }} transition={{ type: "spring", stiffness: 260, damping: 26 }} />}
              {open && <span className="absolute inset-0 rounded-[23px]" style={{ background: "var(--dock-pill)" }} />}
              <span className="relative flex items-center gap-1.5">
                <AnimatePresence mode="wait" initial={false}>
                  {open ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <X className="size-5" strokeWidth={2.6} />
                    </motion.span>
                  ) : (
                    <motion.span key="sign" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <RoofSignIcon className="size-6" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={open ? "close" : "quiz"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="font-[family-name:var(--font-grotesk)] text-[15px] font-semibold">
                    {open ? "Schließen" : "Quiz"}
                  </motion.span>
                </AnimatePresence>
              </span>
              {due > 0 && !open && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-extrabold text-white ring-2 ring-[var(--dock)]" data-testid="quiz-fab-badge" aria-label={`${due} fällig`}>
                  <NumberFlow value={Math.min(due, 99)} />
                  {due > 99 ? "+" : ""}
                </span>
              )}
            </motion.button>
          </li>
          {mobileNav.slice(2).map(tab)}
        </ul>
      </motion.nav>
      <QuizLauncher open={open} onClose={() => setOpen(false)} returnFocus={pillRef} last={last} />
    </>
  );
}
