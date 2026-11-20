import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { coachConfigured } from "@/server/coach/llm";
import { OralExam } from "./oral-exam";

export const metadata: Metadata = { title: "Mündliche Prüfung" };

export default async function OralExamPage() {
  await requireUser();
  return <OralExam enabled={coachConfigured()} />;
}
