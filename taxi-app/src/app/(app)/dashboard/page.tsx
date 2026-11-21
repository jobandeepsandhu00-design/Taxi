import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, PlayCircle } from "lucide-react";
import { categoryColor } from "@/components/category-style";
import { CountdownChip, Greeting } from "@/components/home/hero";
import { AchievementStrip, CategoryList, QuickActions, StreakFlame, XpCard, ZeroState, type HomeCategory } from "@/components/home/cards";
import { DailyRings, ReadinessRing } from "@/components/home/rings";
import { CoachBubble, DailyPlanCard, PrognosisCard } from "@/components/home/coach-cards";
import { LessonCta } from "@/components/home/lesson-cta";
import { LernbuchWidget } from "@/components/lernbuch/lernbuch-widget";
import { getLernbuchOverview } from "@/server/lernbuch";
import { LearnPlanCard } from "@/components/learn-plan/learn-plan-card";
import { getLearnPlan } from "@/server/learn-plan";
import { buildCoachContext } from "@/server/coach/context";
import { getDailyPlanState } from "@/server/coach/plans";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { dateToDayKey, dayKey, diffDays } from "@/lib/dates";
import { dailyGoalQuestions, viennaHour } from "@/lib/gamification";
import { modeLabel } from "@/lib/labels";
import { startMistakeTrainingAction, startReviewAction } from "@/server/actions/learning";
import { expireOverdueExams } from "@/server/exam";
import { getDueReviewCount } from "@/server/gamification";
import { getCategoryOverview, getDashboardStats } from "@/server/stats";

export const metadata: Metadata = { title: "Start" };

