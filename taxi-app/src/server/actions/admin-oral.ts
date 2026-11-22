"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { coachConfigured, coachErrorMessage, parseCoach } from "@/server/coach/llm";
import { publishedWhere } from "@/server/questions";
import type { ActionResult } from "./types";

const formSchema = z.object({
  id: z.string().max(64).optional(),
  categoryId: z.string().min(1, "Bitte eine Kategorie wählen.").max(64),
  questionDe: z.string().trim().min(8, "Die Frage ist zu kurz.").max(600),
  modelAnswerDe: z.string().trim().min(20, "Die Musterantwort ist zu kurz.").max(3000),
  /** Ein Kernpunkt pro Zeile, „!“ am Anfang = Pflicht */
  keyPoints: z.string().trim().min(3).max(3000),
  legalReference: z.string().trim().max(255).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  followUpQuestion: z.string().trim().max(500).optional(),
  followUpPoint: z.coerce.number().int().min(1).max(10).optional(),
  examMode: z.enum(["", "TAXILENKER", "KONZESSION"]).optional(),
});

export type OralForm = z.input<typeof formSchema>;

function parsePoints(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((l, i) => ({ id: `k${i + 1}`, text: l.replace(/^!\s*/, "").slice(0, 300), required: l.startsWith("!") }));
}

export async function saveOralQuestionAction(input: OralForm): Promise<ActionResult> {
  await requireAdmin();
  const p = formSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const d = p.data;
  const keyPoints = parsePoints(d.keyPoints);
  if (keyPoints.length < 2) return { ok: false, error: "Bitte mindestens 2 Kernpunkte angeben (einer pro Zeile)." };
  if (!keyPoints.some((k) => k.required)) return { ok: false, error: "Mindestens ein Kernpunkt muss Pflicht sein (Zeile mit ! beginnen)." };
  const trigger = keyPoints[(d.followUpPoint ?? 1) - 1] ?? keyPoints.find((k) => k.required)!;
  const followUps = d.followUpQuestion ? [{ trigger_point_id: trigger.id, question_de: d.followUpQuestion }] : [];
  const data = {
    categoryId: d.categoryId,
    questionDe: d.questionDe,
    modelAnswerDe: d.modelAnswerDe,
    keyPoints,
    followUps,
    legalReference: d.legalReference || null,
    difficulty: d.difficulty,
    examMode: d.examMode ? d.examMode : null,
  };
  // Jede inhaltliche Änderung setzt die Freigabe zurück
  if (d.id) await prisma.oralQuestion.update({ where: { id: d.id }, data: { ...data, verified: false } });
  else await prisma.oralQuestion.create({ data: { ...data, verified: false } });
  revalidatePath("/admin/muendlich");
  return { ok: true, data: undefined, message: d.id ? "Gespeichert (wieder ungeprüft)." : "Frage angelegt (ungeprüft)." };
}

export async function setOralVerifiedAction(id: string, verified: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.oralQuestion.update({ where: { id: z.string().min(1).parse(id) }, data: { verified, catalogVersion: verified ? new Date().toISOString().slice(0, 7) : undefined } });
  revalidatePath("/admin/muendlich");
  return { ok: true, data: undefined, message: verified ? "Freigegeben." : "Freigabe zurückgenommen." };
}

export async function deleteOralQuestionAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.oralQuestion.delete({ where: { id: z.string().min(1).parse(id) } });
  revalidatePath("/admin/muendlich");
  return { ok: true, data: undefined, message: "Gelöscht." };
}

const suggestSchema = z.object({
  model_answer_de: z.string(),
  key_points: z.array(z.object({ text: z.string(), required: z.boolean() })),
  legal_reference: z.string(),
  follow_up_question_de: z.string(),
  follow_up_point_index: z.number(),
  source_question_ids: z.array(z.string()),
});

