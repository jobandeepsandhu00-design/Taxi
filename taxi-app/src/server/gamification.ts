import "server-only";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import {
  achievementInfo,
  CATEGORY_ACHIEVEMENTS,
  categoryMastered,
  dailyGoalQuestions,
  isNightOwl,
  levelFor,
  nextLeitner,
  XP,
  type AchievementKey,
} from "@/lib/gamification";
import { publishedWhere } from "./questions";

export interface Reward {
  xpGained: number;
  xp: number;
  levelUp: { index: number; name: string } | null;
  unlocked: { key: string; title: string; emoji: string }[];
}

function addDays(key: string, days: number): Date {
  const d = dayKeyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Schaltet Abzeichen frei (idempotent) und liefert die tatsächlich neuen zurück. */
async function unlock(userId: string, keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const existing = await prisma.userAchievement.findMany({ where: { userId, key: { in: keys } }, select: { key: true } });
  const fresh = keys.filter((k) => !existing.some((e) => e.key === k));
  if (fresh.length) await prisma.userAchievement.createMany({ data: fresh.map((key) => ({ userId, key })), skipDuplicates: true });
  return fresh;
}

async function addXp(userId: string, amount: number): Promise<{ xp: number; levelUp: Reward["levelUp"] }> {
  const user = await prisma.user.update({ where: { id: userId }, data: { xp: { increment: amount } }, select: { xp: true } });
  const before = levelFor(user.xp - amount);
  const after = levelFor(user.xp);
  return { xp: user.xp, levelUp: after.index > before.index ? { index: after.index, name: after.name } : null };
}

function toReward(xpGained: number, xp: number, levelUp: Reward["levelUp"], keys: string[]): Reward {
  return {
    xpGained,
    xp,
    levelUp,
    unlocked: keys.filter((k) => !k.startsWith("level-")).flatMap((k) => {
      const info = achievementInfo(k);
      return info ? [{ key: k, title: info.title, emoji: info.emoji }] : [];
    }),
  };
}

/** Nach jeder Antwort: Leitner-Fach, XP (inkl. Tagesziel-Bonus), Level-Aufstieg und Abzeichen. */
export async function rewardAnswer(params: { userId: string; questionId: string; categoryId: string; isCorrect: boolean }): Promise<Reward> {
  const { userId, questionId, categoryId, isCorrect } = params;
  const today = dayKey();

  const item = await prisma.reviewItem.findUnique({ where: { userId_questionId: { userId, questionId } } });
  const next = nextLeitner(item?.box ?? null, isCorrect);
  await prisma.reviewItem.upsert({
    where: { userId_questionId: { userId, questionId } },
    create: { userId, questionId, box: next.box, dueDate: addDays(today, next.days) },
    update: { box: next.box, dueDate: addDays(today, next.days), lastReviewedAt: new Date() },
  });

  const [user, activity, streak, totals] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyGoalMinutes: true } }),
    prisma.dailyActivity.findUnique({ where: { userId_date: { userId, date: dayKeyToDate(today) } }, select: { questionsAnswered: true } }),
    prisma.learningStreak.findUnique({ where: { userId }, select: { currentStreak: true } }),
    prisma.userProgress.aggregate({ where: { userId }, _sum: { answeredCount: true } }),
  ]);

  let gained = isCorrect ? XP.correct : XP.wrong;
  if (activity && activity.questionsAnswered === dailyGoalQuestions(user.dailyGoalMinutes)) gained += XP.dailyGoal;

  const candidates: AchievementKey[] = [];
  if ((totals._sum.answeredCount ?? 0) >= 100) candidates.push("erste-100");
  if ((streak?.currentStreak ?? 0) >= 7) candidates.push("serie-7");
  if (isNightOwl()) candidates.push("nachteule");
  if (isCorrect) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { slug: true } });
    const key = cat ? CATEGORY_ACHIEVEMENTS[cat.slug] : undefined;
    if (key) {
      const [progress, published] = await Promise.all([
        prisma.userProgress.findUnique({ where: { userId_categoryId: { userId, categoryId } }, select: { masteredCount: true } }),
        prisma.question.count({ where: { ...publishedWhere, categoryId } }),
      ]);
      if (categoryMastered(progress?.masteredCount ?? 0, published)) candidates.push(key);
    }
  }

  const { xp, levelUp } = await addXp(userId, gained);
  const keys = await unlock(userId, [...candidates, ...(levelUp ? [`level-${levelUp.index}`] : [])]);
  return toReward(gained, xp, levelUp, keys);
}

/** Nach einer Prüfungssimulation: XP für Abschluss, Bonus fürs Bestehen, Abzeichen „Bestanden!". */
export async function rewardExam(userId: string, passed: boolean): Promise<Reward> {
  const gained = XP.examCompleted + (passed ? XP.examPassedBonus : 0);
  const { xp, levelUp } = await addXp(userId, gained);
  const keys = await unlock(userId, [...(passed ? ["erste-pruefung"] : []), ...(levelUp ? [`level-${levelUp.index}`] : [])]);
  return toReward(gained, xp, levelUp, keys);
}

/** Noch nicht angezeigte Freischaltungen (für die Feier-Animation). */
export async function getUnseenAchievements(userId: string) {
  const rows = await prisma.userAchievement.findMany({ where: { userId, seenAt: null }, orderBy: { unlockedAt: "asc" }, take: 5 });
  return rows.flatMap((r) => {
    const info = achievementInfo(r.key);
    return info ? [{ key: r.key, title: info.title, desc: info.desc, emoji: info.emoji, isLevel: info.isLevel, levelIndex: info.levelIndex }] : [];
  });
}

export async function getDueReviewCount(userId: string): Promise<number> {
  return prisma.reviewItem.count({ where: { userId, dueDate: { lte: dayKeyToDate(dayKey()) }, question: publishedWhere } });
}
