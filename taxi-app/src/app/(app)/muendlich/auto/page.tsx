import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseDrillSettings } from "@/lib/audio/drill";
import { getAudioMap } from "@/server/audio/urls";
import { getLernbuchOverview } from "@/server/lernbuch";
import { publishedWhere } from "@/server/questions";
import { AutoStart, type StartChapter } from "./auto-start";

export const metadata: Metadata = { title: "Mündlich – Auto-Modus" };

export default async function AutoModusPage({ searchParams }: { searchParams: Promise<{ kapitel?: string }> }) {
  const user = await requireUser();
  const { kapitel } = await searchParams;
  const [settingsRow, overview, sessions, open, questions, again] = await Promise.all([
    prisma.audioDrillSettings.findUnique({ where: { userId: user.id } }),
    getLernbuchOverview(user.id),
    prisma.audioDrillSession.findMany({ where: { userId: user.id, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, take: 200, select: { categoryIds: true, results: true, questionIds: true } }),
    prisma.audioDrillSession.findFirst({ where: { userId: user.id, finishedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, position: true, questionIds: true } }),
    prisma.question.findMany({ where: { ...publishedWhere, category: { isActive: true } }, select: { id: true, categoryId: true } }),
    prisma.readProgress.count({ where: { userId: user.id, status: "nochmal" } }),
  ]);
  const settings = parseDrillSettings(settingsRow?.settings);
  const audio = await getAudioMap(questions.map((q) => q.id), settings.voice);
  const byCat = new Map<string, { qMs: number; aMs: number; urls: string[]; withAudio: number }>();
  for (const q of questions) {
    const a = audio[q.id];
    const v = byCat.get(q.categoryId) ?? { qMs: 0, aMs: 0, urls: [], withAudio: 0 };
    if (a?.question) {
      v.qMs += a.question.ms;
      v.withAudio++;
      v.urls.push(a.question.mp3);
    }
    if (a?.answer) {
      v.aMs += a.answer.ms;
      v.urls.push(a.answer.mp3);
    }
    byCat.set(q.categoryId, v);
  }
  // letztes Ergebnis je Kapitel (Durchgang nur mit diesem Kapitel)
  const last = new Map<string, { known: number; total: number }>();
  for (const s of sessions) {
    if (s.categoryIds.length !== 1 || last.has(s.categoryIds[0])) continue;
    const r = Object.values((s.results as Record<string, string>) ?? {});
    last.set(s.categoryIds[0], { known: r.filter((x) => x === "known").length, total: s.questionIds.length });
  }
  const topics = overview.topics.map((t) => ({
    id: t.id,
    title: t.title,
    chapters: t.chapters.map(
      (c): StartChapter => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        order: c.order,
        total: c.total,
        qMs: byCat.get(c.id)?.qMs ?? 0,
        aMs: byCat.get(c.id)?.aMs ?? 0,
        withAudio: byCat.get(c.id)?.withAudio ?? 0,
        urls: byCat.get(c.id)?.urls ?? [],
        last: last.get(c.id) ?? null,
      }),
    ),
  }));
  return (
    <AutoStart
      settings={settings}
      topics={topics}
      open={open && open.position < open.questionIds.length ? { title: open.title, position: open.position, total: open.questionIds.length } : null}
      againCount={again}
      preselect={kapitel ?? null}
    />
  );
}
