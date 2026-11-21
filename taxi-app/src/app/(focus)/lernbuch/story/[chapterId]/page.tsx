import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryPlayer } from "@/components/lernbuch/story-player";
import { requireUser } from "@/lib/auth/session";
import { estMinutes, SECTION_SIZE, sectionCount, topicIdForSlug } from "@/lib/lernbuch";
import { prisma } from "@/lib/db";
import { getChapterBySlug, getChapterCards, getLernbuchSettings, getRepeatCards } from "@/server/lernbuch";

export const metadata: Metadata = { title: "Lernbuch – Story" };

export default async function StoryPage({ params, searchParams }: { params: Promise<{ chapterId: string }>; searchParams: Promise<{ pos?: string; abschnitt?: string }> }) {
  const [{ chapterId }, { pos, abschnitt }] = await Promise.all([params, searchParams]);
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
  const chapterProps = { id: chapter.id, slug: chapter.slug, title: chapter.name, order: chapter.order, estMinutes: estMinutes(cards.length), checkPassed: Boolean(progress?.checkPassed) };
  const exitHref = `/lernbuch/${topicIdForSlug(chapter.slug)}/${chapter.slug}`;

  // Abschnitt (10 Fragen)
  if (abschnitt !== undefined) {
    const total = sectionCount(cards.length);
    const n = Math.max(1, Math.min(total, Number.parseInt(abschnitt, 10) || 1));
    const offset = (n - 1) * SECTION_SIZE;
    const part = cards.slice(offset, offset + SECTION_SIZE);
    const firstOpen = part.findIndex((c) => !c.status);
    const p2 = pos !== undefined ? Math.max(0, Math.min(part.length - 1, Number.parseInt(pos, 10) || 0)) : null;
    const anyReadPart = part.some((c) => c.status);
    // Intro, solange im Abschnitt noch nichts gelesen wurde
    const start = !anyReadPart && !p2 ? -1 : (p2 ?? Math.max(0, firstOpen));
    return (
      <StoryPlayer
        key={`s${n}`}
        kind="chapter"
        chapter={chapterProps}
        cards={part}
        startAt={start}
        settings={settings}
        exitHref={exitHref}
        section={{ number: n, total, from: offset + 1, to: offset + part.length, offset, nextHref: n < total ? `/lernbuch/story/${chapter.slug}?abschnitt=${n + 1}` : null }}
      />
    );
  }
  const p = pos !== undefined ? Math.max(0, Math.min(cards.length - 1, Number.parseInt(pos, 10) || 0)) : null;
  const anyRead = cards.some((c) => c.status);
  // Intro nur beim allerersten Öffnen ohne Position
  const startAt = p === null ? (anyRead ? cards.findIndex((c) => !c.status) : -1) : p === 0 && !anyRead ? -1 : p;
  return (
    <StoryPlayer
      kind="chapter"
      chapter={chapterProps}
      cards={cards}
      startAt={startAt === -1 && anyRead ? 0 : startAt}
      settings={settings}
      exitHref={exitHref}
    />
  );
}
