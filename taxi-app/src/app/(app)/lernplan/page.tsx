import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getLearnPlan } from "@/server/learn-plan";
import { PlanView } from "./plan-view";

export const metadata: Metadata = { title: "Lernplan" };

export default async function LearnPlanPage({ searchParams }: { searchParams: Promise<{ gesperrt?: string }> }) {
  const user = await requireUser();
  const { gesperrt } = await searchParams;
  const plan = await getLearnPlan(user.id);
  return <PlanView initial={plan} lockedHint={gesperrt ?? null} />;
}