const actions = [
  { href: "/challenge", label: "Daily Challenge", desc: "5 Fragen · Rangliste", icon: "Trophy" },
  { href: "/lernbuch", label: "Lernbuch", desc: "Erst lesen, dann üben", icon: "BookOpen" },
  { href: "/lernen", label: "Lektionen", desc: "Nach Kategorien", icon: "BookOpen" },
  { href: "/quiz", label: "Quiz starten", desc: "Zufällige Fragen", icon: "Sparkles" },
  { href: "/pruefung", label: "Prüfungsmodus", desc: "Echte Simulation", icon: "ClipboardCheck" },
  { href: "/muendlich", label: "Mündliche Prüfung", desc: "Laut antworten, Toni bewertet", icon: "Mic" },
  { href: "/fehler", label: "Falsche Antworten", desc: "Fehler trainieren", icon: "RotateCcw" },
  { href: "/lernkarten", label: "Lernkarten", desc: "Karteikarten üben", icon: "Layers" },
  { href: "/zahlen", label: "Zahlen-Trainer", desc: "Promille, Abstände, Fristen", icon: "Hash" },
  { href: "/ortskunde", label: "Ortskunde-Karte", desc: "Wo liegt …?", icon: "Map" },
  { href: "/ortskunde/routen", label: "Routen in Etappen", desc: "Lückentext & Reihenfolge", icon: "Route" },
  { href: "/duell", label: "Duell", desc: "1 gegen 1, live", icon: "Swords" },
  { href: "/fortschritt", label: "Mein Fortschritt", desc: "Statistiken", icon: "BarChart3" },
];

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold text-navy">{children}</h2>
      {action}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  await expireOverdueExams(user.id);
  const [stats, categories, openQuizzes, openExam, due, me, unlocked] = await Promise.all([
    getDashboardStats(user.id),
    getCategoryOverview(user.id),
    prisma.quizAttempt.findMany({ where: { userId: user.id, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" }, take: 2 }),
    prisma.examAttempt.findFirst({ where: { userId: user.id, status: "IN_PROGRESS" }, include: { examConfig: true } }),
    getDueReviewCount(user.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { xp: true } }),
    prisma.userAchievement.findMany({ where: { userId: user.id }, select: { key: true } }),
  ]);
  const coachCtx = await buildCoachContext(user.id);
  const [plan, learnPlan, lernbuch] = await Promise.all([getDailyPlanState(user.id, coachCtx), getLearnPlan(user.id), getLernbuchOverview(user.id)]);
  const daysToExam = user.targetExamDate ? diffDays(dayKey(), dateToDayKey(user.targetExamDate)) : null;
  const firstName = user.isGuest ? "Gast" : user.name.split(" ")[0];
  const goalQuestions = dailyGoalQuestions(user.dailyGoalMinutes);
  const goalMinutes = user.dailyGoalMinutes ?? 20;
  const subtitle =
    stats.answered === 0
      ? "Starte mit deiner ersten Lerneinheit – jede Frage bringt dich näher zur bestandenen Prüfung."
      : stats.todayAnswered >= goalQuestions
        ? "Tagesziel geschafft – stark! Jede weitere Frage ist ein Bonus."
        : `Heute schon ${stats.todayAnswered} von ${goalQuestions} Fragen. Weiter so!`;
  const homeCategories: HomeCategory[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    hex: categoryColor(c.color).hex,
    progress: c.progress,
    accuracy: c.accuracy,
    answered: c.answered,
    questionCount: c.questionCount,
    mastered: c.mastered,
  }));
  const resume = openQuizzes[0];
  const bubble =
    due > 0
      ? { message: `Du hast ${due} fällige ${due === 1 ? "Frage" : "Fragen"} – 5 Minuten reichen! 🚕`, href: "/dashboard", start: "review" as const }
      : stats.openMistakes > 0
        ? { message: `${stats.openMistakes} Fehler warten auf dich – schnapp sie dir! 🎯`, href: "/fehler", start: "mistakes" as const }
        : stats.todayAnswered < goalQuestions
          ? { message: `Noch ${goalQuestions - stats.todayAnswered} Fragen bis zum Tagesziel – gemma! 🚕`, href: "/quiz" }
          : { message: "Tagesziel geschafft! Frag mich, was du als Nächstes üben sollst. 💬", href: "/coach" };
  const acc = coachCtx.categories.reduce((s, c) => s + (c.accuracy30 ?? 0) * c.answered30, 0) / Math.max(1, coachCtx.categories.reduce((s, c) => s + c.answered30, 0));
  const bubbleMood = stats.answered === 0 ? "idle" : stats.todayAnswered >= goalQuestions || acc >= 75 ? "happy" : acc > 0 && acc < 50 ? "sad" : "idle";

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <section className="space-y-3">
        <Greeting name={firstName} hour={viennaHour()} subtitle={subtitle} />
        <div className="flex flex-wrap gap-2">
          <CountdownChip days={daysToExam} />
          <Link href="/lernplan" className="glass glow-hover inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-navy">
            🗓️ Lernplan
          </Link>
        </div>
      </section>

      <LernbuchWidget o={lernbuch} />

      <LessonCta due={due} />

      <LearnPlanCard initial={learnPlan} />

      <Link href="/muendlich" className="glass glow-hover flex items-center gap-4 rounded-3xl p-4" data-testid="home-oral">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFC107] text-2xl text-black" aria-hidden>
          🎙️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold text-navy">Mündliche Prüfung üben</span>
          <span className="block text-sm text-muted-foreground">Frage hören, laut antworten – Toni prüft die Kernpunkte.</span>
        </span>
        <span className="text-xl text-muted-foreground" aria-hidden>
          ›
        </span>
      </Link>

      <CoachBubble message={bubble.message} href={bubble.href} start={"start" in bubble ? bubble.start : undefined} mood={bubbleMood} day={dayKey()} />

      {/* Laufende Prüfung */}
      {openExam && (
        <Link href={`/quiz/${openExam.id}`} className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 transition active:scale-[0.99]">
          <ClipboardCheck className="size-5 text-warning" />
          <div className="flex-1">
            <p className="font-bold text-navy">Laufende Prüfung fortsetzen</p>
            <p className="text-sm text-muted-foreground">{openExam.examConfig.name} · Die Zeit läuft weiter!</p>
          </div>
          <ArrowRight className="size-5 text-warning" />
        </Link>
      )}

      {/* Coach: Tagesplan + Prognose */}
      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaggerItem>
          <DailyPlanCard items={plan} />
        </StaggerItem>
        <StaggerItem>
          <PrognosisCard readyDate={coachCtx.prognosis.readyDate} confidence={coachCtx.prognosis.confidence} readiness={coachCtx.prognosis.readiness} onTrack={coachCtx.prognosis.onTrack} trend={coachCtx.prognosis.trend} examDate={coachCtx.examDate} />
        </StaggerItem>
      </Stagger>

      {/* Prüfungsreife + Tagesziel */}
      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaggerItem>
          <Card className="flex h-full flex-col items-center p-5">
            <p className="mb-3 self-start text-xs font-bold tracking-wider text-link uppercase">Prüfungsreife</p>
            <Link href="/fortschritt/reife" className="rounded-full transition active:scale-95" aria-label="Prüfungsreife im Detail ansehen">
              <ReadinessRing score={stats.readiness.score} label={stats.readiness.label} level={stats.readiness.level} />
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">Abdeckung, Beherrschung, Trefferquote und Simulationen – tippe für Details.</p>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="flex h-full flex-col p-5">
            <p className="mb-3 text-xs font-bold tracking-wider text-link uppercase">Tagesziel · {goalMinutes} Minuten</p>
            <div className="flex flex-1 items-center justify-center">
              <DailyRings answered={stats.todayAnswered} correct={stats.todayCorrect} minutes={Math.floor(stats.todaySeconds / 60)} goalQuestions={goalQuestions} goalMinutes={goalMinutes} />
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="h-full p-5">
            <p className="mb-2 text-xs font-bold tracking-wider text-link uppercase">Lernserie</p>
            <StreakFlame streak={stats.streak} longest={stats.longestStreak} />
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="h-full p-5">
            <XpCard xp={me.xp} />
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Wiederholung + Weiterlernen */}
      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StaggerItem>
          <Card className={due > 0 ? "h-full border-primary/40 p-5" : "h-full p-5"}>
            {due > 0 ? (
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <span className="font-display text-2xl leading-none font-bold">{due}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy">Heute fällig: {due} {due === 1 ? "Frage" : "Fragen"}</p>
                  <p className="text-sm text-muted-foreground">Wiederholen nach dem Karteikasten-Prinzip – so bleibt&apos;s im Kopf.</p>
                </div>
                <form action={startReviewAction}>
                  <Button type="submit" size="sm">
                    Los <ArrowRight />
                  </Button>
                </form>
              </div>
            ) : (
              <ZeroState emoji="✅" title="Alles wiederholt" text="Heute ist nichts fällig. Neue Fragen landen automatisch im Karteikasten." />
            )}
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="h-full p-5">
            {resume ? (
              <Link href={`/quiz/${resume.id}`} className="group block">
                <div className="flex items-center gap-3">
                  <PlayCircle className="size-9 shrink-0 text-link" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold tracking-wider text-link uppercase">Weiterlernen</p>
                    <p className="truncate font-bold text-navy">{resume.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {modeLabel[resume.mode]} · {resume.answeredCount} von {resume.questionIds.length}
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-link transition group-hover:translate-x-1" />
                </div>
                <Progress value={(resume.answeredCount / Math.max(1, resume.questionIds.length)) * 100} className="mt-3" />
              </Link>
            ) : (
              <ZeroState
                emoji="🚕"
                title="Bereit für die nächste Fahrt?"
                text="Keine offene Lerneinheit – starte eine neue."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/lernen">Lerneinheit starten</Link>
                  </Button>
                }
              />
            )}
          </Card>
        </StaggerItem>
      </Stagger>

      {/* Schnellstart */}
      <section aria-label="Schnellstart">
        <SectionTitle>Schnellstart</SectionTitle>
        <QuickActions actions={actions} />
      </section>

      {/* Fehler */}
      <Card className="p-5">
        {stats.openMistakes > 0 ? (
          <ZeroState
            emoji="🎯"
            title={`${stats.openMistakes} ${stats.openMistakes === 1 ? "offener Fehler" : "offene Fehler"}`}
            text="Trainiere gezielt die Fragen, die noch nicht sitzen."
            action={
              <form action={startMistakeTrainingAction}>
                <Button type="submit" size="sm" variant="outline">
                  Fehlertraining starten
                </Button>
              </form>
            }
          />
        ) : (
          <ZeroState emoji="💪" title="Noch keine Fehler – stark!" text="Falsch beantwortete Fragen sammeln wir hier automatisch für dich." />
        )}
      </Card>

      {/* Kategorien */}
      <section aria-label="Kategorien">
        <SectionTitle
          action={
            <Link href="/lernen" className="text-sm font-semibold text-link hover:underline">
              Alle anzeigen
            </Link>
          }
        >
          Deine Kategorien
        </SectionTitle>
        <CategoryList categories={homeCategories} />
      </section>

      {/* Abzeichen */}
      <section aria-label="Abzeichen">
        <SectionTitle>Abzeichen</SectionTitle>
        <AchievementStrip unlocked={unlocked.map((u) => u.key)} />
      </section>
    </div>
  );
}
