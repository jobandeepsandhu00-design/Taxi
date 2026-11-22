"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { coachConfigured, coachErrorMessage, parseCoach } from "@/server/coach/llm";
import { publishedWhere } from "@/server/questions";
import type { ActionResult } from "./types";

const factSchema = z.object({
  category: z.string().trim().min(2).max(80),
  statement: z.string().trim().min(5).max(400).refine((s) => s.includes("{x}"), "Die Aussage braucht den Platzhalter {x}."),
  value: z.string().trim().min(1).max(40),
  unit: z.string().trim().max(20),
  distractors: z.string().trim().max(200),
  legalReference: z.string().trim().max(255).optional(),
});

export async function createNumberFactAction(input: z.infer<typeof factSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = factSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const distractors = p.data.distractors.split(/[;|]/).map((d) => d.trim()).filter(Boolean).slice(0, 6);
  if (distractors.length < 3) return { ok: false, error: "Bitte mindestens 3 Ablenker angeben (getrennt mit ;)." };
  await prisma.numberFact.create({ data: { ...p.data, legalReference: p.data.legalReference || null, distractors, verified: false } });
  revalidatePath("/admin/zahlen");
  return { ok: true, data: undefined, message: "Fakt angelegt (ungeprüft)." };
}

export async function setNumberFactVerifiedAction(id: string, verified: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.numberFact.update({ where: { id: z.string().min(1).parse(id) }, data: { verified } });
  revalidatePath("/admin/zahlen");
  return { ok: true, data: undefined, message: verified ? "Freigegeben." : "Freigabe zurückgenommen." };
}

export async function deleteNumberFactAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.numberFact.delete({ where: { id: z.string().min(1).parse(id) } });
  revalidatePath("/admin/zahlen");
  return { ok: true, data: undefined, message: "Gelöscht." };
}

const extractSchema = z.object({
  facts: z.array(z.object({ questionId: z.string(), category: z.string(), statement: z.string(), value: z.string(), unit: z.string(), distractors: z.array(z.string()), legalReference: z.string() })),
});

/** Zahlen-Fakten per KI aus vorhandenen Fragen ziehen – landen als „ungeprüft“. */
export async function extractNumberFactsAction(): Promise<ActionResult<{ created: number }>> {
  await requireAdmin();
  if (!coachConfigured()) return { ok: false, error: "KI ist deaktiviert (AI_ENABLED nicht gesetzt) – bitte manuell ausfüllen." };
  const used = await prisma.numberFact.findMany({ where: { sourceQuestionId: { not: null } }, select: { sourceQuestionId: true } });
  const candidates = await prisma.question.findMany({
    where: { ...publishedWhere, id: { notIn: used.map((u) => u.sourceQuestionId!) }, options: { some: { isCorrect: true, text: { contains: "" } } } },
    select: { id: true, text: true, explanation: true, sourceDetail: true, category: { select: { name: true } }, options: { select: { label: true, text: true, isCorrect: true } } },
    take: 60,
  });
  const withNumbers = candidates.filter((q) => /\d/.test(q.options.filter((o) => o.isCorrect).map((o) => o.text).join(" "))).slice(0, 12);
  if (withNumbers.length === 0) return { ok: true, data: { created: 0 }, message: "Keine weiteren Fragen mit Zahlen gefunden." };
  try {
    const out = await parseCoach({
      context: "Aufgabe: Zahlen-Fakten (Werte, Fristen, Abstände, Grenzwerte) aus Prüfungsfragen extrahieren – nur was in Frage, richtiger Antwort und Erklärung steht.",
      prompt: `Extrahiere aus diesen Fragen je höchstens einen Zahlen-Fakt. Aussage mit Platzhalter {x} für den Wert; value nur die Zahl/das Datum, unit die Einheit (z. B. km/h, m, ‰, mm, Tage) oder leer; 3 plausible falsche Werte als distractors (ohne Einheit); legalReference nur aus der Frage übernehmen, sonst leer. Nichts erfinden. Fragen ohne klaren Zahlenwert auslassen.

${withNumbers.map((q) => `[${q.id}] (${q.category.name}) ${q.text}\nRichtig: ${q.options.filter((o) => o.isCorrect).map((o) => o.text).join(" / ")}\nErklärung: ${q.explanation}\nRechtsgrundlage: ${q.sourceDetail ?? ""}`).join("\n\n")}`,
      schema: extractSchema,
      fake: () => ({ facts: [] }),
      maxTokens: 6000,
    });
    let created = 0;
    for (const f of out?.facts ?? []) {
      if (!f.statement.includes("{x}") || !withNumbers.some((q) => q.id === f.questionId)) continue;
      await prisma.numberFact.create({
        data: { category: f.category.slice(0, 80), statement: f.statement, value: f.value.slice(0, 40), unit: f.unit.slice(0, 20), distractors: f.distractors.slice(0, 5), legalReference: f.legalReference || null, sourceQuestionId: f.questionId, verified: false },
      });
      created++;
    }
    revalidatePath("/admin/zahlen");
    return { ok: true, data: { created }, message: `${created} Fakten extrahiert (ungeprüft).` };
  } catch (err) {
    return { ok: false, error: coachErrorMessage(err) };
  }
}
