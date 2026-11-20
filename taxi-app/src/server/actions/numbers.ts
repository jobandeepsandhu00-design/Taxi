"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { nextLeitner } from "@/lib/gamification";
import { fillStatement, formatValue, gradeNumberInput } from "@/lib/number-facts";
import { rewardXp } from "@/server/gamification";
import { drillItems, type DrillItem } from "@/server/numbers";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getNumberDrillAction(type: string): Promise<Result<DrillItem[]>> {
  const user = await requireUser();
  const t = z.enum(["auswahl", "eingabe", "blitz"]).safeParse(type);
  if (!t.success) return { ok: false, error: "Unbekannte Übung." };
  return { ok: true, data: await drillItems(user.id, t.data) };
}

const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auswahl"), factId: z.string().min(1).max(64), answer: z.string().max(80) }),
  z.object({ type: z.literal("eingabe"), factId: z.string().min(1).max(64), answer: z.string().max(40), unit: z.string().max(20) }),
  z.object({ type: z.literal("blitz"), factId: z.string().min(1).max(64), shown: z.string().max(80), saysTrue: z.boolean() }),
]);

export interface NumberAnswer {
  correct: boolean;
  display: string;
  statement: string;
  legalReference: string | null;
  verified: boolean;
  box: number;
}

/** Antwort prüfen und Leitner-Fach aktualisieren (gleiche Logik wie bei den Fragen). */
export async function answerNumberAction(input: z.infer<typeof answerSchema>): Promise<Result<NumberAnswer>> {
  const user = await requireUser();
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Antwort." };
  const a = parsed.data;
  const fact = await prisma.numberFact.findUnique({ where: { id: a.factId } });
  if (!fact) return { ok: false, error: "Fakt nicht gefunden." };
  const display = formatValue(fact.value, fact.unit);
  const correct =
    a.type === "auswahl" ? a.answer.trim() === display : a.type === "eingabe" ? gradeNumberInput(fact, a.answer, a.unit) : (a.shown.trim() === display) === a.saysTrue;

  const today = dayKey();
  const prev = await prisma.numberProgress.findUnique({ where: { userId_factId: { userId: user.id, factId: fact.id } } });
  const next = nextLeitner(prev?.box ?? null, correct);
  await prisma.numberProgress.upsert({
    where: { userId_factId: { userId: user.id, factId: fact.id } },
    create: { userId: user.id, factId: fact.id, box: next.box, dueDate: dayKeyToDate(addDays(today, next.days)), timesCorrect: correct ? 1 : 0, timesWrong: correct ? 0 : 1 },
    update: { box: next.box, dueDate: dayKeyToDate(addDays(today, next.days)), lastSeenAt: new Date(), timesCorrect: { increment: correct ? 1 : 0 }, timesWrong: { increment: correct ? 0 : 1 } },
  });
  return { ok: true, data: { correct, display, statement: fillStatement(fact.statement, display), legalReference: fact.legalReference, verified: fact.verified, box: next.box } };
}

/** Abschluss einer Übung: kleine XP-Belohnung. */
export async function finishNumberDrillAction(correct: number): Promise<{ xp: number }> {
  const user = await requireUser();
  const n = Math.max(0, Math.min(60, Math.floor(correct)));
  if (n === 0) return { xp: 0 };
  const r = await rewardXp(user.id, n * 2).catch(() => null);
  return { xp: r?.xpGained ?? 0 };
}