/** KI-Entwurf: Musterantwort und Kernpunkte aus den schriftlichen Fragen derselben Kategorie ableiten. */
export async function suggestOralAnswerAction(input: { categoryId: string; questionDe: string }): Promise<ActionResult<{ modelAnswerDe: string; keyPoints: string; legalReference: string; followUpQuestion: string; followUpPoint: number }>> {
  await requireAdmin();
  const p = z.object({ categoryId: z.string().min(1).max(64), questionDe: z.string().trim().min(8).max(600) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Bitte zuerst Kategorie und Frage eingeben." };
  const written = await prisma.question.findMany({
    where: { ...publishedWhere, categoryId: p.data.categoryId },
    select: { id: true, text: true, explanation: true, sourceDetail: true, options: { where: { isCorrect: true }, select: { text: true } } },
    take: 40,
  });
  if (written.length === 0) return { ok: false, error: "In dieser Kategorie gibt es keine veröffentlichten schriftlichen Fragen als Grundlage." };
  const words = p.data.questionDe.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  const ranked = written
    .map((q) => ({ q, hits: words.filter((w) => `${q.text} ${q.explanation}`.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10)
    .map((r) => r.q);
  // Ohne KI: Entwurf direkt aus der passendsten Skript-Frage (Antwort → Musterantwort, Sätze → Kernpunkte)
  if (!coachConfigured()) {
    const best = ranked[0];
    const answer = best.options.map((o) => o.text).join("\n");
    const parts = answer
      .split(/\n+|(?<=[.;])\s+/)
      .map((x) => x.replace(/^[-•\d.)\s]+/, "").trim())
      .filter((x) => x.length > 2)
      .slice(0, 5);
    return {
      ok: true,
      data: {
        modelAnswerDe: answer,
        keyPoints: (parts.length >= 2 ? parts : [answer, "Begründung"]).map((t, i) => `${i < 2 ? "! " : ""}${t}`).join("\n"),
        legalReference: best.sourceDetail ?? "",
        followUpQuestion: "",
        followUpPoint: 1,
      },
      message: `Entwurf aus dem Skript eingefügt („${best.text.slice(0, 60)}“) – bitte prüfen und speichern (bleibt ungeprüft).`,
    };
  }
  try {
    const out = await parseCoach({
      context: "Aufgabe: Für die mündliche Taxi-Prüfung in Wien eine Musterantwort mit Kernpunkten entwerfen – ausschließlich auf Basis der schriftlichen Referenzfragen unten. Nichts erfinden.",
      prompt: `Mündliche Frage: „${p.data.questionDe}“

Referenz (schriftliche Fragen mit richtiger Antwort und Erklärung):
${ranked.map((q) => `[${q.id}] ${q.text}\nRichtig: ${q.options.map((o) => o.text).join(" / ")}\nErklärung: ${q.explanation}${q.sourceDetail ? `\nRechtsgrundlage: ${q.sourceDetail}` : ""}`).join("\n\n")}

Liefere: model_answer_de (3–5 Sätze, wie eine gute mündliche Antwort, Sie-Form neutral), key_points (3–5, kurz, die wichtigsten als required=true), legal_reference (nur wenn wörtlich in der Referenz, sonst leer), follow_up_question_de (Nachfrage zum wichtigsten Pflichtpunkt, ohne die Lösung zu verraten), follow_up_point_index (1-basiert), source_question_ids (verwendete Referenzen). Wenn die Referenz die Frage nicht abdeckt: model_answer_de leer lassen.`,
      schema: suggestSchema,
      fake: () => ({
        model_answer_de: `Entwurf auf Basis von: ${ranked[0].text} – ${ranked[0].options.map((o) => o.text).join(" / ")}.`,
        key_points: [
          { text: ranked[0].options[0]?.text ?? "Kernaussage", required: true },
          { text: "Begründung laut Erklärung", required: false },
          { text: "Praktische Folge für Taxilenker", required: false },
        ],
        legal_reference: ranked[0].sourceDetail ?? "",
        follow_up_question_de: "Können Sie das genauer erklären?",
        follow_up_point_index: 1,
        source_question_ids: [ranked[0].id],
      }),
      maxTokens: 3000,
    });
    if (!out || !out.model_answer_de.trim()) return { ok: false, error: "Die Referenzfragen decken diese Frage nicht ab – bitte selbst formulieren." };
    return {
      ok: true,
      data: {
        modelAnswerDe: out.model_answer_de,
        keyPoints: out.key_points.slice(0, 5).map((k) => `${k.required ? "! " : ""}${k.text}`).join("\n"),
        legalReference: out.legal_reference,
        followUpQuestion: out.follow_up_question_de,
        followUpPoint: Math.max(1, Math.min(5, Math.round(out.follow_up_point_index || 1))),
      },
      message: "KI-Entwurf eingefügt – bitte prüfen und speichern (bleibt ungeprüft).",
    };
  } catch (err) {
    return { ok: false, error: coachErrorMessage(err) };
  }
}
