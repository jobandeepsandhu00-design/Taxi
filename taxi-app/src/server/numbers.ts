import "server-only";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { choicesFor, fillStatement, formatValue, isNumericFact, shuffleWith } from "@/lib/number-facts";

export type DrillType = "auswahl" | "eingabe" | "blitz";

export interface DrillItem {
  id: string;
  category: string;
  statement: string;
  verified: boolean;
  /** auswahl: 4 Werte (inkl. Einheit) */
  choices?: string[];
  /** eingabe: mögliche Einheiten */
  units?: string[];
  /** blitz: gezeigter Wert (richtig oder Ablenker) und fertige Aussage */
  shown?: string;
  claim?: string;
}

/** Fakten für eine Übung: fällige zuerst, dann neue, dann der Rest. */
export async function drillItems(userId: string, type: DrillType): Promise<DrillItem[]> {
  const today = dayKeyToDate(dayKey());
  const [facts, progress] = await Promise.all([
    prisma.numberFact.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
    prisma.numberProgress.findMany({ where: { userId }, select: { factId: true, dueDate: true, box: true } }),
  ]);
  const pMap = new Map(progress.map((p) => [p.factId, p]));
  const pool = type === "eingabe" ? facts.filter((f) => isNumericFact(f.value) && f.unit) : facts;
  const due = shuffleWith(pool.filter((f) => pMap.get(f.id) && pMap.get(f.id)!.dueDate <= today));
  const fresh = shuffleWith(pool.filter((f) => !pMap.get(f.id)));
  const rest = shuffleWith(pool.filter((f) => pMap.get(f.id) && pMap.get(f.id)!.dueDate > today));
  const ordered = [...due, ...fresh, ...rest];
  const units = Array.from(new Set(facts.map((f) => f.unit).filter(Boolean)));
  const take = type === "blitz" ? 40 : 10;
  return ordered.slice(0, take).map((f) => {
    const base = { id: f.id, category: f.category, statement: f.statement, verified: f.verified };
    if (type === "auswahl") return { ...base, choices: choicesFor(f).map((v) => formatValue(v, f.unit)) };
    if (type === "eingabe") return { ...base, units: shuffleWith(Array.from(new Set([f.unit, ...units])).slice(0, 6)) };
    const truthful = Math.random() < 0.5 || f.distractors.length === 0;
    const shownVal = truthful ? f.value : f.distractors[Math.floor(Math.random() * f.distractors.length)];
    const shown = formatValue(shownVal, f.unit);
    return { ...base, shown, claim: fillStatement(f.statement, shown) };
  });
}

/** Spickzettel: geprüfte Fakten, die die Person schon mindestens einmal geübt hat. */
export async function cheatSheet(userId: string) {
  const [facts, progress] = await Promise.all([
    prisma.numberFact.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
    prisma.numberProgress.findMany({ where: { userId }, select: { factId: true, box: true } }),
  ]);
  const pMap = new Map(progress.map((p) => [p.factId, p.box]));
  const verified = facts.filter((f) => f.verified);
  const shown = verified.filter((f) => pMap.has(f.id));
  const groups = new Map<string, { id: string; text: string; legalReference: string | null; mastered: boolean }[]>();
  for (const f of shown) {
    const list = groups.get(f.category) ?? [];
    list.push({ id: f.id, text: fillStatement(f.statement, formatValue(f.value, f.unit)), legalReference: f.legalReference, mastered: (pMap.get(f.id) ?? 0) >= 5 });
    groups.set(f.category, list);
  }
  return {
    groups: [...groups.entries()].map(([category, items]) => ({ category, items })),
    hiddenUnpracticed: verified.length - shown.length,
    unverified: facts.length - verified.length,
  };
}

export async function numberStats(userId: string) {
  const today = dayKeyToDate(dayKey());
  const [total, progress] = await Promise.all([prisma.numberFact.count(), prisma.numberProgress.findMany({ where: { userId }, select: { box: true, dueDate: true } })]);
  return { total, practiced: progress.length, mastered: progress.filter((p) => p.box >= 5).length, due: progress.filter((p) => p.dueDate <= today).length };
}
