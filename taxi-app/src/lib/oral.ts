/** Mündliche Prüfung – gemeinsame Typen und reine Logik (Client + Server, ohne DB). */

/** keywords: Stichwörter/Synonyme (optional) – ohne Angabe werden markante Wörter aus dem Text verwendet */
export type KeyPoint = { id: string; text: string; required: boolean; keywords?: string[] };
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
    .map((p, i) => ({
      id: String(p.id ?? `k${i + 1}`),
      text: String(p.text ?? ""),
      required: Boolean(p.required),
      ...(Array.isArray(p.keywords) ? { keywords: p.keywords.map(String).filter((k) => k.trim()) } : {}),
    }))
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

/* ───────────── Bewertung ohne KI ───────────── */

/** Kleinschreibung, Umlaute/ß vereinheitlichen, Satzzeichen entfernen. */
export function normalizeDe(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9€%,. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SUFFIXES = ["ungen", "heiten", "keiten", "ung", "heit", "keit", "lich", "isch", "ern", "em", "en", "er", "es", "e", "s", "n"];

/** Sehr einfacher deutscher Stemmer (Suffixe abschneiden, Stamm ≥ 4 Zeichen). */
export function stemDe(word: string): string {
  let w = normalizeDe(word).replace(/[^a-z0-9]/g, "");
  for (let round = 0; round < 2; round++) {
    const suf = SUFFIXES.find((x) => w.endsWith(x) && w.length - x.length >= 4);
    if (!suf) break;
    w = w.slice(0, -suf.length);
  }
  return w;
}

const STOP_DE = new Set(["oder", "sowie", "werden", "wird", "wenn", "sind", "nicht", "eine", "einen", "einem", "einer", "eines", "dass", "auch", "bzw", "uber", "beim", "nach", "mindestens", "muss", "mussen", "kann", "konnen", "durch", "unter", "diese", "dieser", "dieses", "haben", "hat", "sein", "zum", "zur", "fur", "mit", "und", "der", "die", "das", "den", "dem", "des", "von", "bei", "aus", "ist"]);

/** kurze Füllwörter (3 Buchstaben); andere 3er-Wörter wie „AfA“, „KFZ“ zählen */
const STOP3 = new Set(["der", "die", "das", "und", "ist", "ein", "mit", "von", "bei", "aus", "zum", "zur", "fur", "den", "dem", "des", "wer", "was", "wie", "man", "auf", "als", "nur", "sie", "ihr", "wir", "ich", "hat", "bis", "pro", "vor", "uns", "ihn", "dir", "mir", "gut", "neu", "alt", "ja", "nein", "nie", "oft", "eur"]);

function stemsOf(s: string): string[] {
  return normalizeDe(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => (w.length >= 4 || (w.length === 3 && !STOP3.has(w))) && !STOP_DE.has(w))
    .map(stemDe);
}

function stemMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Präfix oder Teil eines zusammengesetzten Worts (Höchstarbeitszeit ↔ Arbeitszeit)
  if ((b.length >= 4 && a.startsWith(b)) || (a.length >= 4 && b.startsWith(a))) return true;
  if (a.length >= 5 && b.length >= 5) return a.includes(b) || b.includes(a);
  return false;
}

/** Ist der Kernpunkt im Text genannt? Stichwörter (eins reicht) oder ≥ 40 % der markanten Wörter. */
export function pointCovered(point: KeyPoint, said: string[], rawTranscript: string): boolean {
  const has = (stem: string) => said.some((w) => stemMatch(w, stem));
  if (point.keywords?.length) {
    return point.keywords.some((k) => {
      const ks = stemsOf(k);
      if (ks.length === 0) return normalizeDe(rawTranscript).replace(/\s/g, "").includes(normalizeDe(k).replace(/\s/g, ""));
      return ks.every(has); // Mehrwort-Stichwort: alle Teile
    });
  }
  const ws = Array.from(new Set(stemsOf(point.text)));
  if (ws.length === 0) return normalizeDe(rawTranscript).replace(/\s/g, "").includes(normalizeDe(point.text).replace(/\s/g, ""));
  const hits = ws.filter(has).length;
  return hits >= Math.max(1, Math.ceil(ws.length * 0.4));
}

/** Abgedeckte Kernpunkte (ohne KI). */
export function ruleCoverage(points: KeyPoint[], transcript: string): string[] {
  const said = stemsOf(transcript);
  return points.filter((p) => pointCovered(p, said, transcript)).map((p) => p.id);
}

const FEEDBACK: Record<OralVerdict, string[]> = {
  richtig: ["Sehr gut – du hast alle wichtigen Punkte genannt.", "Stark! Alle Kernpunkte sind drin.", "Perfekt erklärt – so kannst du das in der Prüfung sagen."],
  teilweise: ["Guter Anfang! Es fehlt noch: {missing}.", "Schon einiges richtig – ergänze noch: {missing}.", "Fast! Denk auch an: {missing}."],
  falsch: ["Da fehlen noch die wichtigsten Punkte: {missing}. Hör dir die Musterantwort an und sprich sie nach.", "Das passt noch nicht ganz. Wichtig sind: {missing}.", "Noch nicht – lies die Musterantwort und probier’s gleich nochmal. Wichtig: {missing}."],
};

/** Bewertung nach festen Regeln: Abdeckung → Punkte, Urteil, Feedback-Text und ggf. Nachfrage. */
export function gradeByRules(points: KeyPoint[], followUps: FollowUp[], transcript: string, seed = 0) {
  const covered = ruleCoverage(points, transcript);
  const verdict = verdictFor(points, covered);
  const score = clampScore(coverageScore(points, covered), verdict);
  const missing = points.filter((p) => !covered.includes(p.id));
  const missingText = (missing.filter((p) => p.required).length ? missing.filter((p) => p.required) : missing)
    .slice(0, 3)
    .map((p) => p.text.replace(/[.\s]+$/, ""))
    .join("; ");
  const list = FEEDBACK[verdict];
  const feedbackDe = list[Math.abs(seed) % list.length].replace("{missing}", missingText || "–");
  return { coveredPointIds: covered, missingPointIds: missing.map((p) => p.id), score, verdict, feedbackDe, followUpQuestion: pickFollowUp(points, covered, followUps) };
}
