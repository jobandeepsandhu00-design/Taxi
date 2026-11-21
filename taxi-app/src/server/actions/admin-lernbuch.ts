"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { coachConfigured, coachErrorMessage, parseCoach } from "@/server/coach/llm";
import type { ActionResult } from "./types";

const outSchema = z.object({ items: z.array(z.object({ id: z.string(), mnemonic: z.string() })) });

/** KI: fehlende Merkhilfen eines Kapitels ergänzen (max. 15 pro Durchlauf, nur aus der Skript-Antwort). */
export async function fillMissingMnemonicsAction(categoryId: string): Promise<ActionResult<{ filled: number; remaining: number }>> {
  await requireAdmin();
  const cid = z.string().min(1).max(64).parse(categoryId);
  if (!coachConfigured()) return { ok: false, error: "Die KI ist noch nicht eingerichtet." };
  const qs = await prisma.question.findMany({
    where: { categoryId: cid, status: "PUBLISHED", mnemonic: null },
    select: { id: true, text: true, options: { where: { isCorrect: true }, select: { text: true } } },
    take: 15,
  });
  if (qs.length === 0) return { ok: true, data: { filled: 0, remaining: 0 } };
  try {
    const out = await parseCoach({
      context: qs.map((q) => `ID: ${q.id}\nF: ${q.text}\nA: ${q.options.map((o) => o.text).join(" / ")}`).join("\n\n"),
      prompt: "Schreibe für jede Frage eine kurze Merkhilfe (max. 20 Wörter, Eselsbrücke oder Schlüsselwort), nur aus der Antwort abgeleitet – keine neuen Fakten oder Zahlen. Gib items mit id und mnemonic zurück.",
      schema: outSchema,
      fake: () => ({ items: qs.map((q) => ({ id: q.id, mnemonic: `Merke: ${q.options[0]?.text.split(/[.,;]/)[0].slice(0, 60) ?? q.text.slice(0, 40)}` })) }),
      maxTokens: 3000,
    });
    if (!out) return { ok: false, error: "Die KI hat keine Merkhilfen geliefert." };
    const ids = new Set(qs.map((q) => q.id));
    let filled = 0;
    for (const it of out.items) {
      if (!ids.has(it.id) || !it.mnemonic.trim()) continue;
      await prisma.question.update({ where: { id: it.id }, data: { mnemonic: it.mnemonic.trim().slice(0, 300) } });
      filled++;
    }
    const remaining = await prisma.question.count({ where: { categoryId: cid, status: "PUBLISHED", mnemonic: null } });
    return { ok: true, data: { filled, remaining } };
  } catch (err) {
    return { ok: false, error: coachErrorMessage(err) };
  }
}
