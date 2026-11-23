"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/lib/motion";
import { isGroupSeen, isToday, ringGradient, type StoryGroupData } from "@/lib/stories";
import { cn } from "@/lib/utils";
import { StoryViewer } from "./story-viewer";

const SPEED = 20; // px/s
const RESUME_AFTER = 5000;

function StoryCircle({ g, seen, isNew, onOpen, dup, hiddenWhileOpen }: { g: StoryGroupData; seen: boolean; isNew: boolean; onOpen: (el: HTMLElement) => void; dup?: boolean; hiddenWhileOpen: boolean }) {
  return (
    <li className="w-[78px] shrink-0 snap-start" aria-hidden={dup || undefined}>
      <motion.button
        type="button"
        tabIndex={dup ? -1 : 0}
        onClick={(e) => onOpen(e.currentTarget.querySelector("[data-avatar]") as HTMLElement)}
        whileTap={{ scale: 0.92 }}
        className="flex w-full flex-col items-center gap-1.5 outline-none focus-visible:[&_[data-avatar]]:ring-4 focus-visible:[&_[data-avatar]]:ring-[#FFC400]/50"
        aria-label={`Story ${g.title}${seen ? " (gesehen)" : ""}`}
        data-testid={dup ? undefined : `story-circle-${g.key}`}
        data-story-key={dup ? undefined : g.key}
      >
        <span className="relative block size-[74px]">
          {/* 3px-Ring: ungesehen = drehender Farbverlauf, gesehen = grau */}
          <span
            aria-hidden
            className={cn("absolute inset-0 rounded-full", !seen && "story-ring-spin")}
            style={{ background: seen ? "#d4d4d8" : ringGradient(g.ring) }}
          />
          <span className="absolute inset-[3px] rounded-full bg-background p-[2px]">
            <span
              data-avatar
              className={cn("flex h-full w-full items-center justify-center overflow-hidden rounded-full transition-opacity", g.type === "kapitel" ? "font-display text-[28px] font-extrabold text-[#FFC400]" : "text-[30px]", hiddenWhileOpen && "opacity-0")}
              style={{ background: g.iconUrl ? undefined : g.type === "kapitel" ? "linear-gradient(160deg,#111,#2a2a2a)" : "linear-gradient(160deg,#fff7d6,#ffe9a3)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Story-Bild aus Supabase Storage */}
              {g.iconUrl ? <img src={g.iconUrl} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} /> : <span aria-hidden>{g.icon}</span>}
            </span>
          </span>
          {isNew && !seen && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#ef4444] px-1.5 py-px text-[9px] font-extrabold text-white ring-2 ring-background">NEU</span>}
        </span>
        <span className={cn("w-full truncate text-center text-[11px] leading-tight", seen ? "font-medium text-muted-foreground" : "font-bold text-navy")}>{g.title}</span>
      </motion.button>
    </li>
  );
}

/** Story-Leiste unter der Begrüßung: läuft langsam von selbst (Laufband), pausiert bei Berührung, wischbar. */
export function StoryRow({ groups: initial, today, isAdmin = false }: { groups: StoryGroupData[]; today: string; isAdmin?: boolean }) {
  const reduce = useReducedMotion();
  const [groups, setGroups] = useState(initial);
  const [open, setOpen] = useState<{ key: string; origin: { x: number; y: number; r: number } } | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const firstCopy = useRef<HTMLUListElement>(null);
  const storyEntry = useRef(false);
  const snapTimer = useRef<number | null>(null);
  const [closeSignal, setCloseSignal] = useState(0);
  const state = useRef({ pos: 0, expected: 0, visible: false, pausedUntil: 0, touching: false, hover: false });

  useEffect(() => setGroups(initial), [initial]);

  // Laufband nur, wenn die Kreise breiter als der Bildschirm sind
  useLayoutEffect(() => {
    const check = () => {
      const el = scroller.current;
      const list = firstCopy.current;
      if (el && list) setOverflowing(list.scrollWidth > el.clientWidth + 8);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [groups.length]);

  const marquee = overflowing && !reduce;

  // nur laufen, wenn sichtbar
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (state.current.visible = Boolean(e?.isIntersecting)), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!marquee || open) return;
    const el = scroller.current;
    const list = firstCopy.current;
    if (!el || !list) return;
    let raf = 0;
    let last = performance.now();
    const s = state.current;
    s.pos = el.scrollLeft;
    const tick = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      const now = Date.now();
      const half = list.offsetWidth + 12; // Breite einer Kopie inkl. Abstand
      if (s.visible && !s.touching && !s.hover && now >= s.pausedUntil && document.visibilityState === "visible") {
        s.pos += (SPEED * dt) / 1000;
        if (s.pos >= half) s.pos -= half;
        const v = Math.round(s.pos);
        s.expected = v;
        el.scrollLeft = v;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [marquee, open]);

  const pauseForUser = () => {
    state.current.pausedUntil = Date.now() + RESUME_AFTER;
  };

  const onScroll = () => {
    const el = scroller.current;
    const list = firstCopy.current;
    if (!el || !list) return;
    const s = state.current;
    if (Math.abs(el.scrollLeft - s.expected) > 2) {
      // vom Nutzer gewischt → 5 s Pause, Position übernehmen (nahtlos über die Kopie hinweg)
      const half = list.offsetWidth + 12;
      if (marquee && el.scrollLeft >= half) {
        el.scrollLeft -= half;
      }
      s.pos = el.scrollLeft;
      s.expected = el.scrollLeft;
      pauseForUser();
      // sanftes Einrasten am nächsten Kreis, sobald das Wischen ausläuft (ohne CSS-Snap → kein Springen)
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
      snapTimer.current = window.setTimeout(() => {
        if (s.touching || !scroller.current) return;
        const step = 90; // 78 px Kreis + 12 px Abstand
        const target = Math.round(scroller.current.scrollLeft / step) * step;
        if (Math.abs(target - scroller.current.scrollLeft) > 2) scroller.current.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
      }, 160);
    }
  };

  const openGroup = useCallback((key: string, el: HTMLElement | null) => {
    haptic(12);
    const r = el?.getBoundingClientRect();
    setOpen({ key, origin: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 30 } });
    // Eintrag im Verlauf (gleiche URL), damit die Zurück-Taste die Story schließt – ohne Neuladen der Seite
    window.history.pushState({ ...(window.history.state ?? {}), tpStory: key }, "");
    storyEntry.current = true;
  }, []);

  const originFor = useCallback((key: string) => {
    const el = document.querySelector(`[data-story-key="${CSS.escape(key)}"] [data-avatar]`) as HTMLElement | null;
    const r = el?.getBoundingClientRect();
    if (!r || r.right < 0 || r.left > window.innerWidth) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  }, []);

  const close = useCallback((seen: Record<string, string[]>, loaded?: StoryGroupData[]) => {
    const byKey = new Map((loaded ?? []).map((g) => [g.key, g]));
    // geladene Kapitel-Portionen übernehmen; Kapitel gilt als erledigt, wenn alle Fragen der Portion gesehen wurden
    setGroups((gs) =>
      gs.map((g) => {
        const l = byKey.get(g.key);
        const slides = l && !l.slides.every((x) => x.kind === "loading") ? l.slides : g.slides;
        const seenIds = seen[g.key] ?? g.seenIds;
        const qa = slides.filter((x) => x.kind === "qa");
        const done = g.lazy ? g.done || (qa.length > 0 && qa.every((x) => seenIds.includes(x.id))) : g.done;
        return { ...g, slides, seenIds, done };
      }),
    );
    setOpen(null);
    state.current.pausedUntil = Date.now() + 1500;
    if (storyEntry.current) {
      storyEntry.current = false;
      window.history.back();
    }
  }, []);

  // Zurück-Taste schließt die Story
  useEffect(() => {
    const onPop = () => {
      if (storyEntry.current) {
        storyEntry.current = false;
        setCloseSignal((n) => n + 1); // Viewer schließt mit Animation und meldet „gesehen“
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!groups.length) return null;

  const item = (g: StoryGroupData, dup = false) => (
    <StoryCircle key={`${dup ? "d-" : ""}${g.key}`} g={g} dup={dup} seen={isGroupSeen(g)} isNew={g.type !== "kapitel" && isToday(g.createdAt, today)} hiddenWhileOpen={!dup && open?.key === g.key} onOpen={(el) => openGroup(g.key, el)} />
  );

  return (
    <section aria-label="Stories" className="-mx-4 sm:-mx-6 lg:mx-0" data-testid="story-row">
      <div
        ref={scroller}
        onScroll={onScroll}
        onPointerDown={() => {
          state.current.touching = true;
        }}
        onPointerUp={() => {
          state.current.touching = false;
          pauseForUser();
        }}
        onPointerCancel={() => {
          state.current.touching = false;
          pauseForUser();
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && (state.current.hover = true)}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") state.current.hover = false;
        }}
        className="no-scrollbar flex overflow-x-auto overscroll-x-contain px-4 py-1 sm:px-6 lg:px-0"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <ul ref={firstCopy} className="flex shrink-0 gap-3">
          {groups.map((g) => item(g))}
        </ul>
        {marquee && (
          <ul className="ml-3 flex shrink-0 gap-3" aria-hidden>
            {groups.map((g) => item(g, true))}
          </ul>
        )}
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>{open && <StoryViewer key="viewer" groups={groups} startKey={open.key} origin={open.origin} originFor={originFor} onClose={close} closeSignal={closeSignal} isAdmin={isAdmin} />}</AnimatePresence>,
          document.body,
        )}
    </section>
  );
}

/** Platzhalter, solange die Stories laden */
export function StoryRowSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 py-1 sm:-mx-6 sm:px-6" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex w-[78px] shrink-0 flex-col items-center gap-1.5">
          <span className="size-[74px] animate-pulse rounded-full bg-foreground/[0.07]" />
          <span className="h-2.5 w-12 animate-pulse rounded bg-foreground/[0.06]" />
        </div>
      ))}
    </div>
  );
}
