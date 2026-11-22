"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseDrillSettings, type DrillSettings } from "@/lib/audio/drill";
import { LERNBUCH_TOPICS, naturalCompare } from "@/lib/lernbuch";
import { shuffle } from "@/lib/quiz-logic";
import { getAudioMap } from "@/server/audio/urls";
import { markCard } from "@/server/lernbuch";
import { publishedWhere } from "@/server/questions";
import type { ActionResult } from "./types";

export async function saveDrillSettingsAction(input: DrillSettings): Promise<ActionResult> {
  const user = await requireUser();
  const settings = parseDrillSettings(input);
  await prisma.audioDrillSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, settings }, update: { settings } });
  return { ok: true, data: undefined };
}

const startSchema = z.object({
  mode: z.enum(["chapter", "topic", "all", "unknown", "random10", "resume", "ids"]),
  id: z.string().max(80).optional(),
  ids: z.array(z.string().max(64)).max(1000).optional(),
});

type Q = { id: string; categoryId: string; lessonIndex: number | null; category: { order: number; name: string } };
const sortBook = (a: Q, b: Q) => a.category.order - b.category.order || (a.lessonIndex ?? 0) - (b.lessonIndex ?? 0) || naturalCompare(a.id, b.id);

/** Durchgang starten → Vollbild-Drill. */
export async function startDrillAction(input: z.infer<typeof startSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const p = startSchema.parse(input);
  if (p.mode === "resume") {
    const open = await prisma.audioDrillSession.findFirst({ where: { userId: user.id, finishedAt: null }, orderBy: { updatedAt: "desc" } });
    if (!open) return { ok: false, error: "Kein offener Durchgang." };
    redirect(`/muendlich/auto/${open.id}`);
  }
  const settings = parseDrillSettings((await prisma.audioDrillSettings.findUnique({ where: { userId: user.id } }))?.settings);
  const sel = { id: true, categoryId: true, lessonIndex: true, category: { select: { order: true, name: true } } } as const;
  let qs: Q[] = [];
  let title = "Mündlich";
  if (p.mode === "chapter" && p.id) {
    qs = await prisma.question.findMany({ where: { ...publishedWhere, categoryId: p.id }, select: sel });
    title = qs[0]?.category.name ?? "Kapitel";
  } else if (p.mode === "topic" && p.id) {
    const t = LERNBUCH_TOPICS.find((x) => x.id === p.id);
    qs = await prisma.question.findMany({ where: { ...publishedWhere, category: { isActive: true, slug: { in: t?.slugs ?? [] } } }, select: sel });
    title = t?.title ?? "Thema";
  } else if (p.mode === "ids" && p.ids?.length) {
    qs = await prisma.question.findMany({ where: { ...publishedWhere, id: { in: p.ids } }, select: sel });
    title = "Wiederholung";
  } else {
    qs = await prisma.question.findMany({ where: { ...publishedWhere, category: { isActive: true } }, select: sel });
    title = "Alle Kapitel";
  }
  // „Nur nicht gewusste“: als „Nochmal“ markierte Karten
  if (p.mode === "unknown" || settings.order === "unknown") {
    const again = await prisma.readProgress.findMany({ where: { userId: user.id, status: "nochmal", questionId: { in: qs.map((q) => q.id) } }, select: { questionId: true } });
    const set = new Set(again.map((a) => a.questionId));
    qs = qs.filter((q) => set.has(q.id));
    if (p.mode === "unknown") title = "Nicht gewusste Fragen";
  }
  if (qs.length === 0) return { ok: false, error: p.mode === "unknown" || settings.order === "unknown" ? "Super – keine nicht gewussten Fragen offen." : "Keine Fragen gefunden." };
  let ids = qs.sort(sortBook).map((q) => q.id);
  if (p.mode === "random10") {
    ids = shuffle(ids).slice(0, 10);
    title = "Zufällig 10";
  } else if (settings.order === "random") ids = shuffle(ids);
  const session = await prisma.audioDrillSession.create({
    data: { userId: user.id, title, categoryIds: Array.from(new Set(qs.filter((q) => ids.includes(q.id)).map((q) => q.categoryId))), questionIds: ids },
  });
  redirect(`/muendlich/auto/${session.id}`);
}

/** Antwort bewerten (Gewusst / Nicht gewusst) und Position speichern. „Nicht gewusst“ → morgen wiederholen. */
export async function recordDrillAction(input: { sessionId: string; questionId: string; known: boolean | null; position: number }): Promise<ActionResult> {
  const user = await requireUser();
  const p = z.object({ sessionId: z.string().max(64), questionId: z.string().max(64), known: z.boolean().nullable(), position: z.number().int().min(0).max(5000) }).parse(input);
  const s = await prisma.audioDrillSession.findFirst({ where: { id: p.sessionId, userId: user.id } });
  if (!s || !s.questionIds.includes(p.questionId)) return { ok: false, error: "Durchgang nicht gefunden." };
  const results = { ...((s.results as Record<string, string>) ?? {}) };
  if (p.known !== null) results[p.questionId] = p.known ? "known" : "unknown";
  await prisma.audioDrillSession.update({ where: { id: s.id }, data: { results, position: Math.max(s.position, p.position) } });
  if (p.known === false) await markCard(user.id, p.questionId, "nochmal").catch(() => undefined);
  if (p.known === true) await markCard(user.id, p.questionId, "gelesen").catch(() => undefined);
  return { ok: true, data: undefined };
}

export async function finishDrillAction(sessionId: string): Promise<void> {
  const user = await requireUser();
  await prisma.audioDrillSession.updateMany({ where: { id: z.string().max(64).parse(sessionId), userId: user.id }, data: { finishedAt: new Date() } });
}

/** URLs zum Herunterladen (Offline) für Kapitel/Themen/alles. */
export async function downloadUrlsAction(input: { categoryIds?: string[]; all?: boolean; voice?: "female" | "male" }): Promise<string[]> {
  const user = await requireUser();
  void user;
  const where = input.all ? { ...publishedWhere, category: { isActive: true } } : { ...publishedWhere, categoryId: { in: (input.categoryIds ?? []).slice(0, 50) } };
  const qs = await prisma.question.findMany({ where, select: { id: true }, take: 3000 });
  const map = await getAudioMap(qs.map((q) => q.id), input.voice);
  return Object.values(map).flatMap((set) => [set.question?.mp3, set.question?.opus, set.answer?.mp3, set.answer?.opus].filter((u): u is string => Boolean(u)));
}
