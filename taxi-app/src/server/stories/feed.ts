import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { evaluateRules } from "@/lib/coach/rules";
import { achievementInfo } from "@/lib/gamification";
import { DEFAULT_RING, orderGroups, type StoryGroupData, type StorySlideData, type StoryType } from "@/lib/stories";
import { getUserStats } from "@/server/coach/stats";
import { dueReviewIds } from "@/server/lessons";
import { publishedWhere } from "@/server/questions";
import { objectPublicUrl } from "@/server/storage";
import { ensureDaily, quizFromQuestion, resolveDbSlides } from "./daily";

const MOOD_EMOJI: Record<string, string> = { happy: "😄", neutral: "🙂", concerned: "🤔", celebrate: "🎉" };

/* ── persönliche Gruppen ─────────────────────────────────── */

async function toniSlides(userId: string, today: string): Promise<StorySlideData[]> {
  const stats = await getUserStats(userId);
  const insights = evaluateRules(stats).slice(0, 3);
  return insights.map((i, n) => ({
    id: `toni:${today}:${i.id}`,
    title: i.title_de,
    body: i.text_de,
    durationMs: 7000,
    emoji: n === 0 ? "🚕" : (MOOD_EMOJI[i.mood] ?? "🙂"),
    bg: ["linear-gradient(160deg,#111,#3f3f46)", "linear-gradient(160deg,#1e3a8a,#2563eb)", "linear-gradient(160deg,#854d0e,#f59e0b)"][n % 3],
    cta: i.action,
  }));
}

async function quizSlides(userId: string, today: string): Promise<StorySlideData[]> {
  let ids = await dueReviewIds(userId, 2);
  if (ids.length < 2) {
    const mistakes = await prisma.mistakeEntry.findMany({ where: { userId, resolved: false, question: publishedWhere }, orderBy: { lastWrongAt: "desc" }, take: 2 - ids.length, select: { questionId: true } });
    ids = [...ids, ...mistakes.map((m) => m.questionId)];
  }
  if (ids.length < 2) {
    const rnd = await prisma.$queryRaw<{ id: string }[]>`
      SELECT q.id FROM "Question" q JOIN "Category" c ON c.id = q."categoryId"
      WHERE q.status = 'PUBLISHED' AND c."isActive" = true ORDER BY md5(q.id || ${today} || ${userId}) LIMIT ${2 - ids.length}`;
    ids = [...ids, ...rnd.map((r) => r.id)];
  }
  const out: StorySlideData[] = [];
  for (const [i, id] of ids.entries()) {
    const quiz = await quizFromQuestion(id);
    if (quiz) out.push({ id: `quiz:${today}:${id}`, title: i === 0 ? "Dein Quiz des Tages" : "Noch eine", body: "Zählt als echte Antwort für deine Wiederholung.", durationMs: 15000, emoji: "❓", bg: i % 2 ? "linear-gradient(160deg,#1e3a8a,#2563eb)" : "linear-gradient(160deg,#111,#1e3a8a)", quiz });
  }
  return out;
}

async function weekSlides(userId: string, today: string): Promise<StorySlideData[]> {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday !== 0 && weekday !== 1) return []; // Sonntag (und Montag zum Nachholen)
  const report = await prisma.weeklyReport.findFirst({ where: { userId, createdAt: { gte: dayKeyToDate(addDays(today, -2)) } }, orderBy: { createdAt: "desc" } });
  if (!report) return [];
  const d = report.data as { headline?: string; stats?: { answered: number; accuracy: number | null; activeDays: number; streak: number }; strengths?: { name: string; accuracy: number }[]; weaknesses?: { name: string; slug: string }[] };
  const ws = report.weekStart.toISOString().slice(0, 10);
  const slides: StorySlideData[] = [
    { id: `woche:${ws}:1`, title: d.headline ?? "Deine Woche", body: `${d.stats?.answered ?? 0} Fragen an ${d.stats?.activeDays ?? 0} Tagen · Serie ${d.stats?.streak ?? 0} Tage`, durationMs: 7000, big: d.stats?.accuracy != null ? `${d.stats.accuracy} %` : "📊", bg: "linear-gradient(160deg,#111,#854d0e)" },
  ];
  if (d.strengths?.length) slides.push({ id: `woche:${ws}:2`, title: "Deine Stärken 💪", body: d.strengths.map((s) => `${s.name} – ${s.accuracy} %`).join("\n"), durationMs: 6000, emoji: "💪", bg: "linear-gradient(160deg,#064e3b,#059669)" });
  if (d.weaknesses?.length) slides.push({ id: `woche:${ws}:3`, title: "Da geht noch was", body: d.weaknesses.map((s) => s.name).join("\n"), durationMs: 6000, emoji: "🎯", bg: "linear-gradient(160deg,#7c2d12,#ea580c)", cta: { label: "Wochenbericht öffnen", route: "/coach/bericht" } });
  return slides;
}

