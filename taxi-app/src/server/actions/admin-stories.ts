"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { STORY_TYPES, safeRoute } from "@/lib/stories";
import { ensureDaily } from "@/server/stories/daily";
import { uploadObject } from "@/server/storage";
import { fail, type ActionResult } from "./types";

const PATH = "/admin/stories";
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const groupSchema = z.object({
  id: z.string().optional(),
  key: z.string().regex(/^[a-z0-9-]{2,40}$/, "Nur Kleinbuchstaben, Ziffern und Bindestrich"),
  titleDe: z.string().trim().min(2).max(60),
  iconImage: z.string().trim().max(300).optional().or(z.literal("")),
  type: z.enum(STORY_TYPES as [string, ...string[]]),
  isPersonal: z.boolean(),
  sort: z.coerce.number().int().min(0).max(999),
  ringColors: z.array(hex).max(4).optional(),
  activeFrom: z.string().optional().or(z.literal("")),
  activeTo: z.string().optional().or(z.literal("")),
});

export async function saveStoryGroupAction(input: z.input<typeof groupSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = groupSchema.safeParse(input);
  if (!p.success) return fail("Bitte Eingaben prüfen.", p.error.flatten().fieldErrors as Record<string, string[]>);
  const { id, activeFrom, activeTo, ringColors, iconImage, ...rest } = p.data;
  const data = {
    ...rest,
    iconImage: iconImage || null,
    ringColors: ringColors && ringColors.length >= 2 ? ringColors : undefined,
    activeFrom: activeFrom ? new Date(activeFrom) : null,
    activeTo: activeTo ? new Date(activeTo) : null,
  };
  try {
    if (id) await prisma.storyGroup.update({ where: { id }, data });
    else await prisma.storyGroup.create({ data });
  } catch {
    return fail("Schlüssel bereits vergeben.");
  }
  revalidatePath(PATH);
  return { ok: true, data: undefined, message: "Gruppe gespeichert." };
}

export async function deleteStoryGroupAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.storyGroup.delete({ where: { id } }).catch(() => undefined);
  revalidatePath(PATH);
  return { ok: true, data: undefined, message: "Gruppe gelöscht." };
}

const slideSchema = z.object({
  id: z.string().optional(),
  groupId: z.string().min(1),
  sort: z.coerce.number().int().min(0).max(999),
  titleDe: z.string().trim().min(1).max(120),
  bodyDe: z.string().trim().max(1200),
  emoji: z.string().trim().max(16).optional(),
  bgColor: z.string().trim().max(120).optional(),
  durationMs: z.coerce.number().int().min(2000).max(30000),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaRoute: z.string().trim().max(200).optional(),
  quizQuestionId: z.string().trim().max(64).optional(),
  mapLat: z.string().optional(),
  mapLng: z.string().optional(),
  mapLabel: z.string().trim().max(80).optional(),
  imageCredit: z.string().trim().max(200).optional(),
  ownImage: z.boolean(),
  verified: z.boolean(),
  removeImage: z.boolean(),
});

/** Bild → WebP, max. 1080×1920, Ziel ~150 KB. */
async function toWebp(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());
  let quality = 76;
  let out = await sharp(input).rotate().resize({ width: 1080, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
  while (out.length > 160_000 && quality > 40) {
    quality -= 12;
    out = await sharp(input).rotate().resize({ width: 1080, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
  }
  return out;
}

export async function saveStorySlideAction(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = Object.fromEntries(form.entries());
  const p = slideSchema.safeParse({ ...raw, ownImage: raw.ownImage === "on", verified: raw.verified === "on", removeImage: raw.removeImage === "on" });
  if (!p.success) return fail("Bitte Eingaben prüfen.", p.error.flatten().fieldErrors as Record<string, string[]>);
  const d = p.data;
  const file = form.get("image");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file.size > 12_000_000) return fail("Bild zu groß (max. 12 MB).");
  if (hasFile && !/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) return fail("Nur Bilder (JPG, PNG, WebP).");
  const existing = d.id ? await prisma.storySlide.findUnique({ where: { id: d.id } }) : null;
  const willHaveImage = hasFile || (existing?.imagePath && !d.removeImage);
  if (willHaveImage && !d.ownImage && !d.imageCredit) return fail("Bildnachweis fehlt – bei fremden Bildern ist er Pflicht.", { imageCredit: ["Pflichtfeld bei fremden Bildern"] });
  const route = d.ctaRoute ? safeRoute(d.ctaRoute) : null;
  if (d.ctaRoute && !route) return fail("CTA-Ziel muss ein interner Pfad sein (z. B. /lernen).");
  const lat = Number(d.mapLat);
  const lng = Number(d.mapLng);
  const hasMap = d.mapLat && d.mapLng && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (d.quizQuestionId && !(await prisma.question.findUnique({ where: { id: d.quizQuestionId }, select: { id: true } }))) return fail("Quiz-Frage nicht gefunden (Fragen-ID prüfen).");

  let imagePath: string | null | undefined = undefined;
  if (hasFile) {
    try {
      const webp = await toWebp(file);
      imagePath = `slides/${randomUUID()}.webp`;
      await uploadObject("stories", imagePath, webp, "image/webp");
    } catch (e) {
      return fail(`Bild-Upload fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannt"}`);
    }
  } else if (d.removeImage) imagePath = null;

  const data = {
    groupId: d.groupId,
    sort: d.sort,
    titleDe: d.titleDe,
    bodyDe: d.bodyDe,
    emoji: d.emoji || null,
    bgColor: d.bgColor || null,
    durationMs: d.durationMs,
    cta: d.ctaLabel && route ? { label: d.ctaLabel, route } : undefined,
    quiz: d.quizQuestionId ? { question_id: d.quizQuestionId } : undefined,
    map: hasMap ? { lat, lng, label: d.mapLabel || "" } : undefined,
    imageCredit: d.ownImage ? (d.imageCredit || "Eigenes Bild") : d.imageCredit || null,
    verified: d.verified,
    ...(imagePath !== undefined ? { imagePath } : {}),
  };
  if (d.id) {
    await prisma.storySlide.update({ where: { id: d.id }, data: { ...data, cta: data.cta ?? Prisma.DbNull, quiz: data.quiz ?? Prisma.DbNull, map: data.map ?? Prisma.DbNull } });
  } else await prisma.storySlide.create({ data });
  revalidatePath(PATH);
  return { ok: true, data: undefined, message: "Slide gespeichert." };
}

export async function deleteStorySlideAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.storySlide.delete({ where: { id } }).catch(() => undefined);
  revalidatePath(PATH);
  return { ok: true, data: undefined, message: "Slide gelöscht." };
}

/** Heutige Tagesauswahl neu erzeugen (z. B. nach Änderungen). */
export async function regenerateTodayAction(): Promise<ActionResult> {
  await requireAdmin();
  await prisma.storyDaily.deleteMany({ where: { day: dayKeyToDate(dayKey()) } });
  const r = await ensureDaily();
  revalidatePath(PATH);
  return { ok: true, data: undefined, message: `Neu erzeugt: ${r.created.join(", ") || "–"}` };
}
