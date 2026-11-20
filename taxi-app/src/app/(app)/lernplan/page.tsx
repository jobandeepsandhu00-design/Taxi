import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, Flag, Sparkles, Trophy } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { dateToDayKey, dayKey, weekdayShort } from "@/lib/dates";
import { dailyGoalQuestions } from "@/lib/gamification";
import { generateStudyPlan, type PlanDayType } from "@/lib/study-plan";
import { cn } from "@/lib/utils";
import { getCategoryOverview } from "@/server/stats";

export const metadata: Metadata = { title: "Lernplan" };

const typeStyle: Record<PlanDayType, { icon: typeof Sparkles; cls: string }> = {
  learn: { icon: Sparkles, cls: "bg-primary/15 text-link" },
  "exam-sim": { icon: ClipboardCheck, cls: "bg-warning/15 text-warning" },
  final: { icon: Flag, cls: "bg-destructive/15 text-destructive" },
  "exam-day": { icon: Trophy, cls: "bg-success/15 text-success" },
};

export default async function StudyPlanPage() {
  const user = await requireUser();
  const today = dayKey();
  const categories = await getCategoryOverview(user.id);
  const goal = dailyGoalQuestions(user.dailyGoalMinutes);
  const plan = generateStudyPlan({
    today,
    examDate: user.targetExamDate ? dateToDayKey(user.targetExamDate) : null,
    goalQuestions: goal,
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, progress: c.progress, accuracy: c.accuracy })),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prüfungstermin-Plan"
        title="Dein Lernplan"
        description={
          plan.daysLeft === null
            ? "Ein Vorschlag für die nächsten zwei Wochen – mit Prüfungstermin wird der Plan genau darauf abgestimmt."
            : plan.daysLeft < 0
              ? "Dein Prüfungstermin liegt in der Vergangenheit. Setze einen neuen Termin, um einen Plan zu erhalten."
              : `Noch ${plan.daysLeft} ${plan.daysLeft === 1 ? "Tag" : "Tage"} bis zur Prüfung. Schwächste Kategorien zuerst, regelmäßig Prüfungssimulationen.`
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/profil">
              <CalendarDays /> Termin & Tagesziel ändern
            </Link>
          </Button>
        }
      />

      {plan.days.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">Kein Plan verfügbar – bitte einen zukünftigen Prüfungstermin im Profil festlegen.</Card>
      ) : (
        <Stagger as="ul" className="relative space-y-3 before:absolute before:top-3 before:bottom-3 before:left-[27px] before:w-0.5 before:bg-border">
          {plan.days.map((d) => {
            const t = typeStyle[d.type];
            const isToday = d.day === today;
            return (
              <StaggerItem as="li" key={d.day} className="relative flex gap-4">
                <div className={cn("relative z-10 flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-border bg-card-solid", isToday && "border-primary bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--glow)]")}>
                  <span className={cn("text-[10px] font-bold uppercase", isToday ? "text-primary-foreground/80" : "text-muted-foreground")}>{isToday ? "Heute" : weekdayShort(d.day)}</span>
                  <span className="font-display text-lg leading-none font-bold">{d.day.slice(8, 10)}.</span>
                </div>
                <Card className={cn("min-w-0 flex-1 p-4", isToday && "border-primary/40")}>
                  <div className="flex items-start gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", t.cls)}>
                      <t.icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-navy">{d.title}</p>
                      <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        {d.tasks.map((task) => (
                          <li key={task}>• {task}</li>
                        ))}
                      </ul>
                      {d.focus.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {d.focus.map((f) => (
                            <Link key={f.id} href={`/lernen/${f.slug}`} className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground/80 transition hover:border-primary/50 hover:text-link">
                              {f.name} · {f.progress} %
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    {isToday && d.type !== "exam-day" && (
                      <Button asChild size="sm" className="shrink-0">
                        <Link href={d.type === "learn" && d.focus[0] ? `/lernen/${d.focus[0].slug}` : "/pruefung"}>Starten</Link>
                      </Button>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      {plan.truncated && <p className="text-center text-xs text-muted-foreground">Angezeigt werden die nächsten 4 Wochen – der Plan rollt täglich weiter.</p>}
    </div>
  );
}
