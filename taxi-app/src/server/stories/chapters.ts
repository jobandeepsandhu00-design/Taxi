import "server-only";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { chapterSlideId, portionSize, qaDurationMs, type LearnPace, type StoryGroupData, type StorySlideData } from "@/lib/stories";
import { getChapterCards } from "@/server/lernbuch";
import { getMyChapterCards } from "@/server/my-questions";

/**
 * Lern-Story pro Kapitel: jeden Tag eine Portion (Minuten × Fragen pro Minute) – Frage, dann Antwort.
 * Es geht dort weiter, wo du aufgehört hast, bis alle Fragen eines Kapitels einmal dran waren.
 */

const COLORS = ["linear-gradient(160deg,#111,#1e3a8a)", "linear-gradient(160deg,#111,#854d0e)", "linear-gradient(160deg,#0f172a,#064e3b)", "linear-gradient(160deg,#111,#7c2d12)"];

/** Kreise für alle Kapitel (ohne Slides – die werden beim Öffnen geladen). */
export async function chapterGroups(userId: string, pace: LearnPace): Promise<StoryGroupData[]> {
  const todayStart = dayKeyToDate(dayKey());
  const rows = await prisma.$queryRaw<{ id: string; name: string; order: number; total: bigint; seen: bigint; today: bigint }[]>`
    SELECT c.id, c.name, c."order",
      COUNT(q.id) AS total,
      COUNT(v.slide_id) AS seen,
      COUNT(v.slide_id) FILTER (WHERE v.viewed_at >= ${todayStart}) AS today
    FROM "Category" c
    JOIN "Question" q ON q."categoryId" = c.id AND q.status = 'PUBLISHED'
    LEFT JOIN story_views v ON v.user_id = ${userId} AND v.slide_id = 'kap:' || q.id
    WHERE c."isActive" = true
    GROUP BY c.id, c.name, c."order"
    ORDER BY c."order"`;
  const portion = portionSize(pace);
  // eigene Kapitel (nur für diese Person)
  const own = await prisma.userChapter.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, questions: { where: { kind: "own" }, select: { id: true } } } });
  const ownIds = own.flatMap((c) => c.questions.map((q) => `kap:uq:${q.id}`));
  const ownViews = ownIds.length ? await prisma.storyView.findMany({ where: { userId, slideId: { in: ownIds } }, select: { slideId: true, viewedAt: true } }) : [];
  const ownGroups: StoryGroupData[] = own
    .filter((c) => c.questions.length)
    .map((c) => {
      const ids = new Set(c.questions.map((q) => `kap:uq:${q.id}`));
      const v = ownViews.filter((x) => ids.has(x.slideId));
      const total = c.questions.length;
      const today = v.filter((x) => x.viewedAt >= todayStart).length;
      return {
        key: `kap-u-${c.id}`,
        title: `★ ${c.name}`,
        icon: "★",
        ring: ["#FFC400", "#16a34a", "#FFC400"],
        type: "kapitel",
        personal: false,
        createdAt: new Date(`${dayKey()}T05:00:00+01:00`).toISOString(),
        slides: [{ id: `loading:u:${c.id}`, title: c.name, body: "", durationMs: 60_000, kind: "loading", progress: { seen: v.length, total, today, portion } }],
        seenIds: [],
        lazy: { categoryId: `u:${c.id}` },
        done: today >= Math.min(portion, total) || (v.length >= total && today > 0),
      } satisfies StoryGroupData;
    });
  return [...rows.map((r, i) => {
    const total = Number(r.total);
    const seen = Number(r.seen);
    const today = Number(r.today);
    return {
      key: `kap-${r.id}`,
      title: `${i + 1}. ${r.name}`,
      icon: String(i + 1),
      ring: ["#FFC400", "#2563EB", "#FFC400"],
      type: "kapitel",
      personal: false,
      createdAt: new Date(`${dayKey()}T05:00:00+01:00`).toISOString(),
      slides: [{ id: `loading:${r.id}`, title: r.name, body: "", durationMs: 60_000, kind: "loading", progress: { seen, total, today, portion } }],
      seenIds: [],
      lazy: { categoryId: r.id },
      done: today >= Math.min(portion, total) || (seen >= total && today > 0),
    } satisfies StoryGroupData;
  }), ...ownGroups];
}

