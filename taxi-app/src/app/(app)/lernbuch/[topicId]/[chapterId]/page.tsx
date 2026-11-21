import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, Headphones, Layers, List, Star } from "lucide-react";
import { ChapterCheckButton, SpickzettelButton } from "@/components/lernbuch/chapter-actions";
import { ChapterStateBadge } from "@/components/lernbuch/state-badge";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { chapterState, estMinutes, topicIdForSlug } from "@/lib/lernbuch";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { getChapterBySlug, getChapterCards } from "@/server/lernbuch";

export const metadata: Metadata = { title: "Lernbuch – Kapitel" };

export default async function ChapterPage({ params }: { params: Promise<{ topicId: string; chapterId: string }> }) {
  const { topicId, chapterId } = await params;
  const user = await requireUser();
  const chapter = await getChapterBySlug(chapterId);
  if (!chapter || topicIdForSlug(chapter.slug) !== topicId) notFound();
  const [cards, progress] = await Promise.all([
    getChapterCards(user.id, chapter.id),
    prisma.chapterProgress.findUnique({ where: { userId_categoryId: { userId: user.id, categoryId: chapter.id } } }),
  ]);
  const read = cards.filter((c) => c.status).length;
  const state = chapterState({ total: cards.length, read, checkPassed: Boolean(progress?.checkPassed) });
  const pos = Math.min(progress?.lastPosition ?? 0, Math.max(0, cards.length - 1));
  const base = `/lernbuch/${topicId}/${chapter.slug}`;
  const modes = [
    { href: `/lernbuch/story/${chapter.slug}?pos=${pos}`, title: "Story-Modus", text: "Karte für Karte, Vollbild", icon: BookOpen, testid: "mode-story" },
    { href: `${base}/liste`, title: "Lese-Liste", text: "Alles untereinander", icon: List, testid: "mode-list" },
    { href: `${base}/hoeren`, title: "Hör-Modus", text: "Vorlesen lassen", icon: Headphones, testid: "mode-audio" },
    { href: `${base}/karten`, title: "Karteikarten", text: "Umdrehen & prüfen", icon: Layers, testid: "mode-cards" },
  ];
  return (
    <div>
      <Link href={`/lernbuch/${topicId}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Zurück zum Thema
      </Link>
      <PageHeader eyebrow={`Kapitel ${chapter.order}`} title={chapter.name} description={`${cards.length} Karten · ca. ${estMinutes(cards.length)} Min. Lesezeit`} action={<ChapterStateBadge state={state} className="text-xs" />} />
      <div className="mb-5">
        <div className="mb-1 flex justify-between text-xs font-semibold">
          <span className="text-muted-foreground">{read} von {cards.length} gelesen</span>
          <span className="text-primary">{cards.length ? Math.round((read / cards.length) * 100) : 0}%</span>
        </div>
        <Progress value={cards.length ? (read / cards.length) * 100 : 0} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        {modes.map((m) => (
          <Link key={m.href} href={m.href} className="glass glow-hover flex flex-col gap-2 rounded-2xl p-4" data-testid={m.testid}>
            <m.icon className="size-6 text-primary" />
            <span className="font-extrabold text-navy">{m.title}</span>
            <span className="text-xs text-muted-foreground">{m.text}</span>
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SpickzettelButton categoryId={chapter.id} title={chapter.name} />
        <ChapterCheckButton categoryId={chapter.id} ready={read >= cards.length} remaining={cards.length - read} score={progress?.checkScore ?? null} />
      </div>

      <h2 className="mb-3 text-lg font-extrabold text-navy">Alle Fragen</h2>
      <ol className="space-y-2" data-testid="chapter-questions">
        {cards.map((c, i) => (
          <li key={c.id}>
            <Link href={`/lernbuch/story/${chapter.slug}?pos=${i}`} className="glass flex items-start gap-3 rounded-xl p-3 text-sm hover:bg-accent">
              <span
                className={cn(
                  "mt-1 size-2.5 shrink-0 rounded-full",
                  c.status === "verstanden" ? "bg-success" : c.status === "nochmal" ? "bg-warning" : c.status === "gelesen" ? "bg-primary" : "bg-foreground/15",
                )}
                aria-label={c.status ?? "ungelesen"}
              />
              <span className="flex-1"><span className="mr-1 font-bold text-muted-foreground">{i + 1}.</span>{c.question}</span>
              {c.starred && <Star className="size-4 shrink-0 fill-primary text-primary" aria-label="Gemerkt" />}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
