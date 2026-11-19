"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, ChevronDown, ClipboardCheck, Layers, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";

const ACTION_ICONS: Record<string, LucideIcon> = { BarChart3, BookOpen, ClipboardCheck, Layers, RotateCcw, Sparkles };
import { useState } from "react";
import { categoryIcon } from "@/components/category-style";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ACHIEVEMENTS, levelFor, LEVELS } from "@/lib/gamification";
import { haptic, itemVariants, listVariants, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { startPracticeQuizAction } from "@/server/actions/learning";

/* ── Serie: animierte Flamme, wächst mit der Serienlänge ───────────── */
export function StreakFlame({ streak, longest }: { streak: number; longest: number }) {
  const scale = 0.75 + Math.min(streak, 30) / 30;
  const lit = streak > 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-20 shrink-0 items-end justify-center" aria-hidden>
        {lit && <motion.div className="absolute bottom-1 size-14 rounded-full bg-orange-500/40 blur-xl" animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }} />}
        <motion.svg
          viewBox="0 0 40 52"
          className="relative w-12 origin-bottom"
          initial={{ scale: 0 }}
          animate={lit ? { scale: [scale, scale * 1.05, scale * 0.97, scale], rotate: [0, -2, 2, 0] } : { scale: 0.8 }}
          transition={lit ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : spring}
        >
          <defs>
            <linearGradient id="flame-outer" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={lit ? "#e3000f" : "#475569"} />
              <stop offset="1" stopColor={lit ? "#ff8a00" : "#64748b"} />
            </linearGradient>
          </defs>
          <path d="M20 2 C26 14 36 20 36 33 A16 16 0 0 1 4 33 C4 24 10 20 12 12 C15 18 18 19 20 2 Z" fill="url(#flame-outer)" />
          <path d="M20 22 C24 29 29 32 29 38 A9 9 0 0 1 11 38 C11 33 15 31 16 26 C18 30 19 30 20 22 Z" fill={lit ? "#ffc400" : "#94a3b8"} />
        </motion.svg>
      </div>
      <div>
        <p className="font-display text-3xl font-bold text-navy">
          <AnimatedNumber value={streak} /> <span className="text-base font-semibold text-muted-foreground">{streak === 1 ? "Tag" : "Tage"}</span>
        </p>
        <p className="text-sm text-muted-foreground">{lit ? `Serie läuft – Rekord: ${longest} Tage` : "Lerne heute, um deine Serie zu starten 🔥"}</p>
      </div>
    </div>
  );
}

/* ── XP & Level ─────────────────────────────────────────────────────── */
export function XpCard({ xp }: { xp: number }) {
  const lvl = levelFor(xp);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold tracking-wider text-link uppercase">
          Level {lvl.index + 1} / {LEVELS.length}
        </p>
        <p className="font-display text-sm font-bold text-navy">
          <AnimatedNumber value={xp} /> XP
        </p>
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-navy">{lvl.name}</p>
      <Progress value={lvl.progress * 100} className="mt-3 h-2.5" />
      <p className="mt-2 text-xs text-muted-foreground">{lvl.next ? `Noch ${lvl.xpToNext.toLocaleString("de-AT")} XP bis „${lvl.next.name}“` : "Höchstes Level erreicht – du bist eine Legende!"}</p>
    </div>
  );
}

