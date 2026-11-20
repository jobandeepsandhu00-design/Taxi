import "server-only";
import { prisma } from "@/lib/db";
import type { LearnPlan } from "@/lib/learn-plan-types";

/** Ganzer Lernplan in einem Datenbankaufruf (get_learn_plan, nur Daten der angegebenen Person). */
export async function getLearnPlan(userId: string): Promise<LearnPlan> {
  const [row] = await prisma.$queryRaw<{ plan: LearnPlan }[]>`SELECT get_learn_plan(${userId}) AS plan`;
  return row.plan;
}
