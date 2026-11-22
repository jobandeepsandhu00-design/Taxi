import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { evaluateRules, topWeaknesses } from "@/lib/coach/rules";
import { projectReadyDate } from "@/lib/readiness";
import { getDailyPlanState } from "@/server/coach/plans";
import { getUserStats, readinessHistory } from "@/server/coach/stats";
import { CoachScreen } from "./coach-screen";

export const metadata: Metadata = { title: "Dein Taxi-Coach" };

/** Smart Coach: alles regelbasiert aus den App-Daten – keine KI nötig. */
export default async function CoachPage() {
  const user = await requireUser();
  const [stats, plan, history] = await Promise.all([getUserStats(user.id), getDailyPlanState(user.id), readinessHistory(user.id)]);
  const insights = evaluateRules(stats);
  const projection = projectReadyDate(history, stats.today);
  return (
    <CoachScreen
      name={user.isGuest ? "Gast" : user.name.split(" ")[0]}
      insights={insights.slice(0, 4)}
      plan={plan.map((p) => ({ id: p.id, kind: p.kind, label: p.label, hint: p.hint, href: p.href, target: p.target, progress: p.progress, done: p.done }))}
      weaknesses={topWeaknesses(stats.categories).map((c) => ({ slug: c.slug, name: c.name, accuracy: c.accuracy30, mastered: c.masteredPct, attempts: c.attempts30 }))}
      history={history}
      readyDate={projection.enoughData ? projection.date : null}
      enoughData={projection.enoughData}
      examDate={stats.examDate}
    />
  );
}
