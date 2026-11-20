import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { NumberFactAdmin } from "./number-fact-admin";

export const metadata: Metadata = { title: "Zahlen-Fakten" };

export default async function NumberFactsAdminPage() {
  const facts = await prisma.numberFact.findMany({ orderBy: [{ verified: "asc" }, { category: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Zahlen-Fakten" description="Grundlage für den Zahlen-Trainer. Neue und KI-extrahierte Fakten sind ungeprüft, bis sie hier freigegeben werden." />
      <NumberFactAdmin facts={facts.map((f) => ({ id: f.id, category: f.category, statement: f.statement, value: f.value, unit: f.unit, distractors: f.distractors, legalReference: f.legalReference, verified: f.verified, fromAi: Boolean(f.sourceQuestionId) }))} />
    </div>
  );
}
