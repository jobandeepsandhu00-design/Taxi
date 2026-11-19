import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  Layers,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { categoryColor, categoryIcon } from "@/components/category-style";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { dayKey, diffDays, dateToDayKey } from "@/lib/dates";
import { modeLabel } from "@/lib/labels";
import { formatDate, formatDuration } from "@/lib/utils";
import { expireOverdueExams } from "@/server/exam";
import { getCategoryOverview, getDashboardStats } from "@/server/stats";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export const metadata: Metadata = { title: "Übersicht" };

const actions = [
  { href: "/lernen", label: "Lernen starten", desc: "Nach Kategorien lernen", icon: BookOpen },
  { href: "/quiz", label: "Quiz starten", desc: "Zufällige Fragen", icon: Sparkles },
  { href: "/pruefung", label: "Prüfungsmodus", desc: "Echte Simulation", icon: ClipboardCheck },
  { href: "/fehler", label: "Falsche Antworten", desc: "Fehler trainieren", icon: RotateCcw },
  { href: "/lernkarten", label: "Lernkarten", desc: "Karteikarten üben", icon: Layers },
  { href: "/fortschritt", label: "Mein Fortschritt", desc: "Statistiken", icon: BarChart3 },
];

const readinessColor = { niedrig: "#ef4444", mittel: "#f59e0b", hoch: "#ffc400", bereit: "#22c55e" } as const;

