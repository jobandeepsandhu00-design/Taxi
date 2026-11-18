import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { loadQuestionFormData } from "../form-data";
import { QuestionForm } from "../question-form";

export const metadata: Metadata = { title: "Neue Frage" };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ kategorie?: string }> }) {
  const { kategorie } = await searchParams;
  const { categories, sources } = await loadQuestionFormData();
  return (
    <div>
      <PageHeader eyebrow="Fragenkatalog" title="Neue Frage erstellen" />
      <QuestionForm
        id={null}
        categories={categories}
        sources={sources}
        initial={{
          text: "",
          explanation: "",
          categoryId: kategorie ?? categories[0]?.id ?? "",
          topicId: null,
          difficulty: "MEDIUM",
          multipleCorrect: false,
          imageUrl: null,
          tags: [],
          status: "DRAFT",
          origin: "PRACTICE",
          sourceId: null,
          sourceDetail: "",
          options: (["A", "B", "C", "D"] as const).map((label, i) => ({ label, text: "", isCorrect: i === 0, explanation: "" })),
        }}
      />
    </div>
  );
}
