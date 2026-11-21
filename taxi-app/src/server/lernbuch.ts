import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import {
  chapterState,
  estMinutes,
  extraExplanation,
  LERNBUCH_TOPICS,
  naturalCompare,
  topicIdForSlug,
  type ChapterOverview,
  type LernbuchOverview,
  type ReadStatus,
  type StoryCard,
} from "@/lib/lernbuch";
import { publishedWhere } from "@/server/questions";

/** Übersicht: Themen + Kapitel + Fortschritt in einem Aufruf. */
export async function getLernbuchOverview(userId: string): Promise<LernbuchOverview> {
  const [categories, counts, reads, progress, dueAgain] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, slug: true, name: true, order: true } }),
    prisma.question.groupBy({ by: ["categoryId"], where: publishedWhere, _count: { _all: true } }),
    prisma.readProgress.findMany({ where: { userId, question: publishedWhere }, select: { status: true, question: { select: { categoryId: true } } } }),
    prisma.chapterProgress.findMany({ where: { userId } }),
    prisma.readProgress.count({ where: { userId, status: "nochmal", nextRepeatAt: { lte: new Date() }, question: publishedWhere } }),
  ]);
  const total = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const readBy = new Map<string, { read: number; understood: number; again: number }>();
  for (const r of reads) {
    const k = r.question.categoryId;
    const v = readBy.get(k) ?? { read: 0, understood: 0, again: 0 };
    v.read++;
    if (r.status === "verstanden") v.understood++;
    if (r.status === "nochmal") v.again++;
    readBy.set(k, v);
  }
  const prog = new Map(progress.map((p) => [p.categoryId, p]));
  const chapters: ChapterOverview[] = categories
    .filter((c) => (total.get(c.id) ?? 0) > 0)
    .map((c) => {
      const t = total.get(c.id) ?? 0;
      const r = readBy.get(c.id) ?? { read: 0, understood: 0, again: 0 };
      const p = prog.get(c.id);
      const base = { total: t, read: Math.min(r.read, t), checkPassed: Boolean(p?.checkPassed) };
      return {
        id: c.id,
        slug: c.slug,
        title: c.name,
        order: c.order,
        topicId: topicIdForSlug(c.slug),
        total: t,
        read: base.read,
        understood: r.understood,
        again: r.again,
        lastPosition: p?.lastPosition ?? 0,
        checkScore: p?.checkScore ?? null,
        checkPassed: base.checkPassed,
        state: chapterState(base),
        estMinutes: estMinutes(t),
        updatedAt: p?.updatedAt?.getTime() ?? 0,
      } as ChapterOverview & { updatedAt: number };
    });
  const topics = LERNBUCH_TOPICS.map((t) => {
    const ch = chapters.filter((c) => c.topicId === t.id).sort((a, b) => a.order - b.order);
    return { id: t.id, title: t.title, description: t.description, icon: t.icon, color: t.color, chapters: ch, total: sum(ch, "total"), read: sum(ch, "read"), understood: sum(ch, "understood") };
  }).filter((t) => t.chapters.length > 0);
  // Weiterlesen: zuletzt bearbeitetes, nicht fertig gelesenes Kapitel – sonst das erste offene
  const ordered = topics.flatMap((t) => t.chapters) as (ChapterOverview & { updatedAt: number })[];
  const started = ordered.filter((c) => c.state === "weiterlesen").sort((a, b) => b.updatedAt - a.updatedAt);
  const current = started[0] ?? ordered.find((c) => c.state === "neu") ?? null;
  return {
    topics,
    total: sum(chapters, "total"),
    read: sum(chapters, "read"),
    understood: sum(chapters, "understood"),
    dueAgain,
    chaptersDone: chapters.filter((c) => c.state === "gelesen" || c.state === "check").length,
    checksPassed: chapters.filter((c) => c.checkPassed).length,
    current,
  };
}

function sum<T>(list: T[], key: keyof T): number {
  return list.reduce((s, x) => s + (x[key] as unknown as number), 0);
}

