"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isHelperLang } from "@/lib/languages";
import { coachConfigured, coachErrorMessage } from "@/server/coach/llm";
import { publishedWhere } from "@/server/questions";
import { generateSimple, generateTranslation, streamWhy } from "@/server/variants";
import type { ActionResult } from "./types";

const kindSchema = z.enum(["simple", "translation", "why"]);
const BATCH = 4;

/** Stapel-Job: fehlende Varianten erzeugen (je Aufruf einige Fragen, der Client ruft wiederholt auf). */
export async function generateVariantBatchAction(kind: string, lang: string): Promise<ActionResult<{ generated: number; remaining: number; failed: number }>> {
  await requireAdmin();
  const k = kindSchema.parse(kind);
  const l = k === "simple" ? "de" : lang === "de" ? "de" : isHelperLang(lang) ? lang : null;
  if (!l || (k === "translation" && l === "de")) return { ok: false, error: "Bitte eine Sprache wählen." };
  if (!coachConfigured()) return { ok: false, error: "Die KI ist nicht eingerichtet (ANTHROPIC_API_KEY fehlt)." };
  const missing = { ...publishedWhere, variants: { none: { kind: k, lang: l } } };
  const todo = await prisma.question.findMany({ where: missing, select: { id: true }, orderBy: { createdAt: "asc" }, take: BATCH });
  let generated = 0;
  let failed = 0;
  for (const q of todo) {
    try {
      const ok =
        k === "simple"
          ? await generateSimple(q.id)
          : k === "translation"
            ? await generateTranslation(q.id, l)
            : await (async () => {
                const gen = streamWhy(q.id, l);
                let step = await gen.next();
                while (!step.done) step = await gen.next();
                return step.value;
              })();
      if (ok) generated++;
      else failed++;
    } catch (err) {
      failed++;
      console.error("Varianten-Stapel", q.id, coachErrorMessage(err));
    }
  }
  const remaining = await prisma.question.count({ where: missing });
  revalidatePath("/admin/varianten");
  // Bei lauter Fehlern abbrechen, damit der Client nicht endlos weiterläuft
  if (todo.length > 0 && generated === 0) return { ok: false, error: "Erzeugung fehlgeschlagen – bitte später erneut versuchen." };
  return { ok: true, data: { generated, remaining, failed }, message: `${generated} erzeugt, ${remaining} offen.` };
}

export async function setVariantVerifiedAction(id: string, verified: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.questionVariant.update({ where: { id: z.string().min(1).parse(id) }, data: { verified } });
  if (verified) await prisma.variantFeedback.deleteMany({ where: { variantId: id, rating: -1 } });
  revalidatePath("/admin/varianten");
  return { ok: true, data: undefined, message: verified ? "Als geprüft markiert." : "Prüfung zurückgenommen." };
}

export async function deleteVariantAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.questionVariant.delete({ where: { id: z.string().min(1).parse(id) } });
  revalidatePath("/admin/varianten");
  return { ok: true, data: undefined, message: "Gelöscht – wird bei der nächsten Anfrage neu erzeugt." };
}
