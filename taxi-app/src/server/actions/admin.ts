"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { parseQuestionCsv } from "@/lib/csv";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  categorySchema,
  examConfigSchema,
  questionSchema,
  sourceSchema,
  topicSchema,
  type QuestionInput,
} from "@/lib/validation";
import { refreshKnowledge } from "@/server/coach/knowledge";
import type { ActionResult } from "./types";

const idSchema = z.string().min(1).max(64);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function zodErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

async function assertOfficialHasVerifiedSource(input: QuestionInput): Promise<string | null> {
  if (input.origin !== "OFFICIAL") return null;
  if (!input.sourceId) return "Offizielle Fragen benötigen eine verifizierte Quelle.";
  const source = await prisma.questionSource.findUnique({ where: { id: input.sourceId } });
  if (!source?.verified) return "Die gewählte Quelle ist nicht als verifiziert markiert. Offizielle Fragen erfordern eine verifizierte Quelle.";
  return null;
}

// ---------- Fragen ----------

export async function saveQuestionAction(id: string | null, input: QuestionInput): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: zodErrors(parsed.error) };
  const q = parsed.data;
  const officialError = await assertOfficialHasVerifiedSource(q);
  if (officialError) return { ok: false, error: officialError, fieldErrors: { sourceId: [officialError] } };
  if (q.topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: q.topicId } });
    if (!topic || topic.categoryId !== q.categoryId) return { ok: false, error: "Das Thema gehört nicht zur gewählten Kategorie." };
  }
  const data = {
    text: q.text,
    explanation: q.explanation,
    categoryId: q.categoryId,
    topicId: q.topicId || null,
    difficulty: q.difficulty,
    multipleCorrect: q.multipleCorrect,
    imageUrl: q.imageUrl || null,
    tags: Array.from(new Set(q.tags.map((t) => t.toLowerCase()))),
    status: q.status,
    origin: q.origin,
    sourceId: q.sourceId || null,
    sourceDetail: q.sourceDetail || null,
  };
  const options = q.options.map((o, i) => ({
    label: o.label,
    text: o.text,
    isCorrect: o.isCorrect,
    explanation: o.explanation || null,
    order: i,
  }));

  let saved;
  if (id) {
    saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.question.findUniqueOrThrow({ where: { id }, include: { options: true } });
      const updated = await tx.question.update({ where: { id }, data });
      // Optionen per Label aktualisieren (IDs bleiben stabil → Antworthistorie bleibt gültig)
      for (const o of options) {
        const match = existing.options.find((e) => e.label === o.label);
        if (match) await tx.answerOption.update({ where: { id: match.id }, data: o });
        else await tx.answerOption.create({ data: { ...o, questionId: id } });
      }
      return updated;
    });
  } else {
    saved = await prisma.question.create({ data: { ...data, createdById: admin.id, options: { create: options } } });
  }
  revalidatePath("/admin/fragen");
  void refreshKnowledge();
  return { ok: true, data: { id: saved.id }, message: "Frage gespeichert." };
}

