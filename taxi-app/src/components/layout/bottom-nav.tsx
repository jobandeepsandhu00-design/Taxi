"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QuizLauncher } from "@/components/quiz-launcher/quiz-launcher";
import { configToQuery, type QuizConfig } from "@/lib/quiz-config";
import { cn } from "@/lib/utils";
import { mobileNav, pathInTab, QUIZ_PATHS } from "./nav-items";

const SIGN = "M168 132 H344 L392 326 H120 Z";
const CHECK = "M194 236 L238 280 L320 194";

/** TaxiFit-Zeichen (Dachschild + Häkchen) in Weiß */
function RoofSignIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="100 110 312 240" className={className} aria-hidden style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))" }}>
      <path d={SIGN} fill="#ffffff" stroke="#ffffff" strokeWidth={28} strokeLinejoin="round" />
      <path d={CHECK} fill="none" stroke="#2563eb" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function vibrate(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nicht unterstützt */
  }
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

/** Bildschirmtastatur offen? (Leiste ausblenden, damit sie nicht hochspringt) */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const check = () => {
      const el = document.activeElement as HTMLElement | null;
      const typing = Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) && !(el as HTMLInputElement).type?.match(/checkbox|radio|range|button|submit/));
      const shrunk = vv ? window.innerHeight - vv.height > 150 : false;
      setOpen(typing && (shrunk || window.matchMedia("(pointer: coarse)").matches));
    };
    vv?.addEventListener("resize", check);
    window.addEventListener("focusin", check);
    window.addEventListener("focusout", () => window.setTimeout(check, 50));
    return () => {
      vv?.removeEventListener("resize", check);
      window.removeEventListener("focusin", check);
    };
  }, []);
  return open;
}

/** Beim Herunterscrollen ausblenden, beim Hochscrollen (oder ganz oben) wieder einblenden. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (y < 60) setHidden(false);
      else if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
      if (Math.abs(dy) > 6) lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

function announceLauncher(open: boolean) {
  window.dispatchEvent(new CustomEvent("tp-launcher", { detail: { open } }));
}

/**
 * Untere Leiste, bündig am Bildschirmrand: Home · Lernen · [Quiz] · Fortschritt · Profil.
 * Alle Tabs mit Icon + Beschriftung; mittig die Quiz-Pille mit animiertem Blau↔Gelb-Verlauf.
 */
export function BottomNav({ due, last }: { due: number; last: QuizConfig | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const visible = usePageVisible();
  const keyboard = useKeyboardOpen();
  const scrolledAway = useHideOnScroll();
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ timer: number | null; long: boolean }>({ timer: null, long: false });
  const quizActive = QUIZ_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => announceLauncher(open), [open]);

  const pillDown = () => {
    press.current.long = false;
    if (!last) return;
    press.current.timer = window.setTimeout(() => {
      press.current.long = true;
      vibrate(30);
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
        {active && <motion.span layoutId="tab-indicator" className="absolute top-0 h-[3px] w-5 rounded-b-full bg-[#ffc400]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
        <motion.div whileTap={reduce ? undefined : { scale: 0.92 }} className="w-full">
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => vibrate(8)}
            className={cn(
              "flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl pt-2 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ffc400]",
              active ? "text-[#111111] dark:text-white" : "text-[#8a8f98]",
            )}
          >
            <motion.span animate={{ scale: active ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
              <item.icon className="size-[22px]" strokeWidth={active ? 2.3 : 2} />
            </motion.span>
            <span className="font-[family-name:var(--font-inter)] text-[11px] leading-none font-medium">{item.label}</span>
          </Link>
        </motion.div>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Hauptnavigation"
        className={cn("fixed inset-x-0 bottom-0 z-30 rounded-t-[20px] border-t border-[#eeeeee] bg-white transition-transform duration-300 ease-out lg:hidden dark:border-white/10 dark:bg-[#111111]", (keyboard || (scrolledAway && !open)) && "translate-y-[calc(100%+8px)]")}
        style={{ paddingBottom: "max(2px, calc(env(safe-area-inset-bottom, 0px) - 20px))", boxShadow: "0 -4px 20px rgba(0,0,0,.06)" }}
      >
        <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5 items-center px-1">
          {mobileNav.slice(0, 2).map(tab)}
          <li className="relative flex justify-center">
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
                vibrate(10);
                setOpen((o) => !o);
              }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "relative flex h-11 w-24 items-center justify-center gap-1.5 rounded-[22px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ffc400] focus-visible:ring-offset-2",
                quizActive && "ring-2 ring-[#ffc400]/60 ring-offset-1",
              )}
            >
              {/* Verlauf + Lichtstreif in eigener, beschnittener Ebene (das Badge bleibt außerhalb sichtbar) */}
              <span aria-hidden className={cn("quiz-pill absolute inset-0 overflow-hidden rounded-[22px]", (!visible || open) && "quiz-pill-paused")} />
              <span className="relative flex items-center gap-1.5" style={{ textShadow: "0 1px 2px rgba(0,0,0,.25)" }}>
                <AnimatePresence mode="wait" initial={false}>
                  {open ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <X className="size-[18px]" strokeWidth={2.8} />
                    </motion.span>
                  ) : (
                    <motion.span key="sign" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <RoofSignIcon className="size-[22px]" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={open ? "close" : "quiz"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className={cn("font-bold", open ? "text-[13px]" : "text-[15px]")}>
                    {open ? "Schließen" : "Quiz"}
                  </motion.span>
                </AnimatePresence>
              </span>
              {due > 0 && !open && (
                <span className="absolute -top-1.5 -right-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-extrabold text-white ring-2 ring-white dark:ring-[#111111]" data-testid="quiz-fab-badge" aria-label={`${due} fällig`}>
                  <NumberFlow value={Math.min(due, 99)} />
                  {due > 99 ? "+" : ""}
                </span>
              )}
            </motion.button>
          </li>
          {mobileNav.slice(2).map(tab)}
        </ul>
      </nav>
      <QuizLauncher open={open} onClose={() => setOpen(false)} returnFocus={pillRef} last={last} />
    </>
  );
}
