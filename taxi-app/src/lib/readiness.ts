/**
 * Prüfungsreife-Score (0–100), transparent und unit-getestet:
 *   Abdeckung 25 % · Beherrschung 35 % · Trefferquote 25 % · Prüfungen 15 %
 *   Liegt eine Kategorie unter 50 %, wird der Gesamtwert bei 69 gedeckelt.
 */

export const READINESS_WEIGHTS = { coverage: 0.25, mastery: 0.35, accuracy: 0.25, exam: 0.15 } as const;
export const CATEGORY_MIN = 50;
export const CAP_SCORE = 69;
export const READY_SCORE = 85;

export type ReadinessLevel = "niedrig" | "mittel" | "hoch" | "bereit";

export interface CategoryReadinessInput {
  id: string;
  name: string;
  slug: string;
  total: number;
  seen: number;
  mastered: number;
  answered: number;
  correct: number;
}

export interface ReadinessInputV2 {
  totalQuestions: number;
  /** mind. einmal gesehen */
  seen: number;
  /** Leitner-Fach ≥ 4 */
  mastered: number;
  /** richtige unter den letzten (max. 100) Antworten */
  recentCorrect: number;
  recentTotal: number;
  /** Prozentwerte der letzten Simulationen (neueste zuerst) */
  examScores: number[];
  categories: CategoryReadinessInput[];
}

export interface ReadinessResult {
  score: number;
  level: ReadinessLevel;
  label: string;
  factors: { coverage: number; mastery: number; accuracy: number; exam: number };
  capped: boolean;
  categories: { id: string; name: string; slug: string; score: number }[];
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function levelFor(score: number): { level: ReadinessLevel; label: string } {
  if (score >= READY_SCORE) return { level: "bereit", label: "Prüfungsbereit" };
  if (score >= 70) return { level: "hoch", label: "Fast bereit" };
  if (score >= 40) return { level: "mittel", label: "Auf gutem Weg" };
  return { level: "niedrig", label: "Noch am Anfang" };
}

/** Kategorie-Wert (0–100): wie der Gesamtwert, aber ohne Prüfungsanteil (neu normiert). */
export function categoryScore(c: CategoryReadinessInput): number {
  if (c.total === 0) return 100;
  const cov = clamp(c.seen / c.total);
  const mas = clamp(c.mastered / c.total);
  const acc = c.answered ? clamp(c.correct / c.answered) : 0;
  const w = READINESS_WEIGHTS;
  return Math.round(((cov * w.coverage + mas * w.mastery + acc * w.accuracy) / (w.coverage + w.mastery + w.accuracy)) * 100);
}

export function computeReadinessV2(i: ReadinessInputV2): ReadinessResult {
  const factors = {
    coverage: i.totalQuestions ? clamp(i.seen / i.totalQuestions) : 0,
    mastery: i.totalQuestions ? clamp(i.mastered / i.totalQuestions) : 0,
    accuracy: i.recentTotal ? clamp(i.recentCorrect / i.recentTotal) : 0,
    exam: i.examScores.length ? clamp(i.examScores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, i.examScores.length) / 100) : 0,
  };
  const w = READINESS_WEIGHTS;
  let score = Math.round((factors.coverage * w.coverage + factors.mastery * w.mastery + factors.accuracy * w.accuracy + factors.exam * w.exam) * 100);
  const categories = i.categories.filter((c) => c.total > 0).map((c) => ({ id: c.id, name: c.name, slug: c.slug, score: categoryScore(c) }));
  const capped = score > CAP_SCORE && categories.some((c) => c.score < CATEGORY_MIN);
  if (capped) score = CAP_SCORE;
  return { score, ...levelFor(score), factors, capped, categories: categories.sort((a, b) => a.score - b.score) };
}

/**
 * Lineare Hochrechnung des Trends: Datum, an dem der Score 85 erreicht.
 * Nur mit ≥ 5 Tagen Daten; null, wenn kein Anstieg erkennbar.
 */
export function projectReadyDate(points: { day: string; score: number }[], today: string): { date: string | null; enoughData: boolean; slopePerDay: number } {
  const pts = [...points].sort((a, b) => a.day.localeCompare(b.day));
  if (pts.length < 5) return { date: null, enoughData: false, slopePerDay: 0 };
  const t0 = Date.parse(`${pts[0].day}T00:00:00Z`);
  const xs = pts.map((p) => (Date.parse(`${p.day}T00:00:00Z`) - t0) / 86_400_000);
  const ys = pts.map((p) => p.score);
  const n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxx ? xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0) / sxx : 0;
  const last = ys[n - 1];
  if (last >= READY_SCORE) return { date: today, enoughData: true, slopePerDay: slope };
  if (slope <= 0.05) return { date: null, enoughData: true, slopePerDay: slope };
  const intercept = my - slope * mx;
  const xReady = (READY_SCORE - intercept) / slope;
  const todayX = (Date.parse(`${today}T00:00:00Z`) - t0) / 86_400_000;
  const days = Math.max(1, Math.ceil(xReady - todayX));
  if (days > 365) return { date: null, enoughData: true, slopePerDay: slope };
  const d = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000);
  return { date: d.toISOString().slice(0, 10), enoughData: true, slopePerDay: slope };
}
