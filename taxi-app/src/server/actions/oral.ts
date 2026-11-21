"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ORAL_EXAM_QUESTIONS, pickWeighted, sessionPercent } from "@/lib/oral";
import { oralAccess, ORAL_LIMIT_REACHED, purgeUserAudio } from "@/server/oral";
import type { ActionResult } from "./types";

/** Datenschutzhinweis bestätigen (+ Wahl, ob Aufnahmen gespeichert werden). */
export async function ackOralPrivacyAction(saveAudio: boolean): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { oralPrivacyAck: new Date(), oralSaveAudio: z.boolean().parse(saveAudio) } });
  if (!saveAudio) await purgeUserAudio(user.id);
  return { ok: true, data: undefined };
}

export async function setOralSaveAudioAction(saveAudio: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const save = z.boolean().parse(saveAudio);
  await prisma.user.update({ where: { id: user.id }, data: { oralSaveAudio: save } });
  if (!save) await purgeUserAudio(user.id);
  return { ok: true, data: undefined, message: save ? "Aufnahmen werden 30 Tage gespeichert." : "Aufnahmen werden nicht gespeichert – bisherige gelöscht." };
}

const startSchema = z.object({
  mode: z.enum(["ueben", "pruefung"]),
  questionIds: z.array(z.string().min(1).max(64)).max(20).optional(),
  timer: z.boolean().optional(),
});

/** Neue Sitzung anlegen und in den Fokus-Modus springen. */
export async function startOralSessionAction(input: z.infer<typeof startSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const p = startSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Ungültige Eingabe." };
  const { mode, timer } = p.data;
  const access = await oralAccess(user);
  if (!access.privacyAck) return { ok: false, error: "Bitte bestätige zuerst den Datenschutzhinweis." };
  if (mode === "pruefung" && !access.canExam) return { ok: false, error: "Der Prüfungsmodus ist Teil von Premium." };
  if (mode === "ueben" && access.remaining <= 0) return { ok: false, error: ORAL_LIMIT_REACHED };

  const all = await prisma.oralQuestion.findMany({ where: { category: { isActive: true } }, select: { id: true, categoryId: true } });
  if (all.length === 0) return { ok: false, error: "Es gibt noch keine mündlichen Fragen." };

  let ids: string[];
  if (mode === "pruefung") {
    ids = pickWeighted(all, ORAL_EXAM_QUESTIONS).map((q) => q.id);
  } else if (p.data.questionIds?.length) {
    const valid = new Set(all.map((a) => a.id));
    ids = p.data.questionIds.filter((id) => valid.has(id));
  } else {
    // Fällige zuerst, dann neue, dann der Rest nach Fälligkeit
    const progress = await prisma.oralProgress.findMany({ where: { userId: user.id }, select: { oralQuestionId: true, dueAt: true } });
    const byId = new Map(progress.map((pr) => [pr.oralQuestionId, pr.dueAt.getTime()]));
    const now = Date.now();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const due = shuffled.filter((q) => (byId.get(q.id) ?? Infinity) <= now).sort((a, b) => byId.get(a.id)! - byId.get(b.id)!);
    const fresh = shuffled.filter((q) => !byId.has(q.id));
    const later = shuffled.filter((q) => (byId.get(q.id) ?? 0) > now).sort((a, b) => byId.get(a.id)! - byId.get(b.id)!);
    ids = [...due, ...fresh, ...later].map((q) => q.id).slice(0, 10);
  }
  if (!access.unlimited) {
    // Heute bereits gesprochene Fragen zählen nicht doppelt
    const seen = ids.filter((id) => access.usedIds.includes(id));
    const fresh = ids.filter((id) => !access.usedIds.includes(id)).slice(0, access.remaining);
    ids = [...fresh, ...seen].slice(0, Math.max(fresh.length, 1));
  }
  if (ids.length === 0) return { ok: false, error: "Keine passenden Fragen gefunden." };

  const session = await prisma.oralSession.create({ data: { userId: user.id, mode, questionIds: ids } });
  redirect(`/muendlich/${session.id}${mode === "pruefung" && timer ? "?timer=1" : ""}`);
}

/** Sitzung abschließen: Gesamtpunkte in Prozent speichern. */
export async function finishOralSessionAction(sessionId: string): Promise<ActionResult<{ percent: number }>> {
  const user = await requireUser();
  const s = await prisma.oralSession.findFirst({ where: { id: z.string().min(1).max(64).parse(sessionId), userId: user.id }, include: { attempts: { orderBy: { createdAt: "asc" } } } });
  if (!s) return { ok: false, error: "Sitzung nicht gefunden." };
  // Pro Frage zählt der letzte Versuch
  const last = new Map<string, number>();
  for (const a of s.attempts) last.set(a.oralQuestionId, a.score);
  const percent = sessionPercent([...last.values()], s.mode === "pruefung" ? s.questionIds.length : Math.max(1, last.size));
  if (!s.finishedAt) await prisma.oralSession.update({ where: { id: s.id }, data: { finishedAt: new Date(), totalScore: percent } });
  return { ok: true, data: { percent } };
}

/** Sitzung verlassen: ohne Antworten wird sie verworfen, sonst abgeschlossen. */
export async function leaveOralSessionAction(sessionId: string): Promise<void> {
  const user = await requireUser();
  const s = await prisma.oralSession.findFirst({ where: { id: z.string().min(1).max(64).parse(sessionId), userId: user.id }, select: { id: true, _count: { select: { attempts: true } } } });
  if (s && s._count.attempts === 0) await prisma.oralSession.delete({ where: { id: s.id } });
  else if (s) await finishOralSessionAction(s.id);
  redirect("/muendlich");
}
