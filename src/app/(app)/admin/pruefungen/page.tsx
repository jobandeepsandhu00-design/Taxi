import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { publishedWhere } from "@/server/questions";
import { ExamConfigManager } from "./exam-config-manager";

export const metadata: Metadata = { title: "Prüfungen konfigurieren" };

export default async function ExamConfigsPage() {
  const [configs, categories, counts] = await Promise.all([
    prisma.examConfig.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], include: { _count: { select: { attempts: true } } } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.question.groupBy({ by: ["categoryId"], where: publishedWhere, _count: { _all: true } }),
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c.categoryId, c._count._all]));
  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Prüfungskonfigurationen"
        description="Dauer, Fragenanzahl, Bestehensgrenze und Verteilung je Kategorie festlegen. Werte erst nach Abgleich mit der offiziellen Prüfungsordnung als „verifiziert“ markieren."
      />
      <ExamConfigManager
        categories={categories.map((c) => ({ ...c, available: countMap[c.id] ?? 0 }))}
        configs={configs.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? "",
          durationMinutes: c.durationMinutes,
          questionCount: c.questionCount,
          passPercentage: c.passPercentage,
          isActive: c.isActive,
          isDefault: c.isDefault,
          verified: c.verified,
          officialReference: c.officialReference ?? "",
          allowedOrigins: c.allowedOrigins,
          categoryDistribution: (c.categoryDistribution ?? {}) as Record<string, number>,
          attempts: c._count.attempts,
        }))}
      />
    </div>
  );
}