async function erfolgSlides(userId: string, today: string): Promise<StorySlideData[]> {
  const rows = await prisma.userAchievement.findMany({ where: { userId, unlockedAt: { gte: dayKeyToDate(addDays(today, -3)) } }, orderBy: { unlockedAt: "desc" }, take: 5 });
  return rows.flatMap((a) => {
    const info = achievementInfo(a.key);
    if (!info) return [];
    return [{ id: `erfolg:${a.id}`, title: info.title, body: info.desc ?? "Neues Abzeichen freigeschaltet!", durationMs: 6000, emoji: info.emoji, big: info.emoji, bg: "linear-gradient(160deg,#854d0e,#facc15)", cta: { label: "Alle Erfolge", route: "/fortschritt" } } satisfies StorySlideData];
  });
}

/* ── Feed ────────────────────────────────────────────────── */

/** Alle Story-Gruppen für die Startseite: persönlich zuerst, dann ungesehen, dann gesehen. */
export async function getStoryFeed(userId: string): Promise<StoryGroupData[]> {
  const today = dayKey();
  const now = new Date();
  const groups = await prisma.storyGroup.findMany({
    where: { AND: [{ OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] }, { OR: [{ activeTo: null }, { activeTo: { gte: now } }] }] },
    orderBy: { sort: "asc" },
    include: { slides: { orderBy: { sort: "asc" } } },
  });
  if (!groups.length) return [];
  let daily = await prisma.storyDaily.findMany({ where: { day: dayKeyToDate(today) } });
  const dailyKeys = groups.filter((g) => ["tipp", "ort", "regel", "zahl"].includes(g.type)).map((g) => g.key);
  if (dailyKeys.some((k) => !daily.find((d) => d.groupKey === k))) {
    await ensureDaily(today);
    daily = await prisma.storyDaily.findMany({ where: { day: dayKeyToDate(today) } });
  }
  const dailyBy = new Map(daily.map((d) => [d.groupKey, d]));
  const morning = new Date(`${today}T05:00:00+01:00`).toISOString();

  const built = await Promise.all(
    groups.map(async (g): Promise<StoryGroupData | null> => {
      let slides: StorySlideData[] = [];
      let createdAt = g.createdAt.toISOString();
      try {
        if (dailyBy.has(g.key)) {
          const d = dailyBy.get(g.key)!;
          slides = d.slides as unknown as StorySlideData[];
          createdAt = d.createdAt.toISOString();
        } else if (g.type === "toni") {
          slides = await toniSlides(userId, today);
          createdAt = morning;
        } else if (g.type === "quiz") {
          slides = await quizSlides(userId, today);
          if (!slides.length) slides = await resolveDbSlides(g.slides);
          createdAt = morning;
        } else if (g.type === "woche") {
          slides = await weekSlides(userId, today);
        } else if (g.type === "erfolg") {
          slides = await erfolgSlides(userId, today);
        } else if (!["tipp", "ort", "regel", "zahl"].includes(g.type)) {
          slides = await resolveDbSlides(g.slides); // news, saison: redaktionell
          const newest = g.slides.reduce((m, s) => (s.createdAt > m ? s.createdAt : m), g.createdAt);
          createdAt = newest.toISOString();
        }
      } catch (e) {
        console.warn("stories: feed", g.key, e instanceof Error ? e.message : e);
      }
      if (!slides.length) return null;
      return {
        key: g.key,
        title: g.titleDe,
        icon: g.iconImage && !g.iconImage.includes("/") ? g.iconImage : "🚕",
        iconUrl: g.iconImage?.includes("/") ? (g.iconImage.startsWith("http") ? g.iconImage : objectPublicUrl("stories", g.iconImage)) : null,
        ring: Array.isArray(g.ringColors) && (g.ringColors as unknown[]).length >= 2 ? (g.ringColors as string[]) : DEFAULT_RING,
        type: g.type as StoryType,
        personal: g.isPersonal,
        createdAt,
        slides,
        seenIds: [],
      };
    }),
  );
  const list = built.filter((g): g is StoryGroupData => Boolean(g));
  const allIds = list.flatMap((g) => g.slides.map((s) => s.id));
  const seen = new Set((await prisma.storyView.findMany({ where: { userId, slideId: { in: allIds } }, select: { slideId: true } })).map((v) => v.slideId));
  for (const g of list) g.seenIds = g.slides.filter((s) => seen.has(s.id)).map((s) => s.id);
  // „Erfolge“ nur, bis sie angesehen wurden
  const visible = list.filter((g) => g.type !== "erfolg" || g.seenIds.length < g.slides.length);
  return orderGroups(visible);
}
