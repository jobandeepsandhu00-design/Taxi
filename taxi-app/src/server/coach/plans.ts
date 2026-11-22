import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { buildWeeklyReport, type PlanItem, type WeeklyReportData } from "@/lib/coach-plan";
import { evaluateRules, planFromInsights, type CoachPlanItem } from "@/lib/coach/rules";
import { buildCoachContext, contextToPrompt, type CoachContext } from "./context";
import { getUserStats } from "./stats";
import { coachConfigured, parseCoach } from "./llm";

interface StoredPlan {
  /** 2 = aus der Regel-Engine erzeugt */
  v?: number;
  items: PlanItem[];
  manualDone: string[];
}

export interface PlanItemState extends PlanItem {
  done: boolean;
  progress?: number;
}


/** Plan-Punkt der Regel-Engine → gespeicherter Plan-Punkt (mit Art für die automatische Erledigt-Erkennung). */
function toPlanItem(it: CoachPlanItem, dailyGoal: number): PlanItem {
  const base = { id: it.id, label: it.label, hint: it.hint, href: it.route };
  switch (it.id) {
    case "due_reviews":
      return { ...base, kind: "review", href: undefined };
    case "open_mistakes":
      return { ...base, kind: "mistakes", href: undefined };
    case "weak_category":
    case "untouched_category":
      return { ...base, kind: "category", slug: it.route.split("/").pop(), target: 10, label: `10 Fragen: ${it.label.replace(/ üben$/, "")}` };
    case "readiness_high":
      return { ...base, kind: "exam" };
    case "goal":
      return { ...base, kind: "goal", target: dailyGoal };
    case "challenge":
      return { ...base, kind: "challenge" };
    case "lesson":
    case "exam_soon_low":
      return { ...base, kind: "lesson" };
    case "lernbuch_next":
    case "lernbuch_again":
    case "kapitel_check_ready":
      return { ...base, kind: "lernbuch" };
    default:
      return { ...base, kind: "manual" };
  }
}

/** Tagesplan aus der Regel-Engine – einmal pro Tag beim ersten Öffnen erzeugt (kein Cron nötig). */
export async function ensureDailyPlan(userId: string, _ctx?: CoachContext): Promise<StoredPlan> {
  void _ctx;
  const today = dayKey();
  const day = dayKeyToDate(today);
  const existing = await prisma.dailyPlan.findUnique({ where: { userId_day: { userId, day } } });
  const stored = existing?.items as unknown as StoredPlan | undefined;
  if (stored?.v === 2) return stored;
  const stats = await getUserStats(userId);
  const plan: StoredPlan = { v: 2, items: planFromInsights(evaluateRules(stats), stats).map((i) => toPlanItem(i, stats.dailyGoal)), manualDone: [] };
  await prisma.dailyPlan
    .upsert({ where: { userId_day: { userId, day } }, create: { userId, day, items: plan as unknown as object }, update: { items: plan as unknown as object } })
    .catch(() => undefined);
  return plan;
}

/** Tagesplan mit automatisch erkanntem Erledigt-Status. */
export async function getDailyPlanState(userId: string, ctx?: CoachContext): Promise<PlanItemState[]> {
  const plan = await ensureDailyPlan(userId, ctx);
  const start = dayKeyToDate(dayKey());
  const [answersToday, mistakeAnswers, challenge, exam, due, readToday, lessonsToday] = await Promise.all([
    prisma.userAnswer.findMany({ where: { userId, createdAt: { gte: start } }, select: { question: { select: { category: { select: { slug: true } } } } } }),
    prisma.userAnswer.count({ where: { userId, createdAt: { gte: start }, mode: "MISTAKES" } }),
    prisma.dailyChallengeResult.findUnique({ where: { userId_day: { userId, day: start } } }),
    prisma.examAttempt.count({ where: { userId, status: { in: ["SUBMITTED", "EXPIRED"] }, submittedAt: { gte: start } } }),
    prisma.reviewItem.count({ where: { userId, dueDate: { lte: start } } }),
    prisma.readProgress.count({ where: { userId, updatedAt: { gte: start } } }),
    prisma.lesson.count({ where: { userId, completedAt: { gte: start } } }),
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
      case "lernbuch":
        progress = readToday;
        done = readToday >= 5;
        break;
      case "lesson":
        done = lessonsToday > 0;
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
  data.coachNote ??= weeklyNote(data);
  await prisma.weeklyReport.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, data: data as unknown as object },
    update: { data: data as unknown as object, createdAt: new Date() },
  });
  return { data, weekStart: ws, preview };
}

/** Wochen-Notiz aus Textbausteinen (ohne KI). */
function weeklyNote(d: WeeklyReportData): string {
  const { answered, accuracy, activeDays, streak } = d.stats;
  if (answered === 0) return "Diese Woche war ruhig. Kein Problem – starte morgen mit einer Mini-Lektion, dann bist du gleich wieder drin.";
  const parts = [`Diese Woche hast du ${answered} ${answered === 1 ? "Frage" : "Fragen"} an ${activeDays} ${activeDays === 1 ? "Tag" : "Tagen"} beantwortet${accuracy !== null ? ` – ${accuracy} % davon richtig` : ""}.`];
  if (accuracy !== null && accuracy >= 80) parts.push("Das ist richtig stark!");
  else if (accuracy !== null && accuracy < 60) parts.push("Lies bei falschen Antworten die Erklärung – das bringt am meisten.");
  if (streak >= 7) parts.push(`Deine Serie von ${streak} Tagen zeigt: Du bleibst dran.`);
  else if (activeDays < 4) parts.push("Versuch nächste Woche an mindestens 5 Tagen kurz zu lernen.");
  if (d.weaknesses[0]) parts.push(`Schwerpunkt für die nächste Woche: „${d.weaknesses[0].name}“.`);
  return parts.join(" ");
}