/** Karten eines Kapitels in Skript-Reihenfolge. */
export async function getChapterCards(userId: string, categoryId: string): Promise<StoryCard[]> {
  const qs = await prisma.question.findMany({
    where: { categoryId, ...publishedWhere },
    select: {
      id: true,
      text: true,
      explanation: true,
      sourceDetail: true,
      mnemonic: true,
      lessonIndex: true,
      origin: true,
      source: { select: { verified: true } },
      options: { select: { text: true, label: true, isCorrect: true }, orderBy: { order: "asc" } },
      readProgress: { where: { userId }, select: { status: true, starred: true } },
    },
  });
  qs.sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0) || naturalCompare(a.id, b.id));
  return qs.map((q) => {
    const answer = q.options.filter((o) => o.isCorrect).map((o) => o.text).join("\n\n");
    return {
      id: q.id,
      question: q.text,
      answer,
      answerLabels: q.options.filter((o) => o.isCorrect).map((o) => o.label),
      wrong: q.options.filter((o) => !o.isCorrect).map((o) => o.text),
      explanation: extraExplanation(answer, q.explanation),
      legal: q.sourceDetail,
      mnemonic: q.mnemonic,
      verified: q.origin === "OFFICIAL" && Boolean(q.source?.verified),
      status: (q.readProgress[0]?.status as ReadStatus | undefined) ?? null,
      starred: Boolean(q.readProgress[0]?.starred),
    };
  });
}

/** Fällige „Nochmal“-Karten (alle Kapitel). */
export async function getRepeatCards(userId: string): Promise<StoryCard[]> {
  const due = await prisma.readProgress.findMany({ where: { userId, status: "nochmal", nextRepeatAt: { lte: new Date() }, question: publishedWhere }, select: { questionId: true }, take: 50 });
  if (due.length === 0) return [];
  const qs = await prisma.question.findMany({
    where: { id: { in: due.map((d) => d.questionId) } },
    select: { id: true, text: true, explanation: true, sourceDetail: true, mnemonic: true, options: { select: { text: true, label: true, isCorrect: true }, orderBy: { order: "asc" } } },
  });
  return qs.map((q) => {
    const answer = q.options.filter((o) => o.isCorrect).map((o) => o.text).join("\n\n");
    return { id: q.id, question: q.text, answer, answerLabels: q.options.filter((o) => o.isCorrect).map((o) => o.label), wrong: q.options.filter((o) => !o.isCorrect).map((o) => o.text), explanation: extraExplanation(answer, q.explanation), legal: q.sourceDetail, mnemonic: q.mnemonic, verified: false, status: "nochmal" as const, starred: false };
  });
}

/**
 * Karte markieren. „verstanden“ an zwei verschiedenen Tagen bleibt verstanden (wird nicht mehr zurückgestuft).
 * „nochmal“ → morgen wieder fällig. Ab 5 gelesenen Karten am Tag zählt der Tag für die Serie.
 */
export async function markCard(userId: string, questionId: string, status: ReadStatus | "starred" | "unstarred"): Promise<{ status: ReadStatus | null; starred: boolean }> {
  const today = dayKey();
  const cur = await prisma.readProgress.findUnique({ where: { userId_questionId: { userId, questionId } } });
  if (status === "starred" || status === "unstarred") {
    const starred = status === "starred";
    const r = await prisma.readProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, status: "gelesen", starred },
      update: { starred },
    });
    return { status: r.status as ReadStatus, starred: r.starred };
  }
  const locked = (cur?.understoodDays.length ?? 0) >= 2 && cur?.status === "verstanden";
  let next: ReadStatus = status;
  if (status === "gelesen" && cur && cur.status !== "gelesen") next = cur.status as ReadStatus; // „gelesen“ stuft nie herab
  if (locked && status !== "verstanden") next = "verstanden";
  const understoodDays = next === "verstanden" && status === "verstanden" ? Array.from(new Set([...(cur?.understoodDays ?? []), today])) : cur?.understoodDays ?? [];
  const nextRepeatAt = next === "nochmal" ? dayKeyToDate(addDays(today, 1)) : null;
  const r = await prisma.readProgress.upsert({
    where: { userId_questionId: { userId, questionId } },
    create: { userId, questionId, status: next, understoodDays, nextRepeatAt },
    update: { status: next, understoodDays, nextRepeatAt, timesRead: { increment: status === "gelesen" ? 1 : 0 } },
  });
  if (!cur) await countReadingActivity(userId);
  return { status: r.status as ReadStatus, starred: r.starred };
}

async function countReadingActivity(userId: string) {
  const start = dayKeyToDate(dayKey());
  const readToday = await prisma.readProgress.count({ where: { userId, updatedAt: { gte: start } } });
  if (readToday === 5) {
    const { touchStreak, addStudyTime } = await import("@/server/progress");
    await touchStreak(userId).catch(() => undefined);
    await addStudyTime(userId, 60).catch(() => undefined);
  }
  await checkReadingAchievements(userId).catch(() => undefined);
}

