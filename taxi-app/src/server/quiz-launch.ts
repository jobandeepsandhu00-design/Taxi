import "server-only";
import { Prisma, type QuizMode as DbQuizMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { parseDrillSettings } from "@/lib/audio/drill";
import { topWeaknesses } from "@/lib/coach/rules";
import { naturalCompare } from "@/lib/lernbuch";
import { simulationQuestionCount, type QuizConfig } from "@/lib/quiz-config";
import { pickRandomUnique, selectExamQuestions, shuffle } from "@/lib/quiz-logic";
import { getUserStats } from "@/server/coach/stats";
import { unlockedCategoryIds } from "@/server/lernbuch";
import { publishedWhere } from "@/server/questions";

export class LaunchError extends Error {}

const activeWhere = { ...publishedWhere, category: { isActive: true } } satisfies Prisma.QuestionWhereInput;

async function idsWhere(where: Prisma.QuestionWhereInput) {
  return prisma.question.findMany({ where: { ...activeWhere, ...where }, select: { id: true, categoryId: true, lessonIndex: true, category: { select: { order: true } } } });
}

/** Kapitel-Reihenfolge wie im Skript */
function bookOrder<T extends { id: string; lessonIndex: number | null; category: { order: number } }>(qs: T[]): T[] {
  return [...qs].sort((a, b) => a.category.order - b.category.order || (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0) || naturalCompare(a.id, b.id));
}

/** Fällige + schwache Fragen für ein Mini-Quiz. */
async function miniIds(userId: string, count: number): Promise<string[]> {
  const due = await prisma.reviewItem.findMany({ where: { userId, dueDate: { lte: dayKeyToDate(dayKey()) }, question: activeWhere }, orderBy: { dueDate: "asc" }, take: Math.ceil(count / 2), select: { questionId: true } });
  const stats = await getUserStats(userId);
  const weak = topWeaknesses(stats.categories).map((c) => c.slug);
  const pool = await idsWhere({ category: { isActive: true, slug: { in: weak } }, id: { notIn: due.map((d) => d.questionId) } });
  const rest = pickRandomUnique(pool.map((q) => q.id), count - due.length);
  const ids = [...due.map((d) => d.questionId), ...rest];
  if (ids.length < count) {
    const extra = await idsWhere({ id: { notIn: ids } });
    ids.push(...pickRandomUnique(extra.map((q) => q.id), count - ids.length));
  }
  return shuffle(ids).slice(0, count);
}

async function weakIds(userId: string, count: number): Promise<{ ids: string[]; names: string[] }> {
  const stats = await getUserStats(userId);
  const weak = topWeaknesses(stats.categories);
  const pool = await idsWhere({ category: { isActive: true, slug: { in: weak.map((w) => w.slug) } } });
  return { ids: pickRandomUnique(pool.map((q) => q.id), count), names: weak.map((w) => w.name) };
}

async function randomIds(userId: string, count: number): Promise<string[]> {
  const unlocked = await unlockedCategoryIds(userId);
  const pool = await idsWhere(unlocked ? { categoryId: { in: unlocked } } : {});
  return pickRandomUnique(pool.map((q) => q.id), count);
}

async function chapterIds(cfg: QuizConfig): Promise<string[]> {
  const qs = bookOrder(await idsWhere({ categoryId: { in: cfg.chapterIds ?? [] } }));
  const ids = qs.map((q) => q.id);
  return cfg.questionCount ? pickRandomUnique(ids, cfg.questionCount) : ids;
}

async function createQuiz(userId: string, mode: DbQuizMode, title: string, questionIds: string[], cfg: QuizConfig) {
  await prisma.quizAttempt.updateMany({ where: { userId, mode, status: "IN_PROGRESS" }, data: { status: "ABANDONED" } });
  const a = await prisma.quizAttempt.create({ data: { userId, mode, title, questionIds, settings: { launcher: cfg } as unknown as Prisma.InputJsonValue } });
  return `/quiz/${a.id}`;
}

/** Zeitgesteuerte Prüfung ohne Feedback bis zum Ende (bestehende Prüfungssimulation). */
async function createExam(userId: string, minutes: number, questionIds: string[] | null, count: number) {
  const config = await prisma.examConfig.findFirst({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
  if (!config) throw new LaunchError("Keine Prüfungskonfiguration aktiv.");
  let ids = questionIds;
  if (!ids) {
    const pool = await prisma.question.findMany({ where: { ...activeWhere, ...(config.allowedOrigins.length ? { origin: { in: config.allowedOrigins } } : {}) }, select: { id: true, categoryId: true } });
    ids = selectExamQuestions(pool, count, (config.categoryDistribution ?? null) as Record<string, number> | null);
  }
  if (ids.length === 0) throw new LaunchError("Keine Fragen gefunden.");
  const now = new Date();
  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      examConfigId: config.id,
      durationMinutes: minutes,
      passPercentage: config.passPercentage,
      startedAt: now,
      expiresAt: new Date(now.getTime() + minutes * 60_000),
      totalCount: ids.length,
      responses: { create: ids.map((questionId, order) => ({ questionId, order })) },
    },
  });
  return `/quiz/${attempt.id}`;
}

