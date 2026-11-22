"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, BarChart3, Lightbulb, Loader2, Scale, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { CoachAvatar, type CoachMood as AvatarMood } from "@/components/coach/coach-avatar";
import { DailyPlanCard, type PlanItemView } from "@/components/home/coach-cards";
import { Progress } from "@/components/ui/progress";
import type { CoachInsight, CoachMood } from "@/lib/coach/rules";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { askToniAction, type ToniAnswer } from "@/server/actions/smart-coach";

type Weakness = { slug: string; name: string; accuracy: number | null; mastered: number; attempts: number };

const QUICK = ["Was soll ich heute lernen?", "Wie stehe ich?", "Meine Schwächen", "Prüfungstipps", "Wichtige Zahlen"];

export function avatarMood(m: CoachMood | undefined): AvatarMood {
  if (m === "celebrate" || m === "happy") return "happy";
  if (m === "concerned") return "sad";
  return "idle";
}

const fmtDate = (d: string) => new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00Z`));

export function CoachScreen({
  name,
  insights,
  plan,
  weaknesses,
  history,
  readyDate,
  enoughData,
  examDate,
}: {
  name: string;
  insights: CoachInsight[];
  plan: PlanItemView[];
  weaknesses: Weakness[];
  history: { day: string; score: number }[];
  readyDate: string | null;
  enoughData: boolean;
  examDate: string | null;
}) {
  const top = insights[0];
  return (
    <div className="space-y-6 pb-4">
      <ToniHero name={name} insight={top} />
      {insights.length > 1 && (
        <section aria-label="Weitere Hinweise" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {insights.slice(1, 4).map((i, k) => (
            <motion.div key={i.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.3 + k * 0.07 }} className="glass rounded-2xl p-4" data-testid="coach-insight">
              <p className="text-sm font-bold text-navy">{i.title_de}</p>
              <p className="mt-1 text-xs text-muted-foreground">{i.text_de}</p>
              {i.action && (
                <Link href={i.action.route} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-link">
                  {i.action.label} <ArrowRight className="size-3" />
                </Link>
              )}
            </motion.div>
          ))}
        </section>
      )}

      <AskToni />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <DailyPlanCard items={plan} />
        </div>
        <div className="min-w-0">
          <WeaknessCard items={weaknesses} />
        </div>
      </div>

      <PrognosisCard history={history} readyDate={readyDate} enoughData={enoughData} examDate={examDate} />

      <Link href="/coach/bericht" className="glass glow-hover flex items-center gap-3 rounded-2xl p-4" data-testid="coach-weekly">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <BarChart3 className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-navy">Wochenbericht</span>
          <span className="block text-xs text-muted-foreground">Deine Woche in Zahlen – Stärken, Schwächen, nächste Schritte</span>
        </span>
        <ArrowRight className="size-5 text-muted-foreground" />
      </Link>
    </div>
  );
}

/** Toni + Sprechblase mit Tipp-Animation */
function ToniHero({ name, insight }: { name: string; insight: CoachInsight | undefined }) {
  const reduce = useReducedMotion();
  const text = insight ? insight.text_de : `Servus ${name}! Schön, dass du da bist.`;
  const [shown, setShown] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setShown(text.length);
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= text.length ? (window.clearInterval(id), n) : n + 2)), 18);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  const mood = avatarMood(insight?.mood);
  return (
    <section className="flex items-end gap-3 sm:gap-5" aria-label="Toni" data-testid="coach-hero" data-mood={insight?.mood ?? "neutral"}>
      <motion.div className="relative shrink-0" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
        <CoachAvatar mood={mood} size={92} />
        {insight?.mood === "celebrate" && !reduce && (
          <motion.span className="absolute -top-2 -right-1 text-2xl" initial={{ scale: 0, rotate: -30 }} animate={{ scale: [0, 1.3, 1], rotate: 0 }} transition={{ duration: 0.6, delay: 0.3 }} aria-hidden>
            🎉
          </motion.span>
        )}
      </motion.div>
      <motion.div className="glass relative mb-2 min-w-0 flex-1 rounded-3xl rounded-bl-md p-4 sm:p-5" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 }}>
        <p className="text-xs font-bold tracking-wider text-link uppercase">Toni sagt</p>
        {insight && <p className="mt-1 text-lg leading-snug font-extrabold text-navy">{insight.title_de}</p>}
        <p className="mt-1 min-h-[3em] text-[15px] leading-relaxed" aria-live="polite" aria-label={text}>
          <span aria-hidden>{text.slice(0, shown)}</span>
          {shown < text.length && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" aria-hidden />}
        </p>
        {insight?.action && (
          <Link href={insight.action.route} onClick={() => haptic()} className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground active:scale-[0.98]" data-testid="coach-hero-action">
            {insight.action.label} <ArrowRight className="size-4" />
          </Link>
        )}
      </motion.div>
    </section>
  );
}

function WeaknessCard({ items }: { items: Weakness[] }) {
  return (
    <section className="glass rounded-2xl p-5" data-testid="coach-weaknesses">
      <p className="text-xs font-bold tracking-wider text-link uppercase">Deine Schwächen</p>
      <p className="mb-4 text-sm text-muted-foreground">Hier lohnt sich Üben am meisten</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Daten – beantworte ein paar Fragen.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((w) => {
            const value = w.accuracy ?? w.mastered;
            return (
              <li key={w.slug}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-semibold text-navy">{w.name}</span>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">{w.accuracy !== null ? `${w.accuracy} % richtig` : `${w.mastered} % gemeistert`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={value} className="h-2.5 flex-1" barClassName={value < 50 ? "bg-destructive" : value < 75 ? "bg-warning" : "bg-success"} />
                  <Link href={`/lernen/${w.slug}`} className="inline-flex h-9 items-center rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground active:scale-95">
                    Üben
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PrognosisCard({ history, readyDate, enoughData, examDate }: { history: { day: string; score: number }[]; readyDate: string | null; enoughData: boolean; examDate: string | null }) {
  const reduce = useReducedMotion();
  const w = 300;
  const h = 90;
  const pts = history.map((p, i) => [history.length > 1 ? (i / (history.length - 1)) * w : w / 2, h - (p.score / 100) * h] as const);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = history[history.length - 1]?.score ?? null;
  const late = readyDate && examDate && readyDate > examDate;
  return (
    <section className="glass rounded-2xl p-5" data-testid="coach-prognosis">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-wider text-link uppercase">Prognose</p>
          <p className="text-sm text-muted-foreground">Prüfungsreife der letzten 14 Tage</p>
        </div>
        {last !== null && <span className="text-2xl font-extrabold text-navy">{last}</span>}
      </div>
      {enoughData ? (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full overflow-visible" role="img" aria-label="Verlauf der Prüfungsreife">
            <line x1={0} x2={w} y1={h - 0.85 * h} y2={h - 0.85 * h} stroke="currentColor" strokeDasharray="4 4" className="text-success/50" />
            <motion.path d={path} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} />
          </svg>
          <p className={cn("mt-2 flex items-center gap-2 text-sm font-semibold", late ? "text-warning" : "text-navy")} data-testid="coach-ready-date">
            <TrendingUp className="size-4" />
            {readyDate ? <>Prüfungsbereit voraussichtlich am {fmtDate(readyDate)}{late ? " – nach deinem Prüfungstermin. Etwas mehr Tempo hilft!" : "."}</> : "Noch kein Aufwärtstrend erkennbar – regelmäßiges Lernen bringt die Kurve nach oben."}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Die Prognose erscheint ab 5 Lerntagen. Bleib dran!</p>
      )}
    </section>
  );
}

/** Text mit <<Hervorhebung>> aus ts_headline */
function Highlight({ text }: { text: string }) {
  const parts = text.split(/(<<.*?>>)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("<<") ? (
          <mark key={i} className="rounded bg-primary/25 px-0.5 text-inherit">
            {p.slice(2, -2)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function AskToni() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<ToniAnswer | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    haptic();
    setQ(t);
    start(async () => setAnswer(await askToniAction(t)));
  };
  return (
    <section className="glass rounded-2xl p-5" aria-label="Frag Toni" data-testid="ask-toni">
      <p className="text-xs font-bold tracking-wider text-link uppercase">Frag Toni</p>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        role="search"
      >
        <label className="sr-only" htmlFor="toni-q">
          Deine Frage an Toni
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="toni-q"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="z. B. Was ist ein Schutzweg?"
            className="h-12 w-full rounded-xl border border-border bg-background/70 pr-9 pl-9 text-[15px] outline-none focus:border-primary"
            maxLength={200}
            enterKeyHint="search"
            data-testid="toni-input"
          />
          {q && (
            <button type="button" onClick={() => (setQ(""), setAnswer(null), inputRef.current?.focus())} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted-foreground" aria-label="Eingabe löschen">
              <X className="size-4" />
            </button>
          )}
        </div>
        <button type="submit" disabled={pending || !q.trim()} className="inline-flex h-12 items-center gap-1.5 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50" data-testid="toni-ask">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          <span className="hidden sm:inline">Fragen</span>
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((c) => (
          <button key={c} type="button" onClick={() => ask(c)} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:border-primary active:scale-95" data-testid="toni-chip">
            {c}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {answer && !pending && (
          <motion.div key={answer.query} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={spring} className="mt-4" data-testid="toni-answer" aria-live="polite">
            {answer.type === "info" ? <InfoAnswer a={answer} /> : <SearchAnswer a={answer} onAsk={ask} />}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function InfoAnswer({ a }: { a: Extract<ToniAnswer, { type: "info" }> }) {
  return (
    <div className="rounded-2xl bg-foreground/5 p-4">
      <p className="font-extrabold text-navy">{a.title}</p>
      <p className="mt-1 text-sm">{a.text}</p>
      {a.items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {a.items.map((it, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: i * 0.05 }} className="rounded-xl bg-background/70 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-navy">{it.label}</span>
                {it.route && (
                  <Link href={it.route} className="shrink-0 text-xs font-bold text-link">
                    Öffnen →
                  </Link>
                )}
              </div>
              {it.value && <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{it.value}</p>}
            </motion.li>
          ))}
        </ul>
      )}
      {a.action && (
        <Link href={a.action.route} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
          {a.action.label} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function SearchAnswer({ a, onAsk }: { a: Extract<ToniAnswer, { type: "search" }>; onAsk: (q: string) => void }) {
  if (!a.best && !a.aiText && a.faqs.length === 0) {
    return (
      <div className="rounded-2xl bg-foreground/5 p-4" data-testid="toni-empty">
        <div className="flex items-center gap-3">
          <CoachAvatar mood="thinking" size={40} />
          <p className="text-sm">Dazu habe ich nichts gefunden. Versuch andere Wörter oder schau im Lernbuch nach.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {a.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onAsk(s)} className="rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-navy">
              {s}
            </button>
          ))}
          <Link href="/lernbuch" className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            Zum Lernbuch
          </Link>
        </div>
      </div>
    );
  }
  const b = a.best;
  return (
    <div className="space-y-3">
      {b && (
        <article className="rounded-2xl border border-primary/30 bg-primary/5 p-4" data-testid="toni-best">
          {b.chapter && <p className="text-[11px] font-bold tracking-wider text-link uppercase">{b.kind === "faq" ? `FAQ · ${b.chapter}` : b.chapter}</p>}
          <h3 className="mt-0.5 text-lg leading-snug font-extrabold text-navy">{b.title}</h3>
          {b.answer && (
            <div className="mt-2 rounded-xl border border-success/40 bg-success/10 p-3">
              <p className="mb-0.5 text-[11px] font-bold tracking-wide text-success uppercase">{b.kind === "faq" ? "Antwort" : b.kind === "chapter" ? "Kapitel" : "Richtige Antwort"}</p>
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{b.answer}</p>
            </div>
          )}
          {b.explanation && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{b.explanation}</p>}
          {b.mnemonic && (
            <p className="mt-2 flex gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              <Lightbulb className="size-4 shrink-0" /> {b.mnemonic}
            </p>
          )}
          {b.legal && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Scale className="size-3.5" /> {b.legal}
            </p>
          )}
          {b.route && (
            <Link href={b.route} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-link">
              Öffnen <ArrowRight className="size-4" />
            </Link>
          )}
        </article>
      )}
      {a.aiText && <div className="rounded-2xl bg-foreground/5 p-4 text-sm">{a.aiText}</div>}
      {a.similar.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-muted-foreground">Ähnliche Fragen</p>
          <div className="flex flex-wrap gap-2">
            {a.similar.map((s) => (
              <button key={s.query} type="button" onClick={() => onAsk(s.query)} className="rounded-full border border-border px-3 py-1.5 text-left text-xs font-semibold text-navy hover:border-primary" data-testid="toni-similar">
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}
      {a.faqs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground">Aus den FAQ</p>
          {a.faqs.map((f) => (
            <div key={f.title} className="rounded-xl bg-foreground/5 p-3 text-sm">
              <p className="font-semibold text-navy">{f.title}</p>
              <p className="mt-0.5 text-muted-foreground">
                <Highlight text={f.answer} />
              </p>
              {f.route && (
                <Link href={f.route} className="mt-1 inline-block text-xs font-bold text-link">
                  Mehr →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
