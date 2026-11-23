import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { naturalCompare } from "@/lib/lernbuch";
import { publishedWhere } from "@/server/questions";
import { parseOptions } from "@/server/my-questions";
import { MyChapterEditor, type MyItem } from "./my-chapter-editor";

export const metadata: Metadata = { title: "Fragen bearbeiten" };

export default async function MyChapterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  const user = await requireUser();
  const back = (
    <Link href="/lernbuch/eigene" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-link">
      <ChevronLeft className="size-4" /> Meine Fragen & Kapitel
    </Link>
  );

  if (id.startsWith("u-")) {
    const chapter = await prisma.userChapter.findFirst({ where: { id: id.slice(2), userId: user.id }, include: { questions: { where: { kind: "own" }, orderBy: { createdAt: "asc" } } } });
    if (!chapter) notFound();
    const items: MyItem[] = chapter.questions.map((r) => ({ key: r.id, kind: "own", ownId: r.id, text: r.text ?? "", options: parseOptions(r.options), explanation: r.explanation ?? "", changed: false, hidden: false }));
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-10">
        {back}
        <MyChapterEditor chapter={{ kind: "own", id: chapter.id, name: chapter.name }} items={items} focusId={q ?? null} />
      </div>
    );
  }

  const cat = await prisma.category.findFirst({ where: { id, isActive: true }, select: { id: true, name: true } });
  if (!cat) notFound();
  const [qs, rows] = await Promise.all([
    prisma.question.findMany({ where: { categoryId: id, ...publishedWhere }, select: { id: true, text: true, explanation: true, lessonIndex: true, options: { orderBy: { order: "asc" }, select: { text: true, isCorrect: true } } } }),
    prisma.userQuestion.findMany({ where: { userId: user.id, OR: [{ baseQuestion: { categoryId: id } }, { categoryId: id, kind: "own" }] }, orderBy: { createdAt: "asc" } }),
  ]);
  qs.sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0) || naturalCompare(a.id, b.id));
  const byBase = new Map(rows.filter((r) => r.baseQuestionId).map((r) => [r.baseQuestionId!, r]));
  const items: MyItem[] = [
    ...qs.map((x): MyItem => {
      const r = byBase.get(x.id);
      const override = r?.kind === "override";
      const opts = override ? parseOptions(r!.options) : x.options;
      return { key: x.id, kind: "base", baseId: x.id, text: override ? r!.text ?? x.text : x.text, options: opts.length ? opts : x.options, explanation: (override ? r!.explanation : x.explanation) ?? "", changed: override, hidden: r?.kind === "hide" };
    }),
    ...rows.filter((r) => r.kind === "own").map((r): MyItem => ({ key: r.id, kind: "own", ownId: r.id, text: r.text ?? "", options: parseOptions(r.options), explanation: r.explanation ?? "", changed: false, hidden: false })),
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      {back}
      <MyChapterEditor chapter={{ kind: "catalog", id: cat.id, name: cat.name }} items={items} focusId={q ?? null} />
    </div>
  );
}
