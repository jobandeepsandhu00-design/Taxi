"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { kickAudioAfterChange } from "@/server/audio/kick";
import { refreshKnowledge } from "@/server/coach/knowledge";
import type { ActionResult } from "./types";

export type ExplanationImportSummary = { dryRun: boolean; updated: number; skipped: number; errors: { row: number; message: string }[] };

/** CSV-Import (Spalten: question_id, explanation_de, mnemonic_de, simple_de). Leere Zellen ändern nichts. */
export async function importExplanationsAction(csv: string, dryRun: boolean): Promise<ActionResult<ExplanationImportSummary>> {
  await requireAdmin();
  if (csv.length > 5_000_000) return { ok: false, error: "Die Datei ist zu groß (max. 5 MB)." };
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  if (!parsed.meta.fields?.includes("question_id")) return { ok: false, error: "Spalte „question_id“ fehlt." };
  const errors: ExplanationImportSummary["errors"] = [];
  const updates: { id: string; data: { explanation?: string; mnemonic?: string; simpleDe?: string } }[] = [];
  let skipped = 0;
  const ids = parsed.data.map((r) => (r.question_id ?? "").trim()).filter(Boolean);
  const existing = new Set((await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((q) => q.id));
  parsed.data.forEach((r, i) => {
    const row = i + 2;
    const id = (r.question_id ?? "").trim();
    if (!id) return errors.push({ row, message: "question_id fehlt" });
    if (!existing.has(id)) return errors.push({ row, message: `Frage „${id}“ nicht gefunden` });
    const data: { explanation?: string; mnemonic?: string; simpleDe?: string } = {};
    const e = (r.explanation_de ?? "").trim();
    const m = (r.mnemonic_de ?? "").trim();
    const sDe = (r.simple_de ?? "").trim();
    if (e) data.explanation = e.slice(0, 8000);
    if (m) data.mnemonic = m.slice(0, 1000);
    if (sDe) data.simpleDe = sDe.slice(0, 4000);
    if (Object.keys(data).length === 0) return void skipped++;
    updates.push({ id, data });
  });
  if (!dryRun && updates.length) {
    await prisma.$transaction(updates.map((u) => prisma.question.update({ where: { id: u.id }, data: u.data })));
    const explained = updates.filter((u) => u.data.explanation).map((u) => u.id);
    if (explained.length) await prisma.missingExplanation.deleteMany({ where: { questionId: { in: explained } } });
    await refreshKnowledge();
    void kickAudioAfterChange();
    revalidatePath("/admin/erklaerungen");
  }
  return { ok: true, data: { dryRun, updated: updates.length, skipped, errors } };
}
