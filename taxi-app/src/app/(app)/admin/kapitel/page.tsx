import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { ChapterList } from "./chapter-list";

export const metadata: Metadata = { title: "Kapitel & Fragen" };

export default async function ChaptersAdminPage() {
  const cats = await prisma.category.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, shortDescription: true, isActive: true, _count: { select: { questions: true } } },
  });
  const published = await prisma.question.groupBy({ by: ["categoryId"], where: { status: "PUBLISHED" }, _count: { _all: true } });
  const pub = new Map(published.map((p) => [p.categoryId, p._count._all]));
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Kapitel & Fragen" description="Alle Kapitel mit ihren Fragen und Antworten: bearbeiten, löschen, neue hinzufügen, Reihenfolge ändern. Änderungen erscheinen sofort im Lernbuch, in den Stories und in den Quizzen." />
      <ChapterList chapters={cats.map((c, i) => ({ id: c.id, no: i + 1, name: c.name, shortDescription: c.shortDescription, isActive: c.isActive, total: c._count.questions, published: pub.get(c.id) ?? 0 }))} />
    </div>
  );
}