async function checkReadingAchievements(userId: string) {
  const [total, read] = await Promise.all([prisma.question.count({ where: publishedWhere }), prisma.readProgress.count({ where: { userId, question: publishedWhere } })]);
  const keys: string[] = [];
  if (read >= total * 0.5) keys.push("halbzeit");
  if (total > 0 && read >= total) keys.push("alles-gelesen");
  if (keys.length) {
    const { rewardXp } = await import("@/server/gamification");
    await rewardXp(userId, 0, keys);
  }
}

export async function saveChapterPosition(userId: string, categoryId: string, position: number) {
  const pos = Math.max(0, Math.floor(position));
  const cards = await prisma.question.count({ where: { categoryId, ...publishedWhere } });
  const read = await prisma.readProgress.count({ where: { userId, question: { categoryId, ...publishedWhere } } });
  const completed = cards > 0 && read >= cards;
  const prev = await prisma.chapterProgress.findUnique({ where: { userId_categoryId: { userId, categoryId } } });
  await prisma.chapterProgress.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    create: { userId, categoryId, lastPosition: pos, completedAt: completed ? new Date() : null },
    update: { lastPosition: pos, ...(completed && !prev?.completedAt ? { completedAt: new Date() } : {}) },
  });
  if (completed && !prev?.completedAt) {
    const { rewardXp } = await import("@/server/gamification");
    await rewardXp(userId, 20, ["buecherwurm"]).catch(() => undefined);
  }
}

/** Kapitel-IDs, die fürs Quiz freigeschaltet sind – null = keine Einschränkung. */
export async function unlockedCategoryIds(userId: string): Promise<string[] | null> {
  const settings = await prisma.lernbuchSettings.findUnique({ where: { userId }, select: { quizOnlyUnlocked: true } });
  if (settings && !settings.quizOnlyUnlocked) return null;
  const unlocked = await prisma.chapterProgress.findMany({ where: { userId, unlockedForQuiz: true }, select: { categoryId: true } });
  // Solange noch kein Kapitel freigeschaltet ist, sind alle Fragen erlaubt (sanfter Einstieg)
  return unlocked.length === 0 ? null : unlocked.map((u) => u.categoryId);
}

export async function getLernbuchSettings(userId: string) {
  const s = await prisma.lernbuchSettings.findUnique({ where: { userId } });
  return { autoAdvanceSec: s?.autoAdvanceSec ?? null, showWrongAnswers: s?.showWrongAnswers ?? false, textSize: (s?.textSize ?? "m") as "s" | "m" | "l" | "xl", audioSpeed: s?.audioSpeed ?? 1, quizOnlyUnlocked: s?.quizOnlyUnlocked ?? true };
}

/** Kapitel-Check abgeschlossen: Ergebnis speichern, ab 80 % fürs Quiz freischalten. */
export async function recordChapterCheck(userId: string, attemptId: string, categoryId: string, total: number) {
  const { CHECK_PASS_PERCENT } = await import("@/lib/lernbuch");
  const correct = await prisma.userAnswer.count({ where: { quizAttemptId: attemptId, isCorrect: true } });
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= CHECK_PASS_PERCENT;
  const prev = await prisma.chapterProgress.findUnique({ where: { userId_categoryId: { userId, categoryId } } });
  await prisma.chapterProgress.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    create: { userId, categoryId, checkScore: score, checkPassed: passed, unlockedForQuiz: passed },
    update: { checkScore: Math.max(score, prev?.checkScore ?? 0), ...(passed ? { checkPassed: true, unlockedForQuiz: true } : {}) },
  });
  const { rewardXp } = await import("@/server/gamification");
  if (passed && !prev?.checkPassed) {
    const chapters = await prisma.question.groupBy({ by: ["categoryId"], where: publishedWhere });
    const passedCount = await prisma.chapterProgress.count({ where: { userId, checkPassed: true } });
    await rewardXp(userId, 30, passedCount >= chapters.length ? ["check-meister"] : []).catch(() => undefined);
  }
  return { score, passed, correct };
}

/** Kapitel per Slug (nur aktive Kapitel). */
export async function getChapterBySlug(slug: string) {
  return prisma.category.findFirst({ where: { slug, isActive: true }, select: { id: true, slug: true, name: true, order: true, color: true, icon: true } });
}
