/** Mündliche Prüfung – gemeinsame Typen und reine Logik (Client + Server, ohne DB). */

export type KeyPoint = { id: string; text: string; required: boolean };
export type FollowUp = { trigger_point_id: string; question_de: string };
export type OralVerdict = "richtig" | "teilweise" | "falsch";
export type OralMode = "ueben" | "pruefung";

export const ORAL_FREE_DAILY = 3;
export const ORAL_MAX_SECONDS = 90;
export const ORAL_MAX_BYTES = 5 * 1024 * 1024;
export const ORAL_EXAM_SECONDS = 60;
export const ORAL_EXAM_QUESTIONS = 10;
export const ORAL_PASS_PERCENT = 70;
export const ORAL_AUDIO_RETENTION_DAYS = 30;

export function parseKeyPoints(raw: unknown): KeyPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p, i) => ({ id: String(p.id ?? `k${i + 1}`), text: String(p.text ?? ""), required: Boolean(p.required) }))
    .filter((p) => p.text.trim().length > 0);
}

export function parseFollowUps(raw: unknown): FollowUp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({ trigger_point_id: String(p.trigger_point_id ?? ""), question_de: String(p.question_de ?? "") }))
    .filter((p) => p.question_de.trim().length > 0);
}

/**
 * Urteil nach festen Regeln: richtig = alle Pflichtpunkte, teilweise = manche,
 * falsch = keine bzw. falsche Aussagen ohne Pflichtpunkte.
 */
export function verdictFor(points: KeyPoint[], covered: string[], wrongStatements = 0): OralVerdict {
  const set = new Set(covered);
  const required = points.filter((p) => p.required);
  const req = required.length > 0 ? required : points;
  const reqCovered = req.filter((p) => set.has(p.id)).length;
  const anyCovered = points.some((p) => set.has(p.id));
  if (!anyCovered) return "falsch";
  if (reqCovered === req.length && wrongStatements === 0) return "richtig";
  return "teilweise";
}

/** Punktezahl 0–10 an das Urteil anpassen, damit Anzeige und Urteil nie widersprüchlich sind. */
export function clampScore(score: number, verdict: OralVerdict): number {
  const s = Math.round(Number.isFinite(score) ? score : 0);
  if (verdict === "richtig") return Math.min(10, Math.max(7, s));
  if (verdict === "falsch") return Math.min(3, Math.max(0, s));
  return Math.min(8, Math.max(3, s));
}

/** Ausgangswert aus der Abdeckung: Pflichtpunkte zählen doppelt. */
export function coverageScore(points: KeyPoint[], covered: string[]): number {
  const set = new Set(covered);
  const total = points.reduce((s, p) => s + (p.required ? 2 : 1), 0);
  if (total === 0) return 0;
  const got = points.reduce((s, p) => s + (set.has(p.id) ? (p.required ? 2 : 1) : 0), 0);
  return Math.round((got / total) * 10);
}

/** Pflichtpunkte, die noch fehlen. */
export function missingRequired(points: KeyPoint[], covered: string[]): KeyPoint[] {
  const set = new Set(covered);
  return points.filter((p) => p.required && !set.has(p.id));
}

/** Passende Nachfrage für den ersten fehlenden Pflichtpunkt. */
export function pickFollowUp(points: KeyPoint[], covered: string[], followUps: FollowUp[]): string | null {
  const missing = missingRequired(points, covered);
  if (missing.length === 0) return null;
  for (const m of missing) {
    const f = followUps.find((x) => x.trigger_point_id === m.id);
    if (f) return f.question_de;
  }
  return followUps[0]?.question_de ?? null;
}

const STOP = new Set(["oder", "sowie", "werden", "wenn", "sind", "nicht", "eine", "einen", "einem", "einer", "dass", "auch", "bzw", "über", "beim", "nach", "mindestens"]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9ß]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

/** Testmodus-Bewertung ohne KI: Kernpunkt gilt als genannt, wenn ein markantes Wort (Stamm) vorkommt. */
export function fakeCoverage(points: KeyPoint[], transcript: string): string[] {
  const said = words(transcript);
  const norm = (x: string) => x.toLowerCase().replace(/\s+/g, "");
  return points
    .filter((p) =>
      // Sehr kurze Punkte ohne längere Wörter (z. B. „2€“): direkter Textvergleich
      (words(p.text).length === 0 && norm(transcript).includes(norm(p.text))) ||
      words(p.text).some((w) => {
        const stem = w.slice(0, Math.max(4, Math.min(6, w.length - 1)));
        return said.some((s) => s.startsWith(stem) || (s.length >= 5 && w.startsWith(s.slice(0, 5))));
      }),
    )
    .map((p) => p.id);
}

/** Prüfungsmodus: Fragen nach Kategorie gewichtet und gut gemischt auswählen. */
export function pickWeighted<T extends { id: string; categoryId: string }>(items: T[], n: number, rand: () => number = Math.random): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) groups.set(it.categoryId, [...(groups.get(it.categoryId) ?? []), it]);
  for (const g of groups.values()) g.sort(() => rand() - 0.5);
  const out: T[] = [];
  while (out.length < n && groups.size > 0) {
    // Gewicht ~ Wurzel der Fragenanzahl: große Kategorien öfter, kleine trotzdem vertreten
    const entries = [...groups.entries()];
    const weights = entries.map(([, g]) => Math.sqrt(g.length));
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (idx < entries.length - 1 && r >= weights[idx]) r -= weights[idx++];
    const [key, g] = entries[idx];
    out.push(g.shift()!);
    if (g.length === 0) groups.delete(key);
  }
  return out;
}

/** Gesamtergebnis in Prozent (Durchschnitt der 0–10-Punkte). */
export function sessionPercent(scores: number[], total: number): number {
  if (total <= 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / (total * 10)) * 100);
}

export function verdictLabel(v: OralVerdict): string {
  return v === "richtig" ? "Richtig" : v === "teilweise" ? "Teilweise richtig" : "Falsch";
}