export default async function DashboardPage() {
  const user = await requireUser();
  await expireOverdueExams(user.id);
  const [stats, categories, openQuizzes, openExam] = await Promise.all([
    getDashboardStats(user.id),
    getCategoryOverview(user.id),
    prisma.quizAttempt.findMany({ where: { userId: user.id, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.examAttempt.findFirst({ where: { userId: user.id, status: "IN_PROGRESS" }, include: { examConfig: true } }),
  ]);
  const daysToExam = user.targetExamDate ? diffDays(dayKey(), dateToDayKey(user.targetExamDate)) : null;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <section className="relative overflow-hidden rounded-3xl panel-night p-6 text-white sm:p-8">
        
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">Willkommen zurück,</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{firstName} 👋</h1>
            <p className="mt-2 max-w-md text-white/80">
              {stats.answered === 0
                ? "Starte mit deiner ersten Lerneinheit – jede Frage bringt dich näher zur bestandenen Prüfung."
                : `Heute schon ${stats.todayAnswered} Fragen beantwortet. Weiter so!`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold backdrop-blur">
                <Flame className="size-4 text-primary" /> {stats.streak} {stats.streak === 1 ? "Tag" : "Tage"} Serie
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold backdrop-blur">
                <CalendarClock className="size-4 text-primary" />
                {daysToExam === null ? (
                  <Link href="/profil" className="underline-offset-2 hover:underline">Prüfungstermin festlegen</Link>
                ) : daysToExam > 0 ? (
                  <>Noch {daysToExam} {daysToExam === 1 ? "Tag" : "Tage"} bis zur Prüfung</>
                ) : daysToExam === 0 ? (
                  <>Heute ist Prüfungstag – viel Erfolg!</>
                ) : (
                  <>Prüfungstermin am {formatDate(user.targetExamDate!)} vorbei</>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-5 self-start rounded-2xl bg-white/10 p-4 backdrop-blur md:self-auto">
            <ProgressRing value={stats.overallProgress} size={112} stroke={10} color="#ffc400" track="rgba(255,255,255,0.12)" glow label="Gesamter Lernfortschritt">
              <span className="text-2xl font-extrabold">{stats.overallProgress}%</span>
              <span className="text-[10px] font-semibold text-white/80 uppercase">Fortschritt</span>
            </ProgressRing>
            <div className="text-sm">
              <p className="font-bold">Lernfortschritt</p>
              <p className="text-white/80">{stats.mastered} von {stats.totalPublished} Fragen</p>
              <p className="text-white/80">mind. einmal richtig</p>
            </div>
          </div>
        </div>
      </section>

      {/* Offene Sitzungen */}
      {(openExam || openQuizzes.length > 0) && (
        <section className="space-y-2" aria-label="Unfertige Sitzungen">
          {openExam && (
            <Link href={`/pruefung/${openExam.id}`} className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 transition hover:shadow-md">
              <ClipboardCheck className="size-5 text-warning" />
              <div className="flex-1">
                <p className="font-bold text-warning">Laufende Prüfung fortsetzen</p>
                <p className="text-sm text-warning">{openExam.examConfig.name} · Die Zeit läuft weiter!</p>
              </div>
              <ArrowRight className="size-5 text-warning" />
            </Link>
          )}
          {openQuizzes.map((q) => (
            <Link key={q.id} href={`/sitzung/${q.id}`} className="glass glow-hover flex items-center gap-3 rounded-2xl p-4">
              <PlayCircle className="size-5 text-link" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy">{q.title}</p>
                <p className="text-sm text-muted-foreground">
                  {modeLabel[q.mode]} · {q.answeredCount} von {q.questionIds.length} beantwortet
                </p>
              </div>
              <span className="text-sm font-semibold text-link">Fortsetzen</span>
            </Link>
          ))}
        </section>
      )}

      {/* Kennzahlen */}
      <Stagger as="section" className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Statistiken">
        <StatCard icon={Target} label="Beantwortete Fragen" value={stats.answered.toLocaleString("de-AT")} tone="blue" />
        <StatCard icon={CheckCircle2} label="Richtige Antworten" value={`${stats.accuracy} %`} sub={`${stats.correct} richtig`} tone="emerald" />
        <StatCard icon={XCircle} label="Falsche Antworten" value={stats.incorrect.toLocaleString("de-AT")} sub={`${stats.openMistakes} offen im Fehlertraining`} tone="rose" />
        <StatCard icon={Clock} label="Lernzeit" value={formatDuration(stats.totalSeconds)} sub={`Heute: ${formatDuration(stats.todaySeconds)}`} tone="violet" />
      </Stagger>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Aktionen */}
        <section className="lg:col-span-2" aria-label="Schnellstart">
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {actions.map((a) => (
              <StaggerItem key={a.href}>
              <Link
                key={a.href}
                href={a.href}
                className="glass glow-hover group relative block h-full overflow-hidden rounded-2xl p-4 sm:p-5"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-link"><a.icon className="size-6" /></span>
                <p className="mt-5 font-display font-bold leading-tight text-navy sm:text-lg">{a.label}</p>
                <p className="text-xs text-muted-foreground sm:text-sm">{a.desc}</p>
                <ArrowRight className="absolute top-4 right-4 size-4 text-link opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Prüfungsbereitschaft */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Prüfungsbereitschaft</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <ProgressRing value={stats.readiness.score} size={140} stroke={12} color={readinessColor[stats.readiness.level]} label="Prüfungsbereitschaft">
              <span className="text-3xl font-extrabold text-navy">{stats.readiness.score}</span>
              <span className="text-xs font-semibold text-muted-foreground">von 100</span>
            </ProgressRing>
            <Badge variant={stats.readiness.level === "bereit" ? "success" : stats.readiness.level === "niedrig" ? "destructive" : "default"}>
              {stats.readiness.label}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Berechnet aus Fragenabdeckung, Trefferquote der letzten 100 Antworten und den letzten Prüfungssimulationen.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/pruefung">Prüfung simulieren</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Kategorien */}
      <section aria-label="Kategorien">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-navy">Deine Kategorien</h2>
          <Link href="/lernen" className="text-sm font-semibold text-link hover:underline">Alle anzeigen</Link>
        </div>
        <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 6).map((c) => {
            const color = categoryColor(c.color);
            const Icon = categoryIcon(c.icon);
            return (
              <StaggerItem key={c.id}>
              <Link href={`/lernen/${c.slug}`} className="glass glow-hover flex items-center gap-3 rounded-2xl p-3.5">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${color.soft} ${color.text}`}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">{c.name}</p>
                  <Progress value={c.progress} className="mt-1.5 h-1.5" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">{c.progress}%</span>
              </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>
    </div>
  );
}

const tones = {
  blue: "bg-primary/10 text-link",
  emerald: "bg-success/10 text-success",
  rose: "bg-destructive/10 text-destructive",
  violet: "bg-primary/10 text-link",
};

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Target; label: string; value: string; sub?: string; tone: keyof typeof tones }) {
  return (
    <StaggerItem>
    <Card className="h-full p-4">
      <div className={`mb-3 flex size-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-[18px]" />
      </div>
      <p className="text-xl font-extrabold text-navy sm:text-2xl">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
    </StaggerItem>
  );
}
