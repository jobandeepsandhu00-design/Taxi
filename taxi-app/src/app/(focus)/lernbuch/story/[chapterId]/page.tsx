import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryPlayer } from "@/components/lernbuch/story-player";
import { requireUser } from "@/lib/auth/session";
import { estMinutes, topicIdForSlug } from "@/lib/lernbuch";
import { prisma } from "@/lib/db";
import { getChapterBySlug, getChapterCards, getLernbuchSettings, getRepeatCards } from "@/server/lernbuch";

export const metadata: Metadata = { title: "Lernbuch – Story" };

export default async function StoryPage({ params, searchParams }: { params: Promise<{ chapterId: string }>; searchParams: Promise<{ pos?: string }> }) {
  const [{ chapterId }, { pos }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const settings = await getLernbuchSettings(user.id);

  if (chapterId === "wiederholung") {
    const cards = await getRepeatCards(user.id);
    return <StoryPlayer kind="repeat" chapter={null} cards={cards} startAt={cards.length ? 0 : -1} settings={settings} exitHref="/lernbuch" />;
  }

  const chapter = await getChapterBySlug(chapterId);
  if (!chapter) notFound();
  const [cards, progress] = await Promise.all([
    getChapterCards(user.id, chapter.id),
    prisma.chapterProgress.findUnique({ where: { userId_categoryId: { userId: user.id, categoryId: chapter.id } }, select: { checkPassed: true } }),
  ]);
  if (cards.length === 0) notFound();
  const p = pos !== undefined ? Math.max(0, Math.min(cards.length - 1, Number.parseInt(pos, 10) || 0)) : null;
  const anyRead = cards.some((c) => c.status);
  // Intro nur beim allerersten Öffnen ohne Position
  const startAt = p === null ? (anyRead ? cards.findIndex((c) => !c.status) : -1) : p === 0 && !anyRead ? -1 : p;
  return (
    <StoryPlayer
      kind="chapter"
      chapter={{ id: chapter.id, slug: chapter.slug, title: chapter.name, order: chapter.order, estMinutes: estMinutes(cards.length), checkPassed: Boolean(progress?.checkPassed) }}
      cards={cards}
      startAt={startAt === -1 && anyRead ? 0 : startAt}
      settings={settings}
      exitHref={`/lernbuch/${topicIdForSlug(chapter.slug)}/${chapter.slug}`}
    />
  );
}
