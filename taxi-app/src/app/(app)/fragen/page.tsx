import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { BookmarkCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { OriginBadge } from "@/components/origin-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { publishedWhere } from "@/server/questions";

export const metadata: Metadata = { title: "Fragensuche" };
const PAGE_SIZE = 20;

type SP = { q?: string; kategorie?: string; schwierigkeit?: string; merkliste?: string; tag?: string; seite?: string };

export default async function QuestionSearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.seite) || 1);
  const bookmarksOnly = sp.merkliste === "1";
  const difficulty = ["EASY", "MEDIUM", "HARD"].includes(sp.schwierigkeit ?? "") ? (sp.schwierigkeit as "EASY" | "MEDIUM" | "HARD") : undefined;

  const where: Prisma.QuestionWhereInput = {
    ...publishedWhere,
    ...(sp.kategorie ? { category: { slug: sp.kategorie, isActive: true } } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(sp.tag ? { tags: { has: sp.tag.toLowerCase() } } : {}),
    ...(bookmarksOnly ? { bookmarks: { some: { userId: user.id } } } : {}),
    ...(q
      ? {
          OR: [
            { text: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
            { options: { some: { text: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [categories, total, questions, bookmarks] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { slug: true, name: true } }),
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      select: { id: true, text: true, difficulty: true, origin: true, tags: true, category: { select: { name: true } }, source: { select: { verified: true } } },
      orderBy: [{ category: { order: "asc" } }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bookmark.findMany({ where: { userId: user.id }, select: { questionId: true } }),
  ]);
  const bookmarked = new Set(bookmarks.map((b) => b.questionId));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const params = new URLSearchParams(Object.entries({ ...sp, seite: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/fragen?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow={bookmarksOnly ? "Merkliste" : "Fragenkatalog"}
        title={bookmarksOnly ? "Gemerkte Fragen" : "Fragensuche"}
        description={bookmarksOnly ? "Deine gespeicherten Fragen zum gezielten Wiederholen." : "Durchsuche alle veröffentlichten Fragen. Die Lösung siehst du erst nach deiner Antwort."}
      />
      <form className="mb-5 grid gap-2 rounded-2xl glass p-3 sm:grid-cols-[1fr_auto_auto_auto] grid-cols-1" role="search">
        {bookmarksOnly && <input type="hidden" name="merkliste" value="1" />}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Suchbegriff, z. B. „Rettungsgasse“" className="pl-9" aria-label="Suchbegriff" />
        </div>
        <Select name="kategorie" defaultValue={sp.kategorie ?? ""} aria-label="Kategorie">
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </Select>
        <Select name="schwierigkeit" defaultValue={difficulty ?? ""} aria-label="Schwierigkeit">
          <option value="">Alle Schwierigkeiten</option>
          <option value="EASY">Leicht</option>
          <option value="MEDIUM">Mittel</option>
          <option value="HARD">Schwer</option>
        </Select>
        <Button type="submit">Suchen</Button>
      </form>

      <p className="mb-3 text-sm text-muted-foreground">{total} {total === 1 ? "Frage" : "Fragen"} gefunden</p>
      {questions.length === 0 ? (
        <EmptyState icon={bookmarksOnly ? BookmarkCheck : Search} title={bookmarksOnly ? "Noch keine Fragen gemerkt" : "Keine Treffer"} description={bookmarksOnly ? "Tippe bei einer Frage auf das Lesezeichen-Symbol, um sie hier zu speichern." : "Versuche einen anderen Suchbegriff oder Filter."} />
      ) : (
        <ul className="space-y-2">
          {questions.map((qq) => (
            <li key={qq.id}>
              <Link href={`/fragen/${qq.id}`} className="block rounded-2xl glass p-4 transition hover:border-primary/40 hover:shadow-md">
                <p className="font-medium text-foreground">{qq.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">{qq.category.name}</span>
                  <DifficultyBadge difficulty={qq.difficulty} />
                  <OriginBadge origin={qq.origin} verifiedSource={qq.source?.verified} />
                  {bookmarked.has(qq.id) && <BookmarkCheck className="size-4 text-warning" aria-label="Gemerkt" />}
                  {qq.tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded bg-foreground/8 px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
            <Link href={link(page - 1)} aria-disabled={page <= 1}><ChevronLeft /> Zurück</Link>
          </Button>
          <span className="text-sm font-semibold text-navy">Seite {page} von {pages}</span>
          <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-50" : ""}>
            <Link href={link(page + 1)} aria-disabled={page >= pages}>Weiter <ChevronRight /></Link>
          </Button>
        </div>
      )}
    </div>
  );
}
