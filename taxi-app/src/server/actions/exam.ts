"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { selectExamQuestions } from "@/lib/quiz-logic";
import { finalizeExam } from "@/server/exam";
import { publishedWhere } from "@/server/questions";
import type { ActionResult } from "./types";

const idSchema = z.string().min(1).max(64);

export async function startExamAction(formData: FormData) {
  const user = await requireUser();
  const configId = idSchema.parse(formData.get("examConfigId"));
  const config = await prisma.examConfig.findFirst({ where: { id: configId, isActive: true } });
  if (!config) redirect("/pruefung?fehler=konfiguration");

  // Offene Prüfung desselben Typs fortsetzen statt neu zu starten
  const open = await prisma.examAttempt.findFirst({
    where: { userId: user.id, examConfigId: config.id, status: "IN_PROGRESS", expiresAt: { gt: new Date() } },
  });
  if (open) redirect(`/pruefung/${open.id}`);

  const pool = await prisma.question.findMany({
    where: { ...publishedWhere, ...(config.allowedOrigins.length ? { origin: { in: config.allowedOrigins } } : {}) },
    select: { id: true, categoryId: true },
  });
  const distribution = (config.categoryDistribution ?? null) as Record<string, number> | null;
  const ids = selectExamQuestions(pool, config.questionCount, distribution);
  if (ids.length === 0) redirect("/pruefung?fehler=keine-fragen");

  const now = new Date();
  const attempt = await prisma.examAttempt.create({
    data: {
      userId: user.id,
      examConfigId: config.id,
      durationMinutes: config.durationMinutes,
      passPercentage: config.passPercentage,
      startedAt: now,
      expiresAt: new Date(now.getTime() + config.durationMinutes * 60_000),
      totalCount: ids.length,
      responses: { create: ids.map((questionId, order) => ({ questionId, order })) },
    },
  });
  redirect(`/pruefung/${attempt.id}`);
}

const saveSchema = z.object({
  attemptId: idSchema,
  questionId: idSchema,
  selectedOptionIds: z.array(idSchema).max(4).optional(),
  markedForReview: z.boolean().optional(),
  currentIndex: z.number().int().min(0).max(1000).optional(),
});

export async function saveExamResponseAction(input: z.infer<typeof saveSchema>): Promise<ActionResult<{ expired: boolean }>> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Eingabe." };
  const { attemptId, questionId, selectedOptionIds, markedForReview, currentIndex } = parsed.data;
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return { ok: false, error: "Prüfung nicht gefunden." };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "Die Prüfung wurde bereits abgegeben." };
  // 10 Sekunden Kulanz für Netzwerklatenz
  if (attempt.expiresAt.getTime() + 10_000 < Date.now()) {
    await finalizeExam(attempt.id, "EXPIRED");
    return { ok: true, data: { expired: true } };
  }
  const response = await prisma.examResponse.findUnique({ where: { examAttemptId_questionId: { examAttemptId: attemptId, questionId } } });
  if (!response) return { ok: false, error: "Frage gehört nicht zu dieser Prüfung." };

  let validSelection: string[] | undefined;
  if (selectedOptionIds) {
    const options = await prisma.answerOption.findMany({ where: { questionId }, select: { id: true } });
    const valid = new Set(options.map((o) => o.id));
    validSelection = Array.from(new Set(selectedOptionIds)).filter((id) => valid.has(id));
  }
  await prisma.$transaction([
    prisma.examResponse.update({
      where: { id: response.id },
      data: {
        ...(validSelection ? { selectedOptionIds: validSelection, answeredAt: validSelection.length ? new Date() : null } : {}),
        ...(markedForReview !== undefined ? { markedForReview } : {}),
      },
    }),
    ...(currentIndex !== undefined
      ? [prisma.examAttempt.update({ where: { id: attempt.id }, data: { currentIndex: Math.min(currentIndex, attempt.totalCount - 1) } })]
      : []),
  ]);
  return { ok: true, data: { expired: false } };
}

export async function submitExamAction(attemptId: string): Promise<ActionResult> {
  const user = await requireUser();
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return { ok: false, error: "Prüfung nicht gefunden." };
  if (attempt.status === "IN_PROGRESS") {
    await finalizeExam(attempt.id, attempt.expiresAt.getTime() + 10_000 < Date.now() ? "EXPIRED" : "SUBMITTED");
  }
  revalidatePath("/pruefung");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
