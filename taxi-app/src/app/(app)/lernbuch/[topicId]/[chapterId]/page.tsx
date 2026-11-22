import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Mic, CheckCircle2, ChevronDown, ChevronLeft, Headphones, Layers, List, PlayCircle, Star } from "lucide-react";
import { ChapterCheckButton, SpickzettelButton } from "@/components/lernbuch/chapter-actions";
import { ChapterStateBadge } from "@/components/lernbuch/state-badge";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { chapterState, estMinutes, SECTION_SIZE, sectionCount, topicIdForSlug } from "@/lib/lernbuch";
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
  const sections = Array.from({ length: sectionCount(cards.length) }, (_, i) => {
    const part = cards.slice(i * SECTION_SIZE, (i + 1) * SECTION_SIZE);
    return { n: i + 1, from: i * SECTION_SIZE + 1, to: i * SECTION_SIZE + part.length, cards: part, read: part.filter((c) => c.status).length };
  });
  const currentSection = Math.floor(pos / SECTION_SIZE) + 1;
  const modes = [
    { href: `/lernbuch/story/${chapter.slug}?abschnitt=${currentSection}&pos=${pos % SECTION_SIZE}`, title: "Story-Modus", text: "Karte für Karte, Vollbild", icon: BookOpen, testid: "mode-story" },
    { href: `${base}/liste`, title: "Lese-Liste", text: "Alles untereinander", icon: List, testid: "mode-list" },
    { href: `${base}/hoeren`, title: "Hör-Modus", text: "Vorlesen lassen", icon: Headphones, testid: "mode-audio" },
    { href: `${base}/karten`, title: "Karteikarten", text: "Umdrehen & prüfen", icon: Layers, testid: "mode-cards" },
    { href: `/muendlich/auto?kapitel=${chapter.slug}`, title: "Mündlich abfragen", text: "Frage hören, laut antworten", icon: Mic, testid: "mode-oral" },
  ];
  return (
    <div>
      <Link href="/lernbuch" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Alle Kapitel
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

      <h2 className="mb-1 text-lg font-extrabold text-navy">Abschnitte</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        {sections.length} {sections.length === 1 ? "Abschnitt" : "Abschnitte"} à {SECTION_SIZE} Fragen – Schritt für Schritt lesen.
      </p>
      <ol className="space-y-3" data-testid="chapter-sections">
        {sections.map((sec) => {
          const done = sec.read >= sec.cards.length;
          const label = done ? "Nochmal lesen" : sec.read > 0 ? "Weiterlesen" : "Lesen";
          return (
            <li key={sec.n} className="glass overflow-hidden rounded-2xl" data-testid={`section-${sec.n}`}>
              <div className="flex items-center gap-3 p-4">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold", done ? "bg-success/15 text-success" : "bg-primary/15 text-primary")}>
                  {done ? <CheckCircle2 className="size-5" aria-label="Gelesen" /> : sec.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-navy">Abschnitt {sec.n}</p>
                  <p className="text-xs text-muted-foreground">
                    Fragen {sec.from}–{sec.to} · {sec.read}/{sec.cards.length} gelesen
                  </p>
                  <Progress value={(sec.read / sec.cards.length) * 100} className="mt-1.5 h-1.5" barClassName={done ? "bg-success" : undefined} />
                </div>
                <Link
                  href={`/lernbuch/story/${chapter.slug}?abschnitt=${sec.n}`}
                  className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold", done ? "border border-border" : "bg-primary text-primary-foreground")}
                  data-testid={`section-read-${sec.n}`}
                >
                  <PlayCircle className="size-4" /> {label}
                </Link>
              </div>
              <details className="group border-t border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold text-link">
                  Fragen anzeigen <ChevronDown className="size-4 transition group-open:rotate-180" />
                </summary>
                <ol className="space-y-1 px-2 pb-3">
                  {sec.cards.map((c, j) => (
                    <li key={c.id}>
                      <Link href={`/lernbuch/story/${chapter.slug}?abschnitt=${sec.n}&pos=${j}`} className="flex items-start gap-3 rounded-xl p-2 text-sm hover:bg-accent">
                        <span
                          className={cn(
                            "mt-1.5 size-2.5 shrink-0 rounded-full",
                            c.status === "verstanden" ? "bg-success" : c.status === "nochmal" ? "bg-warning" : c.status === "gelesen" ? "bg-primary" : "bg-foreground/15",
                          )}
                          aria-label={c.status ?? "ungelesen"}
                        />
                        <span className="flex-1">
                          <span className="mr-1 font-bold text-muted-foreground">{sec.from + j}.</span>
                          {c.question}
                        </span>
                        {c.starred && <Star className="size-4 shrink-0 fill-primary text-primary" aria-label="Gemerkt" />}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