export async function setQuestionStatusAction(id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): Promise<ActionResult> {
  await requireAdmin();
  const q = await prisma.question.findUnique({ where: { id }, include: { source: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  if (status === "PUBLISHED" && q.origin === "OFFICIAL" && !q.source?.verified) {
    return { ok: false, error: "Offizielle Fragen können nur mit verifizierter Quelle veröffentlicht werden." };
  }
  await prisma.question.update({ where: { id }, data: { status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(status) } });
  revalidatePath("/admin/fragen");
  void refreshKnowledge();
  return { ok: true, data: undefined };
}

export async function bulkSetStatusAction(ids: string[], status: "DRAFT" | "PUBLISHED" | "ARCHIVED"): Promise<ActionResult<{ count: number }>> {
  await requireAdmin();
  const parsedIds = z.array(idSchema).max(1000).parse(ids);
  const where: Prisma.QuestionWhereInput = { id: { in: parsedIds } };
  if (status === "PUBLISHED") where.OR = [{ origin: { not: "OFFICIAL" } }, { source: { verified: true } }];
  const res = await prisma.question.updateMany({ where, data: { status } });
  revalidatePath("/admin/fragen");
  void refreshKnowledge();
  return { ok: true, data: { count: res.count } };
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.question.delete({ where: { id: idSchema.parse(id) } });
  revalidatePath("/admin/fragen");
  void refreshKnowledge();
  return { ok: true, data: undefined };
}

// ---------- Kategorien & Themen ----------

export async function saveCategoryAction(id: string | null, input: z.input<typeof categorySchema>): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: zodErrors(parsed.error) };
  const clash = await prisma.category.findFirst({ where: { slug: parsed.data.slug, ...(id ? { NOT: { id } } : {}) } });
  if (clash) return { ok: false, error: "Dieser Slug wird bereits verwendet.", fieldErrors: { slug: ["Bereits vergeben."] } };
  const region = await prisma.region.findFirst({ where: { code: "W" } });
  const data = { ...parsed.data, syllabusReference: parsed.data.syllabusReference || null };
  const saved = id
    ? await prisma.category.update({ where: { id }, data })
    : await prisma.category.create({ data: { ...data, regionId: region?.id } });
  revalidatePath("/admin/kategorien");
  revalidatePath("/lernen");
  return { ok: true, data: { id: saved.id }, message: "Kategorie gespeichert." };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const count = await prisma.question.count({ where: { categoryId: id } });
  if (count > 0) return { ok: false, error: `Die Kategorie enthält noch ${count} Fragen. Bitte zuerst verschieben oder löschen – oder die Kategorie deaktivieren.` };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/kategorien");
  return { ok: true, data: undefined };
}

export async function saveTopicAction(id: string | null, input: z.input<typeof topicSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: zodErrors(parsed.error) };
  const slug = slugify(parsed.data.name) || "thema";
  try {
    if (id) await prisma.topic.update({ where: { id }, data: { name: parsed.data.name, description: parsed.data.description || null, slug } });
    else {
      const order = await prisma.topic.count({ where: { categoryId: parsed.data.categoryId } });
      await prisma.topic.create({ data: { ...parsed.data, description: parsed.data.description || null, slug, order } });
    }
  } catch {
    return { ok: false, error: "Ein Thema mit diesem Namen existiert in der Kategorie bereits." };
  }
  revalidatePath("/admin/kategorien");
  return { ok: true, data: undefined };
}

export async function deleteTopicAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.topic.delete({ where: { id } });
  revalidatePath("/admin/kategorien");
  return { ok: true, data: undefined };
}

// ---------- Quellen ----------

export async function saveSourceAction(id: string | null, input: z.input<typeof sourceSchema>): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = sourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: zodErrors(parsed.error) };
  const existing = id ? await prisma.questionSource.findUnique({ where: { id } }) : null;
  const data = {
    ...parsed.data,
    reference: parsed.data.reference || null,
    url: parsed.data.url || null,
    note: parsed.data.note || null,
    verifiedAt: parsed.data.verified ? existing?.verifiedAt ?? new Date() : null,
  };
  const saved = id ? await prisma.questionSource.update({ where: { id }, data }) : await prisma.questionSource.create({ data });
  revalidatePath("/admin/quellen");
  return { ok: true, data: { id: saved.id }, message: "Quelle gespeichert." };
}

export async function deleteSourceAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const official = await prisma.question.count({ where: { sourceId: id, origin: "OFFICIAL", status: "PUBLISHED" } });
  if (official > 0) return { ok: false, error: "Die Quelle wird von veröffentlichten offiziellen Fragen verwendet." };
  await prisma.questionSource.delete({ where: { id } });
  revalidatePath("/admin/quellen");
  return { ok: true, data: undefined };
}

// ---------- Prüfungskonfigurationen ----------

