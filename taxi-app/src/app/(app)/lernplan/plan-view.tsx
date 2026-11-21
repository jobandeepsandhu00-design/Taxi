"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Bookmark, BookmarkCheck, CalendarDays, ChevronDown, Lock, Play, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { categoryColor, categoryIcon } from "@/components/category-style";
import { lessonStatusMeta, MiniBar, PlanRing, PlanSkeleton, questionStatusMeta, StatusDots, typeMeta, useLearnPlan, Crown } from "@/components/learn-plan/shared";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { fireConfetti } from "@/lib/confetti";
import type { LearnPlan, PlanLesson, PlanQuestion, PlanSection } from "@/lib/learn-plan-types";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getQuestionPreviewAction } from "@/server/actions/learn-plan";
import { startLessonAction, toggleBookmarkAction } from "@/server/actions/learning";

type Filter = "alle" | "neu" | "falsch" | "faellig" | "gemeistert";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "neu", label: "Neu" },
  { key: "falsch", label: "Falsch" },
  { key: "faellig", label: "Fällig" },
  { key: "gemeistert", label: "Gemeistert" },
];
const VIRTUALIZE_ABOVE = 200;
const MASTERED_KEY = "tp-plan-mastered";

const lessonKey = (sectionId: string, index: number) => `${sectionId}:${index}`;

function matches(q: PlanQuestion, filter: Filter, term: string) {
  if (filter === "neu" && q.status !== "neu") return false;
  if (filter === "falsch" && q.status !== "falsch") return false;
  if (filter === "faellig" && !q.faellig) return false;
  if (filter === "gemeistert" && q.status !== "gemeistert") return false;
  return !term || q.short_title.toLowerCase().includes(term);
}

