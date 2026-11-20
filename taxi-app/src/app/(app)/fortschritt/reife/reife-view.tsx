"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Calculator, Play, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReadinessRing } from "@/components/home/rings";
import { SubmitButton } from "@/components/ui/submit-button";
import { CAP_SCORE, CATEGORY_MIN, READINESS_WEIGHTS, READY_SCORE, type ReadinessResult } from "@/lib/readiness";
import { spring } from "@/lib/motion";
import { startLessonAction } from "@/server/actions/learning";

const factorInfo = [
  { key: "coverage", label: "Abdeckung", desc: "Fragen mindestens einmal gesehen" },
  { key: "mastery", label: "Beherrschung", desc: "Fragen im Karteikasten-Fach 4 oder 5" },
  { key: "accuracy", label: "Trefferquote", desc: "richtig unter deinen letzten 100 Antworten" },
  { key: "exam", label: "Prüfungen", desc: "Schnitt der letzten 3 Simulationen" },
] as const;

function fmt(k: string, long = false) {
  return new Intl.DateTimeFormat("de-AT", long ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${k}T00:00:00Z`));
}

export function ReifeView({ readiness, trend, projection }: { readiness: ReadinessResult; trend: { day: string; score: number }[]; projection: { date: string | null; enoughData: boolean } }) {
  const [explain, setExplain] = useState(false);
  const weakest = readiness.categories.slice(0, 3);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/fortschritt" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-navy">
        <ArrowLeft className="size-4" /> Fortschritt
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold text-navy">Prüfungsreife</h1>
        <button type="button" onClick={() => setExplain(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-link hover:bg-accent">
          <Calculator className="size-4" /> Wie wird das berechnet?
        </button>
      </div>

      <div className="glass flex flex-col items-center gap-2 rounded-3xl p-6">
        <ReadinessRing score={readiness.score} label={readiness.label} level={readiness.level} />
        {readiness.capped && <p className="max-w-sm text-center text-xs text-warning">Gedeckelt bei {CAP_SCORE}: mindestens eine Kategorie liegt unter {CATEGORY_MIN} %.</p>}
        <p className="text-center text-sm text-muted-foreground" data-testid="readiness-prognosis">
          {readiness.score >= READY_SCORE
            ? "Du bist prüfungsbereit – halte das Niveau mit kurzen Wiederholungen."
            : !projection.enoughData
              ? "Für eine Prognose brauche ich mindestens 5 Lerntage mit Daten."
              : projection.date
                ? <>Bei deinem Tempo prüfungsbereit am <strong className="text-navy">{fmt(projection.date, true)}</strong></>
                : "Bei deinem aktuellen Tempo ist noch kein Datum absehbar – ein paar Lektionen mehr pro Woche helfen."}
        </p>
      </div>

      <section className="glass rounded-3xl p-5" aria-label="Aufschlüsselung">
        <h2 className="mb-4 font-bold text-navy">Woraus sich der Wert zusammensetzt</h2>
        <ul className="space-y-4">
          {factorInfo.map((f, i) => {
            const v = Math.round(readiness.factors[f.key] * 100);
            return (
              <li key={f.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-navy">
                    {f.label} <span className="text-xs font-normal text-muted-foreground">· {Math.round(READINESS_WEIGHTS[f.key] * 100)} %</span>
                  </span>
                  <span className="font-display font-bold text-navy tabular">{v} %</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full rounded-full" style={{ background: "var(--theme-gradient)" }} initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.08 }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="glass rounded-3xl p-5" aria-label="Was dir noch fehlt">
        <h2 className="mb-3 font-bold text-navy">Was dir noch fehlt</h2>
        {weakest.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Kategorien mit Fragen.</p>
        ) : (
          <ul className="space-y-2">
            {weakest.map((c, i) => (
              <motion.li key={c.id} className="flex items-center gap-3 rounded-2xl bg-muted p-3" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.08 }}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card font-display text-sm font-bold text-navy">{c.score}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c.score < CATEGORY_MIN ? `unter ${CATEGORY_MIN} % – deckelt deinen Wert` : "ausbaufähig"}</span>
                </span>
                <form action={startLessonAction}>
                  <input type="hidden" name="categoryId" value={c.id} />
                  <SubmitButton size="sm">
                    <Play /> Lektion starten
                  </SubmitButton>
                </form>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-3xl p-5" aria-label="Verlauf">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-navy">
          <TrendingUp className="size-5 text-link" /> Verlauf (14 Tage)
        </h2>
        {trend.length < 2 ? (
          <p className="text-sm text-muted-foreground">Der Verlauf erscheint, sobald du an mindestens zwei Tagen gelernt hast.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend.map((t) => ({ ...t, label: fmt(t.day) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <ReferenceLine y={READY_SCORE} stroke="var(--success)" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 }} formatter={(v) => [v, "Prüfungsreife"]} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3, fill: "var(--primary)" }} animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <AnimatePresence>
        {explain && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="formula-title">
            <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExplain(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="pb-safe relative w-full max-w-lg rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={spring}>
              <button type="button" onClick={() => setExplain(false)} className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-xl hover:bg-accent" aria-label="Schließen">
                <X className="size-5" />
              </button>
              <h2 id="formula-title" className="font-display text-xl font-bold text-navy">So berechnen wir deine Prüfungsreife</h2>
              <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                <li><strong>25 % Abdeckung</strong> – Anteil der Fragen, die du mindestens einmal gesehen hast.</li>
                <li><strong>35 % Beherrschung</strong> – Anteil der Fragen in Fach 4 oder 5 deines Karteikastens.</li>
                <li><strong>25 % Trefferquote</strong> – richtig beantwortet unter deinen letzten 100 Antworten.</li>
                <li><strong>15 % Prüfungen</strong> – Durchschnitt deiner letzten 3 Prüfungssimulationen (0, wenn noch keine).</li>
              </ul>
              <p className="mt-3 text-sm text-foreground/90">Liegt eine Kategorie unter {CATEGORY_MIN} %, bleibt der Gesamtwert bei höchstens {CAP_SCORE} – damit dich keine Lücke in der Prüfung überrascht.</p>
              <p className="mt-3 text-xs text-muted-foreground">0–39 Noch am Anfang · 40–69 Auf gutem Weg · 70–84 Fast bereit · 85–100 Prüfungsbereit. Die Prognose rechnet deinen Verlauf der letzten 14 Tage linear hoch (ab 5 Tagen mit Daten).</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
