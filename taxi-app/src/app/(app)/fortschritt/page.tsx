import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock, Flame, Target, TrendingUp } from "lucide-react";
import { categoryColor } from "@/components/category-style";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { weekdayShort } from "@/lib/dates";
import { formatDate, formatDuration } from "@/lib/utils";
import { getAnalytics, getDashboardStats } from "@/server/stats";
import { AccuracyTrendChart, AnsweredChart, DailyChart, ExamHistoryChart } from "./charts";

export const metadata: Metadata = { title: "Mein Fortschritt" };

export default async function ProgressPage() {
  const user = await requireUser();
  const [stats, analytics] = await Promise.all([getDashboardStats(user.id), getAnalytics(user.id)]);
  const daily = analytics.daily.map((d) => ({ ...d, label: `${weekdayShort(d.day)} ${d.day.slice(8, 10)}.` }));
  const last7 = daily.slice(-7);
  const weekMinutes = last7.reduce((s, d) => s + d.minutes, 0);
  const weekAnswered = last7.reduce((s, d) => s + d.answered, 0);
  const prev7 = daily.slice(-14, -7).reduce((s, d) => s + d.answered, 0);
  const passLine = analytics.exams.at(-1)?.passPercentage ?? 70;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analyse" title="Mein Fortschritt" description="Alle Lernaktivitäten, Trefferquoten und Prüfungsergebnisse auf einen Blick." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-4">
          <ProgressRing value={stats.accuracy} size={64} stroke={7} color="#059669"><span className="text-sm font-extrabold text-navy">{stats.accuracy}%</span></ProgressRing>
          <div><p className="text-sm font-bold text-navy">Trefferquote</p><p className="text-xs text-muted-foreground">{stats.correct} / {stats.answered}</p></div>
        </Card>
        <Card className="p-4"><Target className="size-5 text-link" /><p className="mt-2 text-2xl font-extrabold text-navy">{weekAnswered}</p><p className="text-xs text-muted-foreground">Fragen in 7 Tagen {prev7 > 0 && <span className={weekAnswered >= prev7 ? "text-success" : "text-destructive"}>({weekAnswered >= prev7 ? "+" : ""}{weekAnswered - prev7} ggü. Vorwoche)</span>}</p></Card>
        <Card className="p-4"><Clock className="size-5 text-link" /><p className="mt-2 text-2xl font-extrabold text-navy">{formatDuration(weekMinutes * 60)}</p><p className="text-xs text-muted-foreground">Lernzeit in 7 Tagen</p></Card>
        <Card className="p-4"><Flame className="size-5 text-warning" /><p className="mt-2 text-2xl font-extrabold text-navy">{stats.streak} Tage</p><p className="text-xs text-muted-foreground">Serie · Rekord {stats.longestStreak}</p></Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tägliche Lernzeit</CardTitle><CardDescription>Minuten pro Tag, letzte 28 Tage</CardDescription></CardHeader>
          <CardContent><DailyChart data={daily} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Beantwortete Fragen</CardTitle><CardDescription>Beantwortet und davon richtig, letzte 28 Tage</CardDescription></CardHeader>
          <CardContent><AnsweredChart data={daily} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Trefferquote je Kategorie</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analytics.categories.map((c) => {
              const color = categoryColor(c.color);
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <Link href={`/lernen/${c.slug}`} className="truncate font-semibold text-foreground/85 hover:text-link">{c.name}</Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.answered} beantwortet · <strong className="text-navy">{c.accuracy === null ? "–" : `${c.accuracy} %`}</strong>
                    </span>
                  </div>
                  <Progress value={c.accuracy ?? 0} barClassName={`bg-gradient-to-r ${color.gradient}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-warning" /> Schwächste Themen</CardTitle></CardHeader>
          <CardContent>
            {analytics.weakest.length === 0 ? (
              <p className="text-sm text-muted-foreground">Beantworte mindestens 3 Fragen pro Kategorie, um deine Schwächen zu sehen.</p>
            ) : (
              <ol className="space-y-3">
                {analytics.weakest.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl bg-destructive/10 p-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy">{c.name}</p>
                      <p className="text-xs text-destructive">{c.accuracy} % richtig</p>
                    </div>
                    <Link href={`/lernen/${c.slug}`} className="text-xs font-semibold text-link hover:underline">Üben</Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-link" /> Verbesserung über Zeit</CardTitle><CardDescription>Wöchentliche Trefferquote</CardDescription></CardHeader>
          <CardContent>
            {analytics.weekly.length < 1 ? (
              <p className="text-sm text-muted-foreground">Noch keine Daten.</p>
            ) : (
              <AccuracyTrendChart data={analytics.weekly.map((w) => ({ label: `KW ab ${w.week.slice(8, 10)}.${w.week.slice(5, 7)}.`, accuracy: w.accuracy }))} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Prüfungssimulationen</CardTitle><CardDescription>{analytics.exams.length} abgeschlossen · {analytics.exams.filter((e) => e.passed).length} bestanden</CardDescription></CardHeader>
          <CardContent>
            {analytics.exams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Prüfungssimulation. <Link href="/pruefung" className="font-semibold text-link hover:underline">Jetzt starten</Link></p>
            ) : (
              <>
                <ExamHistoryChart data={analytics.exams.map((e) => ({ label: formatDate(e.startedAt).slice(0, 6), score: e.scorePercent ?? 0 }))} passLine={passLine} />
                <ul className="mt-3 divide-y text-sm">
                  {analytics.exams.slice(-5).reverse().map((e) => (
                    <li key={e.id}>
                      <Link href={`/pruefung/${e.id}/ergebnis`} className="flex justify-between py-2 hover:text-link">
                        <span>{formatDate(e.startedAt, true)} · {e.examConfig.name}</span>
                        <strong className={e.passed ? "text-success" : "text-destructive"}>{e.scorePercent?.toLocaleString("de-AT")} %</strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