function fmtDate(k: string) {
  return new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${k.slice(0, 10)}T00:00:00Z`));
}

export function PlanView({ initial, lockedHint }: { initial: LearnPlan; lockedHint: string | null }) {
  const { data, isLoading } = useLearnPlan(initial);
  const [filter, setFilter] = useState<Filter>("alle");
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(initial.next ? [initial.next.category_id] : []));
  const [openLessons, setOpenLessons] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [justMastered, setJustMastered] = useState<Set<string>>(new Set());
  const term = search.trim().toLowerCase();
  const filtering = filter !== "alle" || term.length > 0;

  const flat = useMemo(() => {
    if (!data || !filtering) return [];
    const out: { q: PlanQuestion; section: PlanSection; lesson: PlanLesson }[] = [];
    for (const s of data.sections) for (const l of s.lessons) for (const q of l.questions) if (matches(q, filter, term)) out.push({ q, section: s, lesson: l });
    return out;
  }, [data, filter, term, filtering]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }

  // Beim Öffnen: zur aktuellen (oder gesperrten) Lektion scrollen und hervorheben
  useEffect(() => {
    let target = initial.next ? lessonKey(initial.next.category_id, initial.next.lesson_index) : null;
    if (lockedHint && /^[^:]+:\d+$/.test(lockedHint)) {
      const [sid, idx] = lockedHint.split(":");
      target = lessonKey(sid, Number(idx));
      setOpenSections((s) => new Set(s).add(sid));
      showToast(`Schließe zuerst Lektion ${Number(idx) - 1} ab`);
    }
    if (!target) return;
    const key = target;
    const t = window.setTimeout(() => {
      document.getElementById(`lesson-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(key);
      window.setTimeout(() => setHighlight(null), 2400);
    }, 450);
    return () => window.clearTimeout(t);
  }, [initial.next, lockedHint]);

  // Lektion neu „gemeistert“ seit dem letzten Besuch → Konfetti + Abzeichen-Morph
  useEffect(() => {
    if (!data) return;
    const now = data.sections.flatMap((s) => s.lessons.filter((l) => l.status === "gemeistert").map((l) => lessonKey(s.id, l.index)));
    let before: string[] | null = null;
    try {
      const raw = localStorage.getItem(MASTERED_KEY);
      before = raw ? (JSON.parse(raw) as string[]) : null;
      localStorage.setItem(MASTERED_KEY, JSON.stringify(now));
    } catch {
      /* ignorieren */
    }
    if (!before) return;
    const fresh = now.filter((k) => !before!.includes(k));
    if (fresh.length) {
      setJustMastered(new Set(fresh));
      void fireConfetti({ particleCount: 110, spread: 90 });
    }
  }, [data]);

  if (isLoading || !data) return <PlanSkeleton rows={6} />;

  const t = data.totals;
  const g = data.goal;
  const toggleSet = (set: Set<string>, key: string) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-28">
      {/* Kopf */}
      <section className="glass rounded-3xl p-5" aria-label="Überblick">
        <div className="flex items-center gap-4">
          <PlanRing value={t.progress} size={104} label={`Lernplan zu ${t.progress} % geschafft`} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-navy sm:text-3xl">Dein Lernplan</h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="plan-goal">
              Noch {g.remaining_lessons} {g.remaining_lessons === 1 ? "Lektion" : "Lektionen"} · ca. {g.per_day} pro Tag
              {g.exam_date ? ` bis ${fmtDate(g.exam_date)}` : ""}
            </p>
            {!g.exam_date && (
              <Link href="/profil" className="mt-1 inline-flex min-h-9 items-center text-xs font-semibold text-link hover:underline">
                Prüfungstermin festlegen →
              </Link>
            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Neu", value: t.neu, cls: "text-navy" },
            { label: "Falsch", value: t.falsch, cls: "text-destructive" },
            { label: "Fällig", value: t.faellig, cls: "text-warning" },
            { label: "Gemeistert", value: t.gemeistert, cls: "text-success" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-muted px-1 py-2">
              <dd className={cn("font-display text-xl font-bold tabular", k.cls)}>
                <AnimatedNumber value={k.value} />
              </dd>
              <dt className="text-[11px] text-muted-foreground">{k.label}</dt>
            </div>
          ))}
        </dl>
        <Link href="/lernplan/kalender" className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-link hover:underline">
          <CalendarDays className="size-3.5" /> Lernkalender bis zur Prüfung
        </Link>
      </section>

      {/* Filter + Suche */}
      <div className="space-y-3">
        <LayoutGroup id="plan-filter">
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="radiogroup" aria-label="Filter">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => {
                  haptic(6);
                  setFilter(f.key);
                }}
                className={cn("relative min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors", filter === f.key ? "text-primary-foreground" : "bg-muted text-foreground/80 hover:text-foreground")}
              >
                {filter === f.key && <motion.span layoutId="plan-filter-pill" className="absolute inset-0 rounded-full bg-primary" transition={spring} />}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <label className="glass flex min-h-12 items-center gap-2 rounded-2xl px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Fragen durchsuchen …" aria-label="Fragen durchsuchen" className="h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="flex size-9 items-center justify-center rounded-lg hover:bg-accent" aria-label="Suche löschen">
              <X className="size-4" />
            </button>
          )}
        </label>
        {filtering && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {flat.length} {flat.length === 1 ? "Frage" : "Fragen"} gefunden
          </p>
        )}
      </div>

      {/* Liste */}
      {filtering && flat.length > VIRTUALIZE_ABOVE ? (
        <VirtualQuestionList items={flat} onOpen={setPreview} />
      ) : (
        <div className="space-y-3">
          {data.sections.map((s, si) => {
            const lessons = filtering ? s.lessons.filter((l) => l.questions.some((q) => matches(q, filter, term))) : s.lessons;
            if (filtering && lessons.length === 0) return null;
            const open = filtering || openSections.has(s.id);
            const Icon = categoryIcon(s.icon);
            const color = categoryColor(s.color).hex;
            return (
              <motion.section key={s.id} layout className="glass overflow-hidden rounded-2xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: Math.min(si, 8) * 0.04 }}>
                <button type="button" onClick={() => setOpenSections((o) => toggleSet(o, s.id))} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 p-3 text-left">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-bold text-navy">{s.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular">{s.progress} %</span>
                    </span>
                    <span className="mt-1.5 block">
                      <MiniBar value={s.progress} color={color} />
                    </span>
                  </span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
                    <ChevronDown className="size-5 text-muted-foreground" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ul
                      key="lessons"
                      className="space-y-2 px-3 pb-3"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring}
                      aria-label={`Lektionen ${s.name}`}
                    >
                      {lessons.map((l, li) => {
                        const key = lessonKey(s.id, l.index);
                        const qs = filtering ? l.questions.filter((q) => matches(q, filter, term)) : l.questions;
                        return (
                          <LessonRow
                            key={key}
                            id={`lesson-${key}`}
                            section={s}
                            lesson={l}
                            questions={qs}
                            delay={li * 0.04}
                            open={filtering || openLessons.has(key)}
                            highlighted={highlight === key}
                            justMastered={justMastered.has(key)}
                            onToggle={() => setOpenLessons((o) => toggleSet(o, key))}
                            onLocked={() => showToast(`Schließe zuerst Lektion ${l.index - 1} ab`)}
                            onOpenQuestion={setPreview}
                          />
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </div>
      )}

      {/* Nächster Schritt */}
      {data.next && (
        <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 px-4 lg:bottom-6 lg:left-72">
          <form action={startLessonAction} className="mx-auto max-w-3xl">
            <input type="hidden" name="categoryId" value={data.next.category_id} />
            <input type="hidden" name="lessonIndex" value={data.next.lesson_index} />
            <Button type="submit" size="lg" className="w-full shadow-[0_12px_40px_-12px_var(--glow)]" data-testid="next-step">
              <Play /> Nächster Schritt: Lektion {data.next.lesson_index} starten
            </Button>
          </form>
        </div>
      )}

      <QuestionSheet id={preview} onClose={() => setPreview(null)} />

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="fixed inset-x-4 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-xl lg:bottom-24"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={spring}
          >
            <Lock className="size-4 shrink-0" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LessonRow({
  id,
  section,
  lesson,
  questions,
  delay,
  open,
  highlighted,
  justMastered,
  onToggle,
  onLocked,
  onOpenQuestion,
}: {
  id: string;
  section: PlanSection;
  lesson: PlanLesson;
  questions: PlanQuestion[];
  delay: number;
  open: boolean;
  highlighted: boolean;
  justMastered: boolean;
  onToggle: () => void;
  onLocked: () => void;
  onOpenQuestion: (id: string) => void;
}) {
  const locked = lesson.status === "gesperrt";
  const meta = lessonStatusMeta[lesson.status];
  return (
    <motion.li
      id={id}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay }}
      className={cn("scroll-mt-24 rounded-2xl border-2 bg-card transition-shadow", highlighted ? "border-primary shadow-[0_0_0_4px_var(--glow)]" : "border-border")}
      data-testid="lesson-row"
    >
      <div className="flex items-center gap-2 p-2">
        <form
          action={locked ? undefined : startLessonAction}
          onSubmit={(e) => {
            if (locked) {
              e.preventDefault();
              haptic(20);
              onLocked();
            }
          }}
          className="min-w-0 flex-1"
        >
          <input type="hidden" name="categoryId" value={section.id} />
          <input type="hidden" name="lessonIndex" value={lesson.index} />
          <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-1 text-left" aria-label={`Lektion ${lesson.index} ${locked ? "– gesperrt" : "starten"} (${meta.label})`}>
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", locked ? "bg-muted text-muted-foreground" : "bg-primary/12 text-link")}>
              {locked ? <Lock className="size-4" /> : lesson.status === "gemeistert" ? <Crown className="size-4 text-success" /> : <Play className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-navy">Lektion {lesson.index}</span>
                <motion.span
                  key={lesson.status}
                  className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", meta.cls)}
                  initial={justMastered ? { scale: 0.3, rotate: -20 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 14 }}
                >
                  {meta.label}
                </motion.span>
                {lesson.in_today_plan && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Heute</span>}
              </span>
              <StatusDots questions={lesson.questions} className="mt-1.5" />
            </span>
          </button>
        </form>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Fragen von Lektion ${lesson.index} ${open ? "ausblenden" : "anzeigen"}`} className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-accent">
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
            <ChevronDown className="size-5 text-muted-foreground" />
          </motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul key="q" className="overflow-hidden border-t border-border px-2" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
            {questions.map((q, i) => (
              <motion.li key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
                <QuestionRow q={q} onOpen={onOpenQuestion} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function QuestionRow({ q, onOpen, context }: { q: PlanQuestion; onOpen: (id: string) => void; context?: string }) {
  const s = questionStatusMeta[q.status];
  const T = typeMeta[q.type];
  return (
    <button type="button" onClick={() => onOpen(q.id)} className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-1 py-2 text-left hover:bg-accent/60" aria-label={`${q.short_title} – ${s.label}${q.faellig ? ", fällig" : ""}`}>
      <s.icon className={cn("size-4 shrink-0", s.text)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm text-foreground">{q.short_title}</span>
        {context && <span className="block truncate text-[11px] text-muted-foreground">{context}</span>}
      </span>
      {q.faellig && <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">Fällig</span>}
      <T.icon className="size-3.5 shrink-0 text-muted-foreground" aria-label={T.label} />
    </button>
  );
}

/** Viele Treffer (> 200): nur sichtbare Zeilen rendern. */
function VirtualQuestionList({ items, onOpen }: { items: { q: PlanQuestion; section: PlanSection; lesson: PlanLesson }[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(ref.current?.offsetTop ?? 0), []);
  const v = useWindowVirtualizer({ count: items.length, estimateSize: () => 60, overscan: 8, scrollMargin: offset });
  return (
    <div ref={ref} className="glass rounded-2xl p-2" data-testid="virtual-list">
      <div style={{ height: v.getTotalSize(), position: "relative" }}>
        {v.getVirtualItems().map((row) => {
          const it = items[row.index];
          return (
            <div key={it.q.id} style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${row.start - v.options.scrollMargin}px)` }}>
              <QuestionRow q={it.q} onOpen={onOpen} context={`${it.section.name} · Lektion ${it.lesson.index}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Bottom-Sheet: Frage in voller Länge, letzte Antwort, Erklärung, „Jetzt üben“ / „Merken“. */
function QuestionSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["question-preview", id], queryFn: () => getQuestionPreviewAction(id!), enabled: Boolean(id) });
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  useEffect(() => setBookmarked(null), [id]);
  const marked = bookmarked ?? data?.bookmarked ?? false;
  useEffect(() => {
    if (!id) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [id, onClose]);
  return (
    <AnimatePresence>
      {id && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Frage ansehen">
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="pb-safe relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => i.offset.y > 120 && onClose()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/15" aria-hidden />
            <button type="button" onClick={onClose} className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-xl hover:bg-accent" aria-label="Vorschau schließen">
              <X className="size-5" />
            </button>
            {isLoading || !data ? (
              <div className="space-y-2 pt-2">
                <div className="skeleton h-5 w-11/12" />
                <div className="skeleton h-5 w-8/12" />
                <div className="skeleton h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-4" data-testid="question-sheet">
                <p className="text-xs font-bold tracking-wider text-link uppercase">{data.category}</p>
                <p className="pr-8 text-lg leading-relaxed font-bold text-navy">{data.text}</p>
                <ul className="space-y-1.5">
                  {data.options.map((o) => (
                    <li key={o.label} className={cn("flex gap-2 rounded-xl border px-3 py-2 text-sm", o.isCorrect ? "border-success/50 bg-success/8" : data.lastAnswer?.labels.includes(o.label) ? "border-destructive/40 bg-destructive/6" : "border-border")}>
                      <strong>{o.label})</strong>
                      <span className="flex-1 whitespace-pre-line">{o.text}</span>
                      {o.isCorrect && <span className="text-xs font-bold text-success">richtig</span>}
                    </li>
                  ))}
                </ul>
                {data.lastAnswer ? (
                  <p className={cn("text-sm font-semibold", data.lastAnswer.correct ? "text-success" : "text-destructive")}>
                    Letzte Antwort ({new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "short" }).format(new Date(data.lastAnswer.at))}): {data.lastAnswer.labels.join(", ") || "–"} – {data.lastAnswer.correct ? "richtig" : "falsch"}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Noch nicht beantwortet – die Lösung siehst du nach dem Üben.</p>
                )}
                {data.explanation && (
                  <div className="rounded-2xl bg-muted p-3 text-sm leading-relaxed">
                    <p className="mb-1 text-xs font-bold text-navy">Erklärung</p>
                    {data.explanation}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild size="lg">
                    <Link href={`/fragen/${data.id}`}>
                      <Play /> Jetzt üben
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    aria-pressed={marked}
                    onClick={async () => {
                      haptic();
                      setBookmarked(!marked);
                      const r = await toggleBookmarkAction(data.id).catch(() => null);
                      if (r && r.ok) setBookmarked(r.data.bookmarked);
                    }}
                  >
                    {marked ? <BookmarkCheck /> : <Bookmark />} {marked ? "Gemerkt" : "Merken"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
