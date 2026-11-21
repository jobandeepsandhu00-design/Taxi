"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CHECK_QUESTIONS } from "@/lib/lernbuch";
import { shuffle } from "@/lib/quiz-logic";
import { coachConfigured, coachErrorMessage, parseCoach, UNSURE_SENTENCE } from "@/server/coach/llm";
import { markCard, saveChapterPosition } from "@/server/lernbuch";
import { publishedWhere } from "@/server/questions";
import type { ActionResult } from "./types";

const id = z.string().min(1).max(64);

export async function markCardAction(questionId: string, status: "gelesen" | "verstanden" | "nochmal" | "starred" | "unstarred"): Promise<ActionResult<{ status: string | null; starred: boolean }>> {
  const user = await requireUser();
  const qid = id.parse(questionId);
  const st = z.enum(["gelesen", "verstanden", "nochmal", "starred", "unstarred"]).parse(status);
  const q = await prisma.question.findFirst({ where: { id: qid, ...publishedWhere }, select: { id: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  const r = await markCard(user.id, qid, st);
  return { ok: true, data: r };
}

export async function saveChapterPositionAction(categoryId: string, position: number): Promise<ActionResult> {
  const user = await requireUser();
  await saveChapterPosition(user.id, id.parse(categoryId), z.number().int().min(0).max(10000).parse(position));
  return { ok: true, data: undefined };
}

const settingsSchema = z.object({
  autoAdvanceSec: z.union([z.literal(8), z.literal(12), z.literal(20), z.null()]).optional(),
  showWrongAnswers: z.boolean().optional(),
  textSize: z.enum(["s", "m", "l", "xl"]).optional(),
  audioSpeed: z.number().min(0.8).max(1.5).optional(),
  quizOnlyUnlocked: z.boolean().optional(),
});

export async function updateLernbuchSettingsAction(input: z.infer<typeof settingsSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const data = settingsSchema.parse(input);
  await prisma.lernbuchSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  return { ok: true, data: undefined };
}

/** Kapitel-Check: 5 zufällige Fragen des Kapitels – erst wenn alle Karten gelesen sind. */
export async function startChapterCheckAction(categoryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const cid = id.parse(categoryId);
  const category = await prisma.category.findUnique({ where: { id: cid }, select: { id: true, name: true } });
  if (!category) return { ok: false, error: "Kapitel nicht gefunden." };
  const all = await prisma.question.findMany({ where: { categoryId: cid, ...publishedWhere }, select: { id: true } });
  const read = await prisma.readProgress.count({ where: { userId: user.id, question: { categoryId: cid, ...publishedWhere } } });
  if (read < all.length) return { ok: false, error: "Lies zuerst alle Karten des Kapitels." };
  const ids = shuffle(all.map((q) => q.id)).slice(0, CHECK_QUESTIONS);
  await prisma.quizAttempt.updateMany({ where: { userId: user.id, status: "IN_PROGRESS", settings: { path: ["chapterCheck"], equals: cid } }, data: { status: "ABANDONED" } });
  const attempt = await prisma.quizAttempt.create({
    data: { userId: user.id, mode: "LEARN", categoryId: cid, title: `Kapitel-Check: ${category.name}`, questionIds: ids, settings: { chapterCheck: cid } },
  });
  redirect(`/quiz/${attempt.id}`);
}

const summarySchema = z.object({
  summary: z.string(),
  key_numbers: z.array(z.object({ value: z.string(), unit: z.string(), rule: z.string() })),
  traps: z.array(z.string()),
});

/** Spickzettel: KI-Zusammenfassung des Kapitels (nur aus den Skript-Antworten), zwischengespeichert. */
export async function getChapterSummaryAction(categoryId: string): Promise<ActionResult<{ content: string; keyNumbers: { value: string; unit: string; rule: string }[]; traps: string[]; verified: boolean }>> {
  await requireUser();
  const cid = id.parse(categoryId);
  const cached = await prisma.chapterSummary.findUnique({ where: { categoryId: cid } });
  if (cached) return { ok: true, data: { content: cached.contentDe, keyNumbers: cached.keyNumbers as never, traps: cached.traps as never, verified: cached.verified } };
  if (!coachConfigured()) return { ok: false, error: "Die KI ist noch nicht eingerichtet." };
  const category = await prisma.category.findUnique({ where: { id: cid }, select: { name: true } });
  const qs = await prisma.question.findMany({ where: { categoryId: cid, ...publishedWhere }, select: { text: true, options: { where: { isCorrect: true }, select: { text: true } } }, take: 80 });
  if (!category || qs.length === 0) return { ok: false, error: "Kapitel nicht gefunden." };
  try {
    const out = await parseCoach({
      context: `Kapitel „${category.name}“ der Taxi-Konzessionsprüfung Wien. Quelle sind ausschließlich diese Fragen mit Skript-Antworten:\n${qs.map((q) => `F: ${q.text}\nA: ${q.options.map((o) => o.text).join(" / ")}`).join("\n\n").slice(0, 24000)}`,
      prompt: `Erstelle einen Spickzettel auf Deutsch (du-Form):
- summary: höchstens 150 Wörter, die wichtigsten Inhalte.
- key_numbers: wichtige Zahlen/Fristen/Beträge aus den Antworten (value, unit, rule = kurze Regel). Nur was wörtlich in den Antworten steht, sonst leer.
- traps: genau 3 typische Fallen/Verwechslungen.
Erfinde nichts. Wenn unsicher: „${UNSURE_SENTENCE}“`,
      schema: summarySchema,
      fake: () => ({ summary: `Spickzettel für ${category.name}: ${qs.slice(0, 3).map((q) => q.text).join(" · ")}`, key_numbers: [], traps: ["Begriffe genau unterscheiden", "Fristen merken", "Zuständigkeiten beachten"] }),
      maxTokens: 3000,
    });
    if (!out) return { ok: false, error: "Der Spickzettel konnte nicht erstellt werden." };
    const saved = await prisma.chapterSummary.upsert({
      where: { categoryId: cid },
      create: { categoryId: cid, contentDe: out.summary, keyNumbers: out.key_numbers, traps: out.traps.slice(0, 3), verified: false },
      update: {},
    });
    return { ok: true, data: { content: saved.contentDe, keyNumbers: saved.keyNumbers as never, traps: saved.traps as never, verified: saved.verified } };
  } catch (err) {
    return { ok: false, error: coachErrorMessage(err) };
  }
}
