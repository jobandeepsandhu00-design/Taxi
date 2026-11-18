import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { SourceManager } from "./source-manager";

export const metadata: Metadata = { title: "Quellen verwalten" };

export default async function SourcesPage() {
  const sources = await prisma.questionSource.findMany({ orderBy: { title: "asc" }, include: { _count: { select: { questions: true } } } });
  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Quellen & Rechtsgrundlagen"
        description="Offizielle Quellen und Rechtsgrundlagen pflegen. Nur verifizierte Quellen dürfen für offizielle Fragen verwendet werden."
      />
      <SourceManager
        sources={sources.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          reference: s.reference ?? "",
          url: s.url ?? "",
          verified: s.verified,
          verifiedAt: s.verifiedAt?.toISOString() ?? null,
          note: s.note ?? "",
          questionCount: s._count.questions,
        }))}
      />
    </div>
  );
}
