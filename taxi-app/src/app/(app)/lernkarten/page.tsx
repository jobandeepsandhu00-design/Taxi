import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StudyHeartbeat } from "@/components/quiz/study-heartbeat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { shuffle } from "@/lib/quiz-logic";
import { resetFlashcardsAction } from "@/server/actions/learning";
import { publishedWhere } from "@/server/questions";
import { FlashcardDeck, type Flashcard } from "./flashcard-deck";

export const metadata: Metadata = { title: "Lernkarten" };

const FILTERS = {
  alle: "Alle Karten",
  offen: "Noch nicht gelernt",
  schwierig: "Schwierige Karten",
  neu: "Neue Karten",
} as const;
type Filter = keyof typeof FILTERS;

export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ kategorie?: string; filter?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter: Filter = (sp.filter && sp.filter in FILTERS ? sp.filter : "offen") as Filter;

  const progressFilter: Prisma.QuestionWhereInput =
    filter === "offen"
      ? { flashcards: { none: { userId: user.id, status: "LEARNED" } } }
      : filter === "schwierig"
        ? { flashcards: { some: { userId: user.id, difficultCount: { gt: 0 }, status: { not: "LEARNED" } } } }
        : filter === "neu"
          ? { flashcards: { none: { userId: user.id } } }
          : {};

  const [categories, rows, stats] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { slug: true, name: true } }),
    prisma.question.findMany({
      where: { ...publishedWhere, ...(sp.kategorie ? { category: { slug: sp.kategorie } } : {}), ...progressFilter },
      select: {
        id: true,
        text: true,
        explanation: true,
        imageUrl: true,
        category: { select: { name: true, color: true } },
        options: { where: { isCorrect: true }, select: { label: true, text: true }, orderBy: { order: "asc" } },
        flashcards: { where: { userId: user.id }, select: { status: true, difficultCount: true } },
      },
      take: 200,
    }),
    prisma.flashcardProgress.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
  ]);
  const learned = stats.find((s) => s.status === "LEARNED")?._count._all ?? 0;
  const learning = stats.find((s) => s.status === "LEARNING")?._count._all ?? 0;

  // Schwierige Karten zuerst, dann zufällig
  const cards: Flashcard[] = shuffle(rows)
    .sort((a, b) => (b.flashcards[0]?.difficultCount ?? 0) - (a.flashcards[0]?.difficultCount ?? 0))
    .map((r) => ({
      id: r.id,
      front: r.text,
      answers: r.options.map((o) => `${o.label}) ${o.text}`),
      explanation: r.explanation,
      imageUrl: r.imageUrl,
      category: r.category.name,
      status: r.flashcards[0]?.status ?? "NEW",
    }));

  return (
    <div>
      <StudyHeartbeat />
      <PageHeader eyebrow="Lernkarten" title="Karteikarten" description="Frage lesen, Antwort überlegen, Karte umdrehen – und ehrlich bewerten. Nicht gelernte Karten kommen wieder." />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] grid-cols-1">
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Select name="kategorie" defaultValue={sp.kategorie ?? ""} aria-label="Kategorie">
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
          <Select name="filter" defaultValue={filter} aria-label="Kartenauswahl">
            {Object.entries(FILTERS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Anwenden</Button>
        </form>
        <div className="flex gap-2">
          <Card className="flex items-center gap-2 px-4 py-2 text-sm"><span className="font-extrabold text-emerald-600">{learned}</span> gelernt</Card>
          <Card className="flex items-center gap-2 px-4 py-2 text-sm"><span className="font-extrabold text-amber-600">{learning}</span> in Arbeit</Card>
        </div>
      </div>
      {cards.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Keine Karten in dieser Auswahl"
          description={filter === "offen" ? "Du hast alle Karten dieser Auswahl als gelernt markiert. Stark!" : "Wähle einen anderen Filter."}
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link href="/lernkarten?filter=alle">Alle Karten anzeigen</Link></Button>
              {learned + learning > 0 && (
                <form action={resetFlashcardsAction}><Button type="submit" variant="ghost">Fortschritt zurücksetzen</Button></form>
              )}
            </div>
          }
        />
      ) : (
        <FlashcardDeck key={`${sp.kategorie}-${filter}`} cards={cards} />
      )}
    </div>
  );
}
