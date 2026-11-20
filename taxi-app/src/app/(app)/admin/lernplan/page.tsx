import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { LessonOrderAdmin } from "./lesson-order-admin";

export const metadata: Metadata = { title: "Lernplan verwalten" };

export default async function LearnPlanAdminPage({ searchParams }: { searchParams: Promise<{ kategorie?: string }> }) {
  const { kategorie } = await searchParams;
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true, slug: true } });
  const current = categories.find((c) => c.slug === kategorie) ?? categories[0];
  const questions = current
    ? await prisma.question.findMany({
        where: { categoryId: current.id },
        orderBy: [{ lessonIndex: "asc" }, { difficulty: "asc" }, { id: "asc" }],
        select: { id: true, text: true, lessonIndex: true, difficulty: true, status: true },
      })
    : [];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Lernplan verwalten" description="Fragen sind je Kategorie in Lektionen zu 5 Fragen eingeteilt (automatisch nach Schwierigkeit). Hier kannst du Fragen verschieben oder neu verteilen." />
      <LessonOrderAdmin
        categories={categories}
        current={current ? { id: current.id, slug: current.slug, name: current.name } : null}
        questions={questions.map((q) => ({ id: q.id, text: q.text, lessonIndex: q.lessonIndex ?? 1, difficulty: q.difficulty, published: q.status === "PUBLISHED" }))}
      />
    </div>
  );
}
