import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { buildDailyPlan, buildWeeklyReport, type PlanItem, type WeeklyReportData } from "@/lib/coach-plan";
import { buildCoachContext, contextToPrompt, type CoachContext } from "./context";
import { coachConfigured, parseCoach } from "./llm";

interface StoredPlan {
  items: PlanItem[];
  manualDone: string[];
}

export interface PlanItemState extends PlanItem {
  done: boolean;
  progress?: number;
}

function dayOfYear(key: string): number {
  const d = dayKeyToDate(key);
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;
}

/** Tagesplan erzeugen (idempotent pro Tag). */
export async function ensureDailyPlan(userId: string, ctx?: CoachContext): Promise<StoredPlan> {
  const today = dayKey();
  const day = dayKeyToDate(today);
  const existing = await prisma.dailyPlan.findUnique({ where: { userId_day: { userId, day } } });
  if (existing) return existing.items as unknown as StoredPlan;
  const c = ctx ?? (await buildCoachContext(userId));
  const plan: StoredPlan = {
    items: buildDailyPlan({ dueToday: c.leitner.dueToday, openMistakes: c.openMistakes, goalQuestions: c.dailyGoalQuestions, daysToExam: c.daysToExam, dayOfYear: dayOfYear(today), categories: c.categories }),
    manualDone: [],
  };
  await prisma.dailyPlan.create({ data: { userId, day, items: plan as unknown as object } }).catch(() => undefined);
  return plan;
}

/** Tagesplan mit automatisch erkanntem Erledigt-Status. */
export async function getDailyPlanState(userId: string, ctx?: CoachContext): Promise<PlanItemState[]> {
  const plan = await ensureDailyPlan(userId, ctx);
  const start = dayKeyToDate(dayKey());
  const [answersToday, mistakeAnswers, challenge, exam, due] = await Promise.all([
    prisma.userAnswer.findMany({ where: { userId, createdAt: { gte: start } }, select: { question: { select: { category: { select: { slug: true } } } } } }),
    prisma.userAnswer.count({ where: { userId, createdAt: { gte: start }, mode: "MISTAKES" } }),
    prisma.dailyChallengeResult.findUnique({ where: { userId_day: { userId, day: start } } }),
    prisma.examAttempt.count({ where: { userId, status: { in: ["SUBMITTED", "EXPIRED"] }, submittedAt: { gte: start } } }),
    prisma.reviewItem.count({ where: { userId, dueDate: { lte: start } } }),
  ]);
  return plan.items.map((it) => {
    let done = false;
    let progress: number | undefined;
    switch (it.kind) {
      case "review":
        done = due === 0;
        break;
      case "goal":
        progress = answersToday.length;
        done = answersToday.length >= (it.target ?? 20);
        break;
      case "category":
        progress = answersToday.filter((a) => a.question.category.slug === it.slug).length;
        done = progress >= (it.target ?? 10);
        break;
      case "mistakes":
        done = mistakeAnswers > 0;
        break;
      case "challenge":
        done = Boolean(challenge);
        break;
      case "exam":
        done = exam > 0;
        break;
    }
    return { ...it, done: done || plan.manualDone.includes(it.id), progress };
  });
}

export async function toggleManualDone(userId: string, itemId: string): Promise<void> {
  const day = dayKeyToDate(dayKey());
  const row = await prisma.dailyPlan.findUnique({ where: { userId_day: { userId, day } } });
  if (!row) return;
  const plan = row.items as unknown as StoredPlan;
  if (!plan.items.some((i) => i.id === itemId)) return;
  const manualDone = plan.manualDone.includes(itemId) ? plan.manualDone.filter((x) => x !== itemId) : [...plan.manualDone, itemId];
  await prisma.dailyPlan.update({ where: { id: row.id }, data: { items: { ...plan, manualDone } as unknown as object } });
}

/** Montag der aktuellen Woche (Wiener Datum). */
export function weekStartKey(today = dayKey()): string {
  const dow = (dayKeyToDate(today).getUTCDay() + 6) % 7; // 0 = Montag
  return addDays(today, -dow);
}

const noteSchema = z.object({ note: z.string() });

/** Wochenbericht: sonntags final (Cron), sonst als Vorschau; höchstens ein KI-Text pro Tag. */
export async function getWeeklyReport(userId: string): Promise<{ data: WeeklyReportData; weekStart: string; preview: boolean }> {
  const today = dayKey();
  const ws = weekStartKey(today);
  const weekStart = dayKeyToDate(ws);
  const preview = dayKeyToDate(today).getUTCDay() !== 0;
  const existing = await prisma.weeklyReport.findUnique({ where: { userId_weekStart: { userId, weekStart } } });
  if (existing && existing.createdAt >= dayKeyToDate(today)) return { data: existing.data as unknown as WeeklyReportData, weekStart: ws, preview };

  const ctx = await buildCoachContext(userId);
  const [answers, activity] = await Promise.all([
    prisma.userAnswer.findMany({ where: { userId, createdAt: { gte: weekStart } }, select: { isCorrect: true } }),
    prisma.dailyActivity.count({ where: { userId, date: { gte: weekStart }, questionsAnswered: { gt: 0 } } }),
  ]);
  const data = buildWeeklyReport({
    name: ctx.name,
    answeredWeek: answers.length,
    correctWeek: answers.filter((a) => a.isCorrect).length,
    activeDays: activity,
    streak: ctx.streak,
    dueToday: ctx.leitner.dueToday,
    openMistakes: ctx.openMistakes,
    categories: ctx.categories,
    prognosis: { readyDate: ctx.prognosis.readyDate, confidence: ctx.prognosis.confidence, onTrack: ctx.prognosis.onTrack, trend: ctx.prognosis.trend },
  });
  if (coachConfigured() && answers.length > 0) {
    const out = await parseCoach({
      context: `Lernstand (JSON):\n${contextToPrompt(ctx)}\nWochenzahlen: ${JSON.stringify(data.stats)}`,
      prompt: "Schreib eine kurze, persönliche Wochenbilanz (2–3 Sätze, du-Form, motivierend, ehrlich). Nur Fakten aus den Daten, keine neuen Zahlen.",
      schema: noteSchema,
      fake: () => ({ note: `Diese Woche hast du ${data.stats.answered} Fragen beantwortet. Bleib dran – du bist auf einem guten Weg!` }),
      maxTokens: 1000,
    }).catch(() => null);
    if (out?.note) data.coachNote = out.note;
  }
  await prisma.weeklyReport.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, data: data as unknown as object },
    update: { data: data as unknown as object, createdAt: new Date() },
  });
  return { data, weekStart: ws, preview };
}
