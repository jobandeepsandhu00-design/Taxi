"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { naturalCompare } from "@/lib/lernbuch";
import { kickAudioAfterChange } from "@/server/audio/kick";
import { refreshKnowledge } from "@/server/coach/knowledge";
import type { ActionResult } from "./types";

/**
 * Kapitel-Editor: Kapitel und ihre Fragen/Antworten direkt bearbeiten, löschen, hinzufügen, verschieben.
 * Bewusst einfacher als das volle Frage-Formular (2–6 Antworten, Erklärung optional).
 */

const LABELS = ["A", "B", "C", "D", "E", "F"];

function changed(categoryId?: string) {
  revalidatePath("/admin/kapitel");
  if (categoryId) revalidatePath(`/admin/kapitel/${categoryId}`);
  revalidatePath("/admin/fragen");
  revalidatePath("/lernbuch", "layout");
  void refreshKnowledge();
  void kickAudioAfterChange();
}

async function orderedIds(categoryId: string): Promise<string[]> {
  const qs = await prisma.question.findMany({ where: { categoryId }, select: { id: true, lessonIndex: true } });
  qs.sort((a, b) => (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0) || naturalCompare(a.id, b.id));
  return qs.map((q) => q.id);
}

const optionSchema = z.object({ id: z.string().max(64).optional(), text: z.string().trim().min(1, "Antworttext fehlt.").max(5000), isCorrect: z.boolean() });
const quickSchema = z
  .object({
    id: z.string().max(64).optional(),
    categoryId: z.string().min(1).max(64),
    text: z.string().trim().min(3, "Die Frage ist zu kurz.").max(5000),
    explanation: z.string().trim().max(10000).optional(),
    sourceDetail: z.string().trim().max(255).optional(),
    published: z.boolean(),
    options: z.array(optionSchema).min(2, "Mindestens zwei Antworten.").max(6, "Höchstens sechs Antworten."),
  })
  .refine((q) => q.options.some((o) => o.isCorrect), { message: "Mindestens eine Antwort muss richtig sein.", path: ["options"] });

export async function quickSaveQuestionAction(input: z.input<typeof quickSchema>): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const p = quickSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const q = p.data;
  const cat = await prisma.category.findUnique({ where: { id: q.categoryId }, select: { id: true } });
  if (!cat) return { ok: false, error: "Kapitel nicht gefunden." };
  const correct = q.options.filter((o) => o.isCorrect).length;
  const data = {
    text: q.text,
    explanation: q.explanation || q.options.filter((o) => o.isCorrect).map((o) => o.text).join("\n"),
    sourceDetail: q.sourceDetail || null,
    multipleCorrect: correct > 1,
    status: q.published ? ("PUBLISHED" as const) : ("DRAFT" as const),
  };
  let id = q.id;
  if (id) {
    const existing = await prisma.question.findUnique({ where: { id }, include: { options: true } });
    if (!existing) return { ok: false, error: "Frage nicht gefunden." };
    // archivierte Fragen bleiben archiviert, solange sie nicht ausdrücklich veröffentlicht werden
    const status = !q.published && existing.status === "ARCHIVED" ? ("ARCHIVED" as const) : data.status;
    await prisma.$transaction(async (tx) => {
      await tx.question.update({ where: { id: id! }, data: { ...data, status, categoryId: q.categoryId } });
      const keep = new Set<string>();
      for (const [i, o] of q.options.entries()) {
        const match = o.id ? existing.options.find((e) => e.id === o.id) : undefined;
        const row = { label: LABELS[i]!, text: o.text, isCorrect: o.isCorrect, order: i };
        if (match) {
          keep.add(match.id);
          await tx.answerOption.update({ where: { id: match.id }, data: row });
        } else {
          // Label-Konflikt vermeiden: vorhandene Option mit gleichem Label wiederverwenden
          const sameLabel = existing.options.find((e) => e.label === row.label && !keep.has(e.id) && !q.options.some((x) => x.id === e.id));
          if (sameLabel) {
            keep.add(sameLabel.id);
            await tx.answerOption.update({ where: { id: sameLabel.id }, data: row });
          } else {
            const created = await tx.answerOption.create({ data: { ...row, questionId: id! } });
            keep.add(created.id);
          }
        }
      }
      const remove = existing.options.filter((e) => !keep.has(e.id)).map((e) => e.id);
      if (remove.length) await tx.answerOption.deleteMany({ where: { id: { in: remove } } });
    });
  } else {
    const max = await prisma.question.aggregate({ where: { categoryId: q.categoryId }, _max: { lessonIndex: true } });
    const created = await prisma.question.create({
      data: {
        ...data,
        categoryId: q.categoryId,
        lessonIndex: (max._max.lessonIndex ?? 0) + 1,
        origin: "PRACTICE",
        difficulty: "MEDIUM",
        createdById: admin.id,
        options: { create: q.options.map((o, i) => ({ label: LABELS[i]!, text: o.text, isCorrect: o.isCorrect, order: i })) },
      },
    });
    id = created.id;
  }
  changed(q.categoryId);
  return { ok: true, data: { id: id! }, message: q.id ? "Frage gespeichert." : "Neue Frage hinzugefügt." };
}

