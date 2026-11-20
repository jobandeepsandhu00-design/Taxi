import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { HELPER_LANGS } from "@/lib/languages";
import { publishedWhere } from "@/server/questions";
import { BatchRunner, VariantReviewList } from "./variant-admin";

export const metadata: Metadata = { title: "KI-Varianten" };

export default async function VariantsAdminPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = "gemeldet" } = await searchParams;
  const [total, counts, flaggedIds] = await Promise.all([
    prisma.question.count({ where: publishedWhere }),
    prisma.questionVariant.groupBy({ by: ["kind", "lang", "verified"], _count: { _all: true } }),
    prisma.variantFeedback.findMany({ where: { rating: -1 }, select: { variantId: true }, distinct: ["variantId"] }),
  ]);
  const flagged = new Set(flaggedIds.map((f) => f.variantId));
  const where =
    filter === "gemeldet" ? { id: { in: [...flagged] } } : filter === "ungeprueft" ? { verified: false, kind: { notIn: ["glossary"] } } : filter === "geprueft" ? { verified: true } : {};
  const variants = await prisma.questionVariant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, kind: true, lang: true, content: true, verified: true, model: true, createdAt: true, question: { select: { id: true, text: true } }, _count: { select: { feedback: { where: { rating: -1 } } } } },
  });
  const stat = (kind: string, lang: string) => counts.filter((c) => c.kind === kind && c.lang === lang).reduce((s, c) => s + c._count._all, 0);
  const rows = [
    { kind: "simple", lang: "de", label: "Einfache Sprache (B1)" },
    { kind: "why", lang: "de", label: "„Warum?“ (Deutsch)" },
    ...HELPER_LANGS.map((l) => ({ kind: "translation", lang: l.code, label: `Übersetzung · ${l.label}` })),
  ].map((r) => ({ ...r, done: stat(r.kind, r.lang), total }));
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="KI-Varianten" description="Einfache Sprache, Glossar, Übersetzungen und „Warum?“-Erklärungen werden einmal erzeugt und danach aus der Datenbank ausgeliefert. Hier stapelweise erzeugen und prüfen." />
      <BatchRunner rows={rows} />
      <VariantReviewList
        filter={filter}
        flaggedCount={flagged.size}
        items={variants.map((v) => ({
          id: v.id,
          kind: v.kind,
          lang: v.lang,
          verified: v.verified,
          model: v.model,
          flags: v._count.feedback,
          createdAt: v.createdAt.toISOString(),
          questionId: v.question.id,
          questionText: v.question.text,
          content: v.content as Record<string, unknown>,
        }))}
      />
    </div>
  );
}