export async function saveExamConfigAction(id: string | null, input: z.input<typeof examConfigSchema>): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = examConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: zodErrors(parsed.error) };
  const d = parsed.data;
  const distribution = d.categoryDistribution
    ? Object.fromEntries(Object.entries(d.categoryDistribution).filter(([, n]) => n > 0))
    : null;
  const distSum = distribution ? Object.values(distribution).reduce((a, b) => a + b, 0) : 0;
  if (distSum > d.questionCount) {
    return { ok: false, error: `Die Verteilung je Kategorie (${distSum}) übersteigt die Gesamtzahl der Fragen (${d.questionCount}).` };
  }
  const region = await prisma.region.findFirst({ where: { code: "W" } });
  const data = {
    name: d.name,
    description: d.description || null,
    durationMinutes: d.durationMinutes,
    questionCount: d.questionCount,
    passPercentage: d.passPercentage,
    isActive: d.isActive,
    isDefault: d.isDefault,
    verified: d.verified,
    officialReference: d.officialReference || null,
    allowedOrigins: d.allowedOrigins,
    categoryDistribution: distribution && Object.keys(distribution).length ? distribution : undefined,
  };
  const saved = await prisma.$transaction(async (tx) => {
    if (d.isDefault) await tx.examConfig.updateMany({ where: { isDefault: true, ...(id ? { NOT: { id } } : {}) }, data: { isDefault: false } });
    if (id) {
      return tx.examConfig.update({
        where: { id },
        data: { ...data, categoryDistribution: data.categoryDistribution ?? (null as unknown as Prisma.InputJsonValue) },
      });
    }
    return tx.examConfig.create({ data: { ...data, regionId: region?.id } });
  });
  revalidatePath("/admin/pruefungen");
  revalidatePath("/pruefung");
  return { ok: true, data: { id: saved.id }, message: "Prüfungskonfiguration gespeichert." };
}

export async function deleteExamConfigAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const attempts = await prisma.examAttempt.count({ where: { examConfigId: id } });
  if (attempts > 0) {
    await prisma.examConfig.update({ where: { id }, data: { isActive: false, isDefault: false } });
    revalidatePath("/admin/pruefungen");
    return { ok: true, data: undefined, message: "Es existieren bereits Prüfungsversuche – die Konfiguration wurde deaktiviert statt gelöscht." };
  }
  await prisma.examConfig.delete({ where: { id } });
  revalidatePath("/admin/pruefungen");
  return { ok: true, data: undefined };
}

// ---------- Benutzer ----------

export async function updateUserAction(id: string, input: { role?: "STUDENT" | "ADMIN"; isActive?: boolean }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const data = z.object({ role: z.enum(["STUDENT", "ADMIN"]).optional(), isActive: z.boolean().optional() }).parse(input);
  if (id === admin.id && (data.role === "STUDENT" || data.isActive === false)) {
    return { ok: false, error: "Du kannst dir selbst die Administratorrechte nicht entziehen oder dein Konto deaktivieren." };
  }
  await prisma.user.update({ where: { id }, data });
  revalidatePath("/admin/benutzer");
  return { ok: true, data: undefined };
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (id === admin.id) return { ok: false, error: "Du kannst dein eigenes Konto hier nicht löschen." };
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/benutzer");
  return { ok: true, data: undefined };
}

// ---------- Einstellungen ----------

const settingsSchema = z.object({
  mistakeRemovalThreshold: z.coerce.number().int().min(1).max(10),
  defaultQuizSize: z.coerce.number().int().min(1).max(200),
  disclaimer: z.string().trim().min(10).max(2000),
});

export async function saveSettingsAction(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte Eingaben prüfen.", fieldErrors: zodErrors(parsed.error) };
  await prisma.$transaction(
    (Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]).map((key) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: parsed.data[key] },
        update: { value: parsed.data[key] },
      }),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Einstellungen gespeichert." };
}

// ---------- CSV-Import ----------

export interface ImportSummary {
  created: number;
  updated: number;
  errors: { rowNumber: number; message: string }[];
  dryRun: boolean;
}

