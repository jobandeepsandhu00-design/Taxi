import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrillPlayer, type DrillItem } from "@/components/audio/drill-player";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseDrillSettings } from "@/lib/audio/drill";
import { getAudioMap } from "@/server/audio/urls";

export const metadata: Metadata = { title: "Mündlich – Auto-Modus" };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export default async function DrillPage({ params }: { params: Promise<{ drillId: string }> }) {
  const { drillId } = await params;
  const user = await requireUser();
  const session = await prisma.audioDrillSession.findFirst({ where: { id: drillId, userId: user.id } });
  if (!session) notFound();
  const [settingsRow, qs] = await Promise.all([
    prisma.audioDrillSettings.findUnique({ where: { userId: user.id } }),
    prisma.question.findMany({
      where: { id: { in: session.questionIds } },
      select: { id: true, text: true, explanation: true, mnemonic: true, sourceDetail: true, categoryId: true, category: { select: { name: true, order: true } }, options: { orderBy: { order: "asc" }, select: { text: true, isCorrect: true } } },
    }),
  ]);
  const settings = parseDrillSettings(settingsRow?.settings);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const items: DrillItem[] = session.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => {
      const answer = q.options.filter((o) => o.isCorrect).map((o) => o.text).join("\n");
      return { id: q.id, question: q.text, answer, options: q.options.map((o) => ({ text: o.text, correct: o.isCorrect })), explanation: q.explanation && norm(q.explanation) !== norm(answer) ? q.explanation : null, mnemonic: q.mnemonic, legal: q.sourceDetail, chapter: q.category.name };
    });
  if (items.length === 0) notFound();
  const audio = await getAudioMap(items.map((i) => i.id), settings.voice);
  // nächstes Kapitel (für „Nächstes Kapitel“ am Ende)
  let nextChapterId: string | null = null;
  if (session.categoryIds.length === 1) {
    const cur = await prisma.category.findUnique({ where: { id: session.categoryIds[0] }, select: { order: true } });
    const next = cur ? await prisma.category.findFirst({ where: { isActive: true, order: { gt: cur.order } }, orderBy: { order: "asc" }, select: { id: true } }) : null;
    nextChapterId = next?.id ?? null;
  }
  return (
    <DrillPlayer
      sessionId={session.id}
      title={session.title}
      items={items}
      audio={audio}
      settings={settings}
      startIndex={session.finishedAt ? 0 : Math.min(session.position, items.length - 1)}
      initialResults={(session.results as Record<string, "known" | "unknown">) ?? {}}
      nextChapterId={nextChapterId}
    />
  );
}
