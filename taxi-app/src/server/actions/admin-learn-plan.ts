"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./types";

/** Frage einer anderen Lektion zuordnen. */
export async function setQuestionLessonAction(questionId: string, lessonIndex: number): Promise<ActionResult> {
  await requireAdmin();
  const id = z.string().min(1).max(64).parse(questionId);
  const li = z.number().int().min(1).max(500).parse(lessonIndex);
  await prisma.question.update({ where: { id }, data: { lessonIndex: li } });
  revalidatePath("/admin/lernplan");
  return { ok: true, data: undefined, message: `Frage in Lektion ${li} verschoben.` };
}

/** Kategorie neu verteilen: veröffentlichte zuerst, dann nach Schwierigkeit und ID, je 5 Fragen. */
export async function redistributeLessonsAction(categoryId: string): Promise<ActionResult> {
  await requireAdmin();
  const id = z.string().min(1).max(64).parse(categoryId);
  await prisma.$executeRaw`
    UPDATE "Question" q SET "lessonIndex" = x.li
    FROM (
      SELECT id, CEIL(ROW_NUMBER() OVER (ORDER BY (status <> 'PUBLISHED'), difficulty, id) / 5.0)::int AS li
      FROM "Question" WHERE "categoryId" = ${id}
    ) x
    WHERE x.id = q.id`;
  revalidatePath("/admin/lernplan");
  return { ok: true, data: undefined, message: "Lektionen neu verteilt." };
}
