import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { loadQuestionFormData } from "../form-data";
import { QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Frage bearbeiten" };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [question, { categories, sources }] = await Promise.all([
    prisma.question.findUnique({ where: { id }, include: { options: { orderBy: { order: "asc" } }, createdBy: { select: { name: true } } } }),
    loadQuestionFormData(),
  ]);
  if (!question) notFound();
  const labels = ["A", "B", "C", "D"] as const;
  return (
    <div>
      <PageHeader
        eyebrow="Fragenkatalog"
        title="Frage bearbeiten"
        description={`ID ${question.id} · erstellt ${formatDate(question.createdAt)}${question.createdBy ? ` von ${question.createdBy.name}` : ""} · zuletzt geändert ${formatDate(question.updatedAt, true)}`}
      />
      <QuestionForm
        id={question.id}
        categories={categories}
        sources={sources}
        initial={{
          text: question.text,
          explanation: question.explanation,
          categoryId: question.categoryId,
          topicId: question.topicId,
          difficulty: question.difficulty,
          multipleCorrect: question.multipleCorrect,
          imageUrl: question.imageUrl,
          tags: question.tags,
          status: question.status,
          origin: question.origin,
          sourceId: question.sourceId,
          sourceDetail: question.sourceDetail ?? "",
          options: labels.map((label) => {
            const o = question.options.find((x) => x.label === label);
            return { label, text: o?.text ?? "", isCorrect: o?.isCorrect ?? false, explanation: o?.explanation ?? "" };
          }),
        }}
      />
    </div>
  );
}
