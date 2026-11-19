import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { prisma } from "@/lib/db";
import { QuestionTable } from "./question-table";

export const metadata: Metadata = { title: "Fragen verwalten" };
const PAGE_SIZE = 25;

type SP = { q?: string; kategorie?: string; status?: string; herkunft?: string; schwierigkeit?: string; seite?: string };

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.seite) || 1);
  const where: Prisma.QuestionWhereInput = {
    ...(sp.q ? { OR: [{ text: { contains: sp.q, mode: "insensitive" } }, { id: sp.q }, { tags: { has: sp.q.toLowerCase() } }] } : {}),
    ...(sp.kategorie ? { categoryId: sp.kategorie } : {}),
    ...(sp.status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(sp.status) ? { status: sp.status as "DRAFT" } : {}),
    ...(sp.herkunft && ["OFFICIAL", "PRACTICE", "DEMO"].includes(sp.herkunft) ? { origin: sp.herkunft as "DEMO" } : {}),
    ...(sp.schwierigkeit && ["EASY", "MEDIUM", "HARD"].includes(sp.schwierigkeit) ? { difficulty: sp.schwierigkeit as "EASY" } : {}),
  };
  const [categories, total, questions] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        text: true,
        status: true,
        origin: true,
        difficulty: true,
        multipleCorrect: true,
        updatedAt: true,
        category: { select: { name: true } },
        source: { select: { verified: true } },
        _count: { select: { userAnswers: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/fragen?${new URLSearchParams(Object.entries({ ...sp, seite: String(p) }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Fragenkatalog"
        description={`${total} Fragen in der aktuellen Auswahl`}
        action={
          <>
            <Button asChild variant="outline"><Link href="/admin/import"><Upload /> Import</Link></Button>
            <Button asChild variant="outline"><a href="/api/admin/export"><Download /> Export</a></Button>
            <Button asChild><Link href="/admin/fragen/neu"><Plus /> Neue Frage</Link></Button>
          </>
        }
      />
      <form className="mb-4 grid gap-2 rounded-2xl glass p-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] grid-cols-1">
        <Input name="q" defaultValue={sp.q} placeholder="Text, ID oder Tag" aria-label="Suche" />
        <Select name="kategorie" defaultValue={sp.kategorie ?? ""} aria-label="Kategorie">
          <option value="">Alle Kategorien</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status">
          <option value="">Alle Status</option>
          <option value="PUBLISHED">Veröffentlicht</option>
          <option value="DRAFT">Entwurf</option>
          <option value="ARCHIVED">Archiviert</option>
        </Select>
        <Select name="herkunft" defaultValue={sp.herkunft ?? ""} aria-label="Herkunft">
          <option value="">Alle Herkünfte</option>
          <option value="OFFICIAL">Offiziell</option>
          <option value="PRACTICE">Übung</option>
          <option value="DEMO">Demo</option>
        </Select>
        <Select name="schwierigkeit" defaultValue={sp.schwierigkeit ?? ""} aria-label="Schwierigkeit">
          <option value="">Alle Schwierigkeiten</option>
          <option value="EASY">Leicht</option>
          <option value="MEDIUM">Mittel</option>
          <option value="HARD">Schwer</option>
        </Select>
        <Button type="submit" variant="secondary">Filtern</Button>
      </form>
      <QuestionTable questions={questions.map((q) => ({ ...q, updatedAt: q.updatedAt.toISOString(), answers: q._count.userAnswers, sourceVerified: q.source?.verified ?? false }))} />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="font-semibold text-link" href={link(page - 1)}>← Zurück</Link>}
          <span>Seite {page} / {pages}</span>
          {page < pages && <Link className="font-semibold text-link" href={link(page + 1)}>Weiter →</Link>}
        </div>
      )}
    </div>
  );
}