/** Heutige Portion eines Kapitels: Einstieg, Frage-Antwort-Folien, Abschluss. */
export async function chapterSlides(userId: string, categoryId: string, pace: LearnPace, extra = 0): Promise<StorySlideData[]> {
  const ownChapter = categoryId.startsWith("u:") ? categoryId.slice(2) : null;
  const [cat, cards] = ownChapter
    ? await Promise.all([prisma.userChapter.findFirst({ where: { id: ownChapter, userId }, select: { name: true } }), getMyChapterCards(userId, ownChapter)])
    : await Promise.all([prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } }), getChapterCards(userId, categoryId)]);
  if (!cat || !cards.length) return [];
  const ids = cards.map((c) => chapterSlideId(c.id));
  const views = await prisma.storyView.findMany({ where: { userId, slideId: { in: ids } }, select: { slideId: true, viewedAt: true } });
  const seenAt = new Map(views.map((v) => [v.slideId, v.viewedAt]));
  const todayStart = dayKeyToDate(dayKey());
  const today = views.filter((v) => v.viewedAt >= todayStart).length;
  const portion = portionSize(pace);
  const want = Math.max(1, portion - today) + extra;
  // zuerst ungesehene in Skript-Reihenfolge; sind alle durch, die am längsten nicht gesehenen (Wiederholung)
  const unseen = cards.filter((c) => !seenAt.has(chapterSlideId(c.id)));
  const pool = unseen.length ? unseen : [...cards].sort((a, b) => +seenAt.get(chapterSlideId(a.id))! - +seenAt.get(chapterSlideId(b.id))!);
  const pick = pool.slice(0, want);
  const seen = cards.length - unseen.length;
  const startNo = unseen.length ? seen + 1 : 1;
  const dur = qaDurationMs(pace);
  const progress = { seen, total: cards.length, today, portion };
  const slides: StorySlideData[] = [
    {
      id: `kap-intro:${categoryId}:${dayKey()}`,
      kind: "intro",
      title: cat.name,
      body: unseen.length ? `Heute ${pick.length} ${pick.length === 1 ? "Frage" : "Fragen"} · ca. ${Math.max(1, Math.round(pick.length / pace.qpm))} Min. Erst Frage lesen und selbst überlegen – dann kommt die Antwort.` : "Alle Fragen waren schon dran – jetzt wiederholst du die, die am längsten her sind.",
      durationMs: 10000,
      emoji: "📖",
      bg: COLORS[0],
      progress,
    },
    ...pick.map((c, i) => ({
      id: chapterSlideId(c.id),
      kind: "qa" as const,
      title: `Frage ${unseen.length ? startNo + i : i + 1} von ${cards.length}`,
      body: c.question,
      answer: c.answer,
      explanation: c.explanation,
      credit: c.legal ? `Quelle: ${c.legal}` : null,
      durationMs: dur,
      bg: COLORS[(i + 1) % COLORS.length],
    })),
    {
      id: `kap-end:${categoryId}:${dayKey()}:${today + pick.length}`,
      kind: "end",
      title: "Portion geschafft! 🎉",
      body: `${Math.min(cards.length, seen + (unseen.length ? pick.length : 0))} von ${cards.length} Fragen in diesem Kapitel gesehen. Morgen geht's weiter.`,
      durationMs: 7000,
      emoji: "🏁",
      bg: "linear-gradient(160deg,#854d0e,#f59e0b)",
      cta: ownChapter ? { label: "Eigene Fragen bearbeiten", route: `/lernbuch/eigene/u-${ownChapter}` } : { label: "Kapitel im Lernbuch", route: `/lernbuch/weiter` },
      progress: { ...progress, seen: Math.min(cards.length, seen + (unseen.length ? pick.length : 0)), today: today + pick.length },
    },
  ];
  return slides;
}