/* ── Schnellstart: horizontales Snap-Karussell mit 3D-Tilt ─────────── */
function TiltCard({ href, label, desc, icon }: { href: string; label: string; desc: string; icon: string }) {
  const Icon = ACTION_ICONS[icon] ?? Sparkles;
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 18 });
  return (
    <motion.div variants={itemVariants} className="w-[44%] shrink-0 snap-start sm:w-auto [perspective:700px]">
      <motion.div
        style={{ rotateX: rx, rotateY: ry }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        whileTap={{ scale: 0.96 }}
      >
        <Link href={href} onClick={() => haptic()} className="glass glow-hover group relative block h-full rounded-2xl p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-link">
            <Icon className="size-6" />
          </span>
          <p className="mt-4 font-display leading-tight font-bold text-navy">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
          <ArrowRight className="absolute top-4 right-4 size-4 text-link opacity-0 transition group-hover:opacity-100" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function QuickActions({ actions }: { actions: { href: string; label: string; desc: string; icon: string }[] }) {
  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6"
    >
      {actions.map((a) => (
        <TiltCard key={a.href} {...a} />
      ))}
    </motion.div>
  );
}

/* ── Duotone-Kategorie-Icon (gelb + weiß) ───────────────────────────── */
export function DuotoneIcon({ name, color }: { name: string; color: string }) {
  const Icon = categoryIcon(name);
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f` }}>
      <Icon className="absolute size-6 translate-x-[1.5px] translate-y-[1.5px]" style={{ color }} strokeWidth={3} opacity={0.55} aria-hidden />
      <Icon className="relative size-6 text-navy" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export interface HomeCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  hex: string;
  progress: number;
  accuracy: number | null;
  answered: number;
  questionCount: number;
  mastered: number;
}

/* ── Kategorien: Fortschrittsbalken, Tippen klappt Details auf ─────── */
export function CategoryList({ categories }: { categories: HomeCategory[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <motion.ul variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {categories.map((c) => {
        const expanded = open === c.id;
        return (
          <motion.li
            key={c.id}
            variants={itemVariants}
            layout
            transition={spring}
            style={{ "--cat": c.hex } as React.CSSProperties}
            className={cn("glass overflow-hidden rounded-2xl", expanded && "border-primary/40 sm:col-span-2")}
          >
            <motion.button
              layout="position"
              type="button"
              onClick={() => {
                haptic();
                setOpen(expanded ? null : c.id);
              }}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <DuotoneIcon name={c.icon} color={c.hex} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-navy">{c.name}</span>
                <Progress value={c.progress} className="mt-2 h-1.5" barClassName="bg-[var(--cat)]" />
              </span>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">{c.progress}%</span>
              <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                <ChevronDown className="size-4 text-muted-foreground" />
              </motion.span>
            </motion.button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring}>
                  <div className="grid grid-cols-3 gap-2 px-3.5">
                    {[
                      { l: "Gemeistert", v: c.mastered, s: ` / ${c.questionCount}` },
                      { l: "Beantwortet", v: c.answered, s: "" },
                      { l: "Trefferquote", v: c.accuracy ?? 0, s: c.accuracy === null ? "" : " %" },
                    ].map((k) => (
                      <div key={k.l} className="rounded-xl bg-muted p-2.5 text-center">
                        <p className="font-display text-lg font-bold text-navy">
                          {k.l === "Trefferquote" && c.accuracy === null ? "–" : <AnimatedNumber value={k.v} />}
                          <span className="text-xs text-muted-foreground">{k.s}</span>
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground">{k.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 p-3.5">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/lernen/${c.slug}`}>Lernen</Link>
                    </Button>
                    <form action={startPracticeQuizAction} className="flex-1">
                      <input type="hidden" name="count" value="10" />
                      <input type="hidden" name="categoryIds" value={c.id} />
                      <Button type="submit" size="sm" variant="outline" className="w-full">
                        10er-Quiz
                      </Button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

/* ── Abzeichen ─────────────────────────────────────────────────────── */
export function AchievementStrip({ unlocked }: { unlocked: string[] }) {
  return (
    <motion.ul variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {ACHIEVEMENTS.map((a) => {
        const has = unlocked.includes(a.key);
        return (
          <motion.li
            key={a.key}
            variants={itemVariants}
            whileHover={has ? { y: -4, rotate: -2 } : undefined}
            className={cn("glass flex flex-col items-center rounded-2xl p-3 text-center", has ? "border-primary/40" : "opacity-55")}
            title={a.desc}
          >
            <span className={cn("text-3xl", !has && "grayscale")} aria-hidden>
              {has ? a.emoji : "🔒"}
            </span>
            <span className="mt-1.5 text-[11px] leading-tight font-bold text-navy">{a.title}</span>
            <span className="sr-only">{has ? "freigeschaltet" : "noch gesperrt"}: {a.desc}</span>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

/* ── Freundlicher Null-Zustand ─────────────────────────────────────── */
export function ZeroState({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <motion.span className="text-4xl" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.2 }} aria-hidden>
        {emoji}
      </motion.span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-navy">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
