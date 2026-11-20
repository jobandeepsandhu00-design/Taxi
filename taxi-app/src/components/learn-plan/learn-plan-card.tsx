"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Play } from "lucide-react";
import { categoryColor } from "@/components/category-style";
import { Button } from "@/components/ui/button";
import type { LearnPlan } from "@/lib/learn-plan-types";
import { spring } from "@/lib/motion";
import { startLessonAction } from "@/server/actions/learning";
import { MiniBar, PlanRing, PlanSkeleton, useLearnPlan } from "./shared";

/** Home-Karte „Dein Lernplan“. */
export function LearnPlanCard({ initial }: { initial: LearnPlan }) {
  const { data } = useLearnPlan(initial);
  if (!data) return <PlanSkeleton rows={2} />;
  const next = data.next;
  return (
    <section className="glass rounded-3xl p-5" aria-label="Dein Lernplan" data-testid="learn-plan-card">
      <div className="flex items-center gap-4">
        <PlanRing value={data.totals.progress} size={88} label={`Lernplan zu ${data.totals.progress} % geschafft`} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-navy">Dein Lernplan</h2>
          <p className="text-sm text-muted-foreground">
            {data.totals.gemeistert} von {data.totals.total} Fragen gemeistert
          </p>
          {next && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm">
                <span className="text-muted-foreground">Heute dran:</span>{" "}
                <strong className="text-navy">
                  {next.section} · Lektion {next.lesson_index}
                </strong>
              </span>
              <form action={startLessonAction}>
                <input type="hidden" name="categoryId" value={next.category_id} />
                <input type="hidden" name="lessonIndex" value={next.lesson_index} />
                <Button type="submit" size="sm">
                  <Play /> Starten
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {data.sections.map((s, i) => (
          <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.05 }}>
            <span className="mb-1 flex justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-navy">{s.name}</span>
              <span className="text-muted-foreground tabular">{s.progress} %</span>
            </span>
            <MiniBar value={s.progress} color={categoryColor(s.color).hex} delay={0.15 + i * 0.05} />
          </motion.li>
        ))}
      </ul>
      <Link href="/lernplan" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-link hover:underline">
        Ganzer Lernplan <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