export async function deleteChapterQuestionAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const q = await prisma.question.findUnique({ where: { id }, select: { categoryId: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  await prisma.question.delete({ where: { id } });
  changed(q.categoryId);
  return { ok: true, data: undefined, message: "Frage gelöscht." };
}

/** Frage in der Lernbuch-Reihenfolge nach oben/unten schieben. */
export async function moveQuestionAction(id: string, dir: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  const q = await prisma.question.findUnique({ where: { id }, select: { categoryId: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  const ids = await orderedIds(q.categoryId);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true, data: undefined };
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await prisma.$transaction(ids.map((qid, n) => prisma.question.update({ where: { id: qid }, data: { lessonIndex: n + 1 } })));
  changed(q.categoryId);
  return { ok: true, data: undefined };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "kapitel";
}

const chapterSchema = z.object({ name: z.string().trim().min(2, "Name zu kurz.").max(160), shortDescription: z.string().trim().max(300).optional(), isActive: z.boolean().optional() });

export async function createChapterAction(input: z.input<typeof chapterSchema>): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const p = chapterSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  let slug = slugify(p.data.name);
  for (let n = 2; await prisma.category.findUnique({ where: { slug } }); n++) slug = `${slugify(p.data.name)}-${n}`;
  const [max, region] = await Promise.all([prisma.category.aggregate({ _max: { order: true } }), prisma.region.findFirst({ where: { code: "W" } })]);
  const desc = p.data.shortDescription || p.data.name;
  const c = await prisma.category.create({
    data: { name: p.data.name, slug, shortDescription: desc, introduction: desc, color: "amber", icon: "BookOpen", order: (max._max.order ?? 0) + 1, isActive: true, regionId: region?.id },
  });
  changed(c.id);
  return { ok: true, data: { id: c.id }, message: "Kapitel angelegt." };
}

export async function updateChapterAction(id: string, input: z.input<typeof chapterSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = chapterSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  await prisma.category.update({ where: { id }, data: { name: p.data.name, ...(p.data.shortDescription ? { shortDescription: p.data.shortDescription } : {}), ...(p.data.isActive !== undefined ? { isActive: p.data.isActive } : {}) } });
  changed(id);
  return { ok: true, data: undefined, message: "Kapitel gespeichert." };
}

/** Kapitel löschen – auf Wunsch mit allen Fragen. */
export async function deleteChapterAction(id: string, withQuestions: boolean): Promise<ActionResult> {
  await requireAdmin();
  const count = await prisma.question.count({ where: { categoryId: id } });
  if (count > 0 && !withQuestions) return { ok: false, error: `Das Kapitel enthält noch ${count} Fragen.` };
  await prisma.$transaction([prisma.question.deleteMany({ where: { categoryId: id } }), prisma.category.delete({ where: { id } })]);
  changed();
  return { ok: true, data: undefined, message: "Kapitel gelöscht." };
}

/** Kapitel in der Reihenfolge verschieben. */
export async function moveChapterAction(id: string, dir: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  const cats = await prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true } });
  const ids = cats.map((c) => c.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true, data: undefined };
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  await prisma.$transaction(ids.map((cid, n) => prisma.category.update({ where: { id: cid }, data: { order: n + 1 } })));
  changed();
  return { ok: true, data: undefined };
}