async function createDrill(userId: string, title: string, questionIds: string[], cfg: QuizConfig) {
  if (questionIds.length === 0) throw new LaunchError(cfg.mode === "mistakes" ? "Super – keine nicht gewussten Fragen offen." : "Keine Fragen gefunden.");
  const cats = await prisma.question.findMany({ where: { id: { in: questionIds } }, select: { categoryId: true } });
  const s = await prisma.audioDrillSession.create({
    data: { userId, title, questionIds, categoryIds: Array.from(new Set(cats.map((c) => c.categoryId))), config: cfg as unknown as Prisma.InputJsonValue },
  });
  return `/muendlich/auto/${s.id}`;
}

/** Konfiguration → Sitzung anlegen → Pfad der Vollbild-Route. Speichert die Konfiguration für „Zuletzt“. */
export async function launchQuiz(userId: string, cfg: QuizConfig): Promise<string> {
  const oral = cfg.type === "muendlich";
  let path: string;
  if (oral) {
    const settings = parseDrillSettings((await prisma.audioDrillSettings.findUnique({ where: { userId } }))?.settings);
    switch (cfg.mode) {
      case "simulation": {
        void settings;
        const n = simulationQuestionCount("muendlich", cfg.durationMin ?? 30);
        const pool = await idsWhere({});
        path = await createDrill(userId, `Mündliche Simulation · ${cfg.durationMin} min`, pickRandomUnique(pool.map((q) => q.id), n), cfg);
        break;
      }
      case "chapter":
        path = await createDrill(userId, "Mündlich · Kapitel", await chapterIds(cfg), cfg);
        break;
      case "mini":
        path = await createDrill(userId, "Mündliches Mini-Quiz", await miniIds(userId, 3), cfg);
        break;
      case "mistakes": {
        const again = await prisma.readProgress.findMany({ where: { userId, status: "nochmal", question: activeWhere }, orderBy: { nextRepeatAt: "asc" }, take: 30, select: { questionId: true } });
        path = await createDrill(userId, "Nicht gewusste Fragen", again.map((a) => a.questionId), cfg);
        break;
      }
      case "random":
        path = await createDrill(userId, "Mündlich · Zufällig 10", await randomIds(userId, 10), cfg);
        break;
      case "weak": {
        const w = await weakIds(userId, 10);
        path = await createDrill(userId, `Schwächen: ${w.names.join(", ")}`.slice(0, 190), w.ids, cfg);
        break;
      }
    }
  } else {
    switch (cfg.mode) {
      case "simulation":
        path = await createExam(userId, cfg.durationMin ?? 30, null, simulationQuestionCount("schriftlich", cfg.durationMin ?? 30));
        break;
      case "chapter": {
        const ids = await chapterIds(cfg);
        if (ids.length === 0) throw new LaunchError("Bitte mindestens ein Kapitel wählen.");
        path = cfg.timeLimitMin ? await createExam(userId, cfg.timeLimitMin, ids, ids.length) : await createQuiz(userId, "PRACTICE", `Kapitel-Quiz (${ids.length} Fragen)`, ids, cfg);
        break;
      }
      case "mini":
        path = await createQuiz(userId, "LEARN", "Mini-Quiz (5 Fragen)", await miniIds(userId, 5), cfg);
        break;
      case "mistakes": {
        const open = await prisma.mistakeEntry.findMany({ where: { userId, resolved: false, question: activeWhere }, orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }], take: 20, select: { questionId: true } });
        if (open.length === 0) throw new LaunchError("Super – keine offenen Fehler!");
        path = await createQuiz(userId, "MISTAKES", `Fehler wiederholen (${open.length})`, open.map((o) => o.questionId), cfg);
        break;
      }
      case "random": {
        const ids = await randomIds(userId, 10);
        path = await createQuiz(userId, "PRACTICE", "Zufällig (10 Fragen)", ids, cfg);
        break;
      }
      case "weak": {
        const w = await weakIds(userId, 10);
        path = await createQuiz(userId, "PRACTICE", `Schwächen-Training (${w.ids.length})`, w.ids, cfg);
        break;
      }
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { lastQuizConfig: cfg as unknown as Prisma.InputJsonValue } }).catch(() => undefined);
  return path!;
}