export async function importQuestionsCsvAction(csv: string, dryRun: boolean): Promise<ActionResult<ImportSummary>> {
  const admin = await requireAdmin();
  if (typeof csv !== "string" || csv.length === 0) return { ok: false, error: "Die Datei ist leer." };
  if (csv.length > 5_000_000) return { ok: false, error: "Die Datei ist zu groß (max. 5 MB)." };
  const parsed = parseQuestionCsv(csv);
  const errors = [...parsed.errors];
  const categories = await prisma.category.findMany({ include: { topics: true } });
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const sources = await prisma.questionSource.findMany();
  const sourceByTitle = new Map(sources.map((s) => [s.title.toLowerCase(), s]));

  const valid = parsed.questions.filter((q) => {
    const cat = catBySlug.get(q.categorySlug);
    if (!cat) {
      errors.push({ rowNumber: q.rowNumber, message: `Kategorie „${q.categorySlug}“ existiert nicht.` });
      return false;
    }
    if (q.origin === "OFFICIAL") {
      const source = q.sourceTitle ? sourceByTitle.get(q.sourceTitle.toLowerCase()) : undefined;
      if (!source?.verified) {
        errors.push({ rowNumber: q.rowNumber, message: "Offizielle Fragen benötigen eine bereits angelegte, verifizierte Quelle (Spalte „quelle“ = exakter Quellentitel)." });
        return false;
      }
    }
    return true;
  });

  const existingIds = new Set(
    (await prisma.question.findMany({ where: { id: { in: valid.map((q) => q.id).filter((x): x is string => Boolean(x)) } }, select: { id: true } })).map((r) => r.id),
  );
  const summary: ImportSummary = {
    created: valid.filter((q) => !q.id || !existingIds.has(q.id)).length,
    updated: valid.filter((q) => q.id && existingIds.has(q.id)).length,
    errors: errors.sort((a, b) => a.rowNumber - b.rowNumber),
    dryRun,
  };
  if (dryRun || valid.length === 0) return { ok: true, data: summary };

  await prisma.$transaction(
    async (tx) => {
      for (const q of valid) {
        const cat = catBySlug.get(q.categorySlug)!;
        let topicId: string | null = null;
        if (q.topicName) {
          const slug = slugify(q.topicName) || "thema";
          let topic = cat.topics.find((t) => t.slug === slug);
          if (!topic) {
            topic = await tx.topic.create({ data: { categoryId: cat.id, name: q.topicName, slug, order: cat.topics.length } });
            cat.topics.push(topic);
          }
          topicId = topic.id;
        }
        let sourceId: string | null = null;
        if (q.sourceTitle) {
          let source = sourceByTitle.get(q.sourceTitle.toLowerCase());
          if (!source) {
            source = await tx.questionSource.create({ data: { title: q.sourceTitle, type: "OTHER", verified: false } });
            sourceByTitle.set(source.title.toLowerCase(), source);
          }
          sourceId = source.id;
        }
        const data = {
          text: q.text,
          explanation: q.explanation,
          categoryId: cat.id,
          topicId,
          difficulty: q.difficulty,
          multipleCorrect: q.multipleCorrect,
          imageUrl: q.imageUrl ?? null,
          ...(q.mnemonic !== undefined ? { mnemonic: q.mnemonic } : {}),
          tags: q.tags,
          status: q.status,
          origin: q.origin,
          sourceId,
          sourceDetail: q.sourceDetail ?? null,
        };
        const options = q.options.map((o, i) => ({ label: o.label, text: o.text, isCorrect: o.isCorrect, explanation: o.explanation ?? null, order: i }));
        if (q.id && existingIds.has(q.id)) {
          await tx.question.update({ where: { id: q.id }, data });
          for (const o of options) {
            await tx.answerOption.upsert({
              where: { questionId_label: { questionId: q.id, label: o.label } },
              create: { ...o, questionId: q.id },
              update: o,
            });
          }
        } else {
          await tx.question.create({ data: { ...data, createdById: admin.id, options: { create: options } } });
        }
      }
    },
    { timeout: 120_000 },
  );
  revalidatePath("/admin/fragen");
  void refreshKnowledge();
  return { ok: true, data: summary };
}

// ---------- Bild-Upload ----------

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Prüft die „Magic Bytes“, damit keine getarnten Dateien hochgeladen werden. */
function matchesImageSignature(buf: Buffer, mime: string): boolean {
  const hex = buf.subarray(0, 12).toString("hex");
  switch (mime) {
    case "image/png":
      return hex.startsWith("89504e470d0a1a0a");
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/gif":
      return hex.startsWith("474946383761") || hex.startsWith("474946383961");
    case "image/webp":
      return hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
    default:
      return false;
  }
}

export async function uploadImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Keine Datei ausgewählt." };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { ok: false, error: "Erlaubt sind PNG, JPEG, WebP und GIF." };
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: "Das Bild darf maximal 3 MB groß sein." };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesImageSignature(buffer, file.type)) return { ok: false, error: "Der Dateiinhalt entspricht keinem gültigen Bildformat." };
  const media = await prisma.mediaFile.create({
    data: { filename: file.name.slice(0, 255), mimeType: file.type, size: file.size, data: buffer },
  });
  return { ok: true, data: { url: `/api/media/${media.id}` } };
}
