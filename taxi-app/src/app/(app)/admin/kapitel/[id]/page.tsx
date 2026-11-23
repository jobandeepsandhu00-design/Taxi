import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { naturalCompare } from "@/lib/lernbuch";
import { ChapterEditor } from "./chapter-editor";

export const metadata: Metadata = { title: "Kapitel bearbeiten" };

export default async function ChapterEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  const [cat, all] = await Promise.all([
    prisma.category.findUnique({ where: { id }, select: { id: true, name: true, shortDescription: true, isActive: true, order: true } }),
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true } }),
  ]);
  if (!cat) notFound();
  const qs = await prisma.question.findMany({
    where: { categoryId: id },
    select: { id: true, text: true, explanation: true, sourceDetail: true, status: true, lessonIndex: true, options: { orderBy: { order: "asc" }, select: { id: true, text: true, isCorrect: true } } },
  });
  qs.sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0) || naturalCompare(a.id, b.id));
  return (
    <div className="space-y-4 pb-10">
      <Link href="/admin/kapitel" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Alle Kapitel
      </Link>
      <ChapterEditor
        chapter={{ ...cat, no: all.findIndex((c) => c.id === id) + 1 }}
        focusId={q ?? null}
        questions={qs.map((x) => ({ id: x.id, text: x.text, explanation: x.explanation ?? "", sourceDetail: x.sourceDetail ?? "", published: x.status === "PUBLISHED", archived: x.status === "ARCHIVED", options: x.options }))}
      />
    </div>
  );
}
