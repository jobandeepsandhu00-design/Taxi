"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./types";

/** Persönliche Fragen & Kapitel: nur für die eigene Person sichtbar – der gemeinsame Katalog bleibt unverändert. */

const MAX_OWN = 2000;
const MAX_CHAPTERS = 50;

function changed() {
  // genau die Seiten, die die persönliche Ebene zeigen
  revalidatePath("/lernbuch/eigene");
  revalidatePath("/lernbuch/eigene/[id]", "page");
  revalidatePath("/lernbuch/[topicId]/[chapterId]", "page");
  revalidatePath("/dashboard");
}

const optionSchema = z.object({ text: z.string().trim().min(1).max(5000), isCorrect: z.boolean() });
const saveSchema = z
  .object({
    baseQuestionId: z.string().max(64).optional(),
    ownId: z.string().max(64).optional(),
    categoryId: z.string().max(64).optional(),
    userChapterId: z.string().max(64).optional(),
    text: z.string().trim().min(3, "Die Frage ist zu kurz.").max(5000),
    explanation: z.string().trim().max(10000).optional(),
    options: z.array(optionSchema).min(1, "Mindestens eine Antwort.").max(6, "Höchstens sechs Antworten."),
  })
  .refine((q) => q.options.some((o) => o.isCorrect), { message: "Mindestens eine Antwort muss richtig sein.", path: ["options"] });

export async function saveMyQuestionAction(input: z.input<typeof saveSchema>): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const p = saveSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const d = p.data;
  const data = { text: d.text, explanation: d.explanation || null, options: d.options };

  if (d.baseQuestionId) {
    // eigene Fassung einer Katalogfrage
    const base = await prisma.question.findUnique({ where: { id: d.baseQuestionId }, select: { id: true } });
    if (!base) return { ok: false, error: "Frage nicht gefunden." };
    const row = await prisma.userQuestion.upsert({
      where: { userId_baseQuestionId: { userId: user.id, baseQuestionId: d.baseQuestionId } },
      create: { userId: user.id, kind: "override", baseQuestionId: d.baseQuestionId, ...data },
      update: { kind: "override", ...data },
    });
    changed();
    return { ok: true, data: { id: row.id }, message: "Deine Fassung ist gespeichert (nur für dich sichtbar)." };
  }
  if (d.ownId) {
    const own = await prisma.userQuestion.findFirst({ where: { id: d.ownId, userId: user.id, kind: "own" } });
    if (!own) return { ok: false, error: "Frage nicht gefunden." };
    await prisma.userQuestion.update({ where: { id: own.id }, data });
    changed();
    return { ok: true, data: { id: own.id }, message: "Frage gespeichert." };
  }
  // neue eigene Frage – in einem Katalog-Kapitel oder einem eigenen Kapitel
  if (!d.categoryId && !d.userChapterId) return { ok: false, error: "Kein Kapitel gewählt." };
  if (d.userChapterId && !(await prisma.userChapter.findFirst({ where: { id: d.userChapterId, userId: user.id }, select: { id: true } }))) return { ok: false, error: "Kapitel nicht gefunden." };
  if (d.categoryId && !(await prisma.category.findUnique({ where: { id: d.categoryId }, select: { id: true } }))) return { ok: false, error: "Kapitel nicht gefunden." };
  if ((await prisma.userQuestion.count({ where: { userId: user.id, kind: "own" } })) >= MAX_OWN) return { ok: false, error: `Maximal ${MAX_OWN} eigene Fragen.` };
  const row = await prisma.userQuestion.create({ data: { userId: user.id, kind: "own", categoryId: d.categoryId ?? null, userChapterId: d.userChapterId ?? null, ...data } });
  changed();
  return { ok: true, data: { id: row.id }, message: "Neue Frage hinzugefügt." };
}

/** Katalogfrage nur für mich ausblenden („löschen“) */
export async function hideMyQuestionAction(baseQuestionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).parse(baseQuestionId);
  if (!(await prisma.question.findUnique({ where: { id }, select: { id: true } }))) return { ok: false, error: "Frage nicht gefunden." };
  await prisma.userQuestion.upsert({
    where: { userId_baseQuestionId: { userId: user.id, baseQuestionId: id } },
    create: { userId: user.id, kind: "hide", baseQuestionId: id },
    update: { kind: "hide" },
  });
  changed();
  return { ok: true, data: undefined, message: "Frage für dich ausgeblendet." };
}

/** Original wiederherstellen (eigene Fassung bzw. Ausblendung entfernen) */
export async function restoreMyQuestionAction(baseQuestionId: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.userQuestion.deleteMany({ where: { userId: user.id, baseQuestionId } });
  changed();
  return { ok: true, data: undefined, message: "Original wiederhergestellt." };
}

export async function deleteMyOwnQuestionAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.userQuestion.deleteMany({ where: { id, userId: user.id, kind: "own" } });
  changed();
  return { ok: true, data: undefined, message: "Frage gelöscht." };
}

const nameSchema = z.string().trim().min(2, "Name zu kurz.").max(120);

export async function createMyChapterAction(name: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const n = nameSchema.safeParse(name);
  if (!n.success) return { ok: false, error: n.error.issues[0]?.message ?? "Ungültiger Name." };
  if ((await prisma.userChapter.count({ where: { userId: user.id } })) >= MAX_CHAPTERS) return { ok: false, error: `Maximal ${MAX_CHAPTERS} eigene Kapitel.` };
  const c = await prisma.userChapter.create({ data: { userId: user.id, name: n.data } });
  changed();
  return { ok: true, data: { id: c.id }, message: "Kapitel angelegt." };
}

export async function renameMyChapterAction(id: string, name: string): Promise<ActionResult> {
  const user = await requireUser();
  const n = nameSchema.safeParse(name);
  if (!n.success) return { ok: false, error: n.error.issues[0]?.message ?? "Ungültiger Name." };
  const r = await prisma.userChapter.updateMany({ where: { id, userId: user.id }, data: { name: n.data } });
  if (!r.count) return { ok: false, error: "Kapitel nicht gefunden." };
  changed();
  return { ok: true, data: undefined, message: "Kapitel gespeichert." };
}

export async function deleteMyChapterAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.userChapter.deleteMany({ where: { id, userId: user.id } });
  changed();
  return { ok: true, data: undefined, message: "Kapitel gelöscht." };
}
