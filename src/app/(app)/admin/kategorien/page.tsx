import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Kategorien verwalten" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { topics: { orderBy: { order: "asc" } }, _count: { select: { questions: true } } },
  });
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Kategorien & Themen" description="Lernkategorien, Einführungstexte, Themen und den Bezug zum offiziellen Prüfungsstoff verwalten." />
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          shortDescription: c.shortDescription,
          introduction: c.introduction,
          color: c.color as "blue",
          icon: c.icon,
          order: c.order,
          difficulty: c.difficulty,
          isActive: c.isActive,
          syllabusReference: c.syllabusReference ?? "",
          syllabusVerified: c.syllabusVerified,
          questionCount: c._count.questions,
          topics: c.topics.map((t) => ({ id: t.id, name: t.name, description: t.description ?? "" })),
        }))}
      />
    </div>
  );
}