export type LauncherData = {
  due: number;
  mistakes: { schriftlich: number; muendlich: number };
  best: { schriftlich: Record<number, number | null>; muendlich: Record<number, number | null> };
  answerSec: number;
  topics: { id: string; title: string; chapters: { id: string; order: number; name: string; total: number; progress: number }[] }[];
  last: QuizConfig | null;
  lastScore: number | null;
};

/** Daten für den Quiz-Launcher (Zähler, Bestwerte, Kapitel). */
export async function getLauncherData(userId: string): Promise<LauncherData> {
  const { getLernbuchOverview } = await import("@/server/lernbuch");
  const { parseQuizConfig } = await import("@/lib/quiz-config");
  const since = dayKeyToDate(addDays(dayKey(), -365));
  const [due, mistakesW, mistakesO, exams, drills, settingsRow, overview, user] = await Promise.all([
    prisma.reviewItem.count({ where: { userId, dueDate: { lte: dayKeyToDate(dayKey()) }, question: activeWhere } }),
    prisma.mistakeEntry.count({ where: { userId, resolved: false, question: activeWhere } }),
    prisma.readProgress.count({ where: { userId, status: "nochmal", question: activeWhere } }),
    prisma.examAttempt.findMany({ where: { userId, status: { in: ["SUBMITTED", "EXPIRED"] }, durationMinutes: { in: [15, 30, 60] }, startedAt: { gte: since } }, select: { durationMinutes: true, scorePercent: true } }),
    prisma.audioDrillSession.findMany({ where: { userId, finishedAt: { not: null }, config: { not: Prisma.AnyNull } }, select: { config: true, results: true, questionIds: true }, take: 200, orderBy: { finishedAt: "desc" } }),
    prisma.audioDrillSettings.findUnique({ where: { userId }, select: { settings: true } }),
    getLernbuchOverview(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { lastQuizConfig: true } }),
  ]);
  const bestW: Record<number, number | null> = { 15: null, 30: null, 60: null };
  for (const e of exams) if (e.scorePercent !== null) bestW[e.durationMinutes] = Math.max(bestW[e.durationMinutes] ?? 0, Math.round(e.scorePercent));
  const bestO: Record<number, number | null> = { 15: null, 30: null, 60: null };
  let lastScore: number | null = null;
  for (const d of drills) {
    const c = d.config as { mode?: string; durationMin?: number } | null;
    const known = Object.values((d.results as Record<string, string>) ?? {}).filter((x) => x === "known").length;
    const pct = d.questionIds.length ? Math.round((known / d.questionIds.length) * 100) : 0;
    if (c?.mode === "simulation" && c.durationMin && c.durationMin in bestO) bestO[c.durationMin] = Math.max(bestO[c.durationMin] ?? 0, pct);
  }
  const last = parseQuizConfig(user?.lastQuizConfig ?? null);
  if (last?.mode === "simulation" && last.durationMin) lastScore = (last.type === "schriftlich" ? bestW : bestO)[last.durationMin] ?? null;
  return {
    due,
    mistakes: { schriftlich: mistakesW, muendlich: mistakesO },
    best: { schriftlich: bestW, muendlich: bestO },
    answerSec: parseDrillSettings(settingsRow?.settings).answerSec,
    topics: overview.topics.map((t) => ({ id: t.id, title: t.title, chapters: t.chapters.map((c) => ({ id: c.id, order: c.order, name: c.title, total: c.total, progress: c.total ? Math.round((c.read / c.total) * 100) : 0 })) })),
    last,
    lastScore,
  };
}
