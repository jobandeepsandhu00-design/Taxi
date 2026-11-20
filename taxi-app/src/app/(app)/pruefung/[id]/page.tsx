import { redirect } from "next/navigation";

/** Alte Adresse – Prüfungen laufen jetzt im Fokus-Modus unter /quiz/[id]. */
export default async function LegacyExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/quiz/${id}`);
}
