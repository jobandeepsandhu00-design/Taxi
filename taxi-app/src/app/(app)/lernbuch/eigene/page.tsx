import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { NewChapterForm } from "./new-chapter-form";

export const metadata: Metadata = { title: "Meine Fragen & Kapitel" };

export default async function MyQuestionsPage() {
  const user = await requireUser();
  const [cats, mine, myChapters] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true, _count: { select: { questions: { where: { status: "PUBLISHED" } } } } } }),
    prisma.userQuestion.findMany({ where: { userId: user.id, userChapterId: null }, select: { kind: true, categoryId: true, baseQuestion: { select: { categoryId: true } } } }),
    prisma.userChapter.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, _count: { select: { questions: true } } } }),
  ]);
  const changes = new Map<string, number>();
  for (const m of mine) {
    const c = m.categoryId ?? m.baseQuestion?.categoryId;
    if (c) changes.set(c, (changes.get(c) ?? 0) + 1);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <Link href="/lernbuch" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Lernbuch
      </Link>
      <PageHeader eyebrow="Persönlich" title="Meine Fragen & Kapitel" description="Fragen umformulieren, ausblenden oder eigene hinzufügen – und eigene Kapitel anlegen. Alles nur für dich sichtbar; erscheint in deinem Lernbuch und in deinen Kapitel-Stories." />

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-navy">Eigene Kapitel</h2>
        <NewChapterForm />
        <ul className="space-y-2">
          {myChapters.map((c) => (
            <li key={c.id}>
              <Link href={`/lernbuch/eigene/u-${c.id}`} className="glass flex items-center gap-3 rounded-2xl p-3" data-testid={`my-chapter-${c.id}`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#111] text-lg text-[#FFC400]">★</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-navy">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">{c._count.questions} eigene Fragen</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {myChapters.length === 0 && <li className="text-sm text-muted-foreground">Noch keine eigenen Kapitel.</li>}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-navy">Kapitel des Lernbuchs</h2>
        <ul className="space-y-2">
          {cats.map((c, i) => (
            <li key={c.id}>
              <Link href={`/lernbuch/eigene/${c.id}`} className="glass flex items-center gap-3 rounded-2xl p-3" data-testid={`my-cat-${c.id}`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#111] font-display font-extrabold text-[#FFC400]">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-navy">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c._count.questions} Fragen{changes.get(c.id) ? ` · ${changes.get(c.id)} Änderungen von dir` : ""}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
