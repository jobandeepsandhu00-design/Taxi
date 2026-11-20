import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { parseFollowUps, parseKeyPoints } from "@/lib/oral";
import { OralAdmin } from "./oral-admin";

export const metadata: Metadata = { title: "Mündliche Fragen" };

export default async function OralAdminPage() {
  const [questions, categories] = await Promise.all([
    prisma.oralQuestion.findMany({ orderBy: [{ verified: "asc" }, { createdAt: "asc" }], include: { category: { select: { name: true } }, _count: { select: { attempts: true } } } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Mündliche Fragen" description="Musterantworten und Kernpunkte sind die einzige Bewertungsgrundlage der KI. Neue und geänderte Fragen sind ungeprüft, bis sie hier freigegeben werden." />
      <OralAdmin
        categories={categories}
        questions={questions.map((q) => {
          const points = parseKeyPoints(q.keyPoints);
          const fu = parseFollowUps(q.followUps)[0];
          return {
            id: q.id,
            categoryId: q.categoryId,
            category: q.category.name,
            questionDe: q.questionDe,
            modelAnswerDe: q.modelAnswerDe,
            keyPoints: points,
            legalReference: q.legalReference,
            difficulty: q.difficulty,
            examMode: q.examMode ?? "",
            followUpQuestion: fu?.question_de ?? "",
            followUpPoint: Math.max(1, points.findIndex((p) => p.id === fu?.trigger_point_id) + 1),
            verified: q.verified,
            attempts: q._count.attempts,
          };
        })}
      />
    </div>
  );
}
