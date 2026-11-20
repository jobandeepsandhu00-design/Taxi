import { redirect } from "next/navigation";

/** Alte Adresse – Lernsitzungen laufen jetzt im Fokus-Modus unter /quiz/[id]. */
export default async function LegacySessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/quiz/${id}`);
}
